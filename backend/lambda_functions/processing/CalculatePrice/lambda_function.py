import json
import boto3
import os
import zipfile
import io
import urllib.parse
import xml.etree.ElementTree as ET # Import XML parser
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation # Import InvalidOperation for error handling
from datetime import datetime, timezone

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# --- Configuration (Read from Environment Variables) ---
JOBS_TABLE_NAME = os.environ.get('JOBS_TABLE_NAME')
BASE_FILAMENT_COST_PER_GRAM_STR = os.environ.get('BASE_FILAMENT_COST_PER_GRAM', '2.5') # Default 2.5 RSD/gram
FILAMENT_MARKUP_MULTIPLIER_STR = os.environ.get('FILAMENT_MARKUP_MULTIPLIER', '3')   # Default x3 markup
COST_PER_MINUTE_STR = os.environ.get('COST_PER_MINUTE', '1')                 # Default 1 RSD/minute

# Ensure table name is provided
if not JOBS_TABLE_NAME:
    raise ValueError("Environment variable JOBS_TABLE_NAME is required.")

# Convert price strings to Decimal, with error handling and defaults
try:
    BASE_FILAMENT_COST_PER_GRAM = Decimal(BASE_FILAMENT_COST_PER_GRAM_STR)
except InvalidOperation:
    print(f"Warning: Invalid BASE_FILAMENT_COST_PER_GRAM value '{BASE_FILAMENT_COST_PER_GRAM_STR}'. Using default 2.5.")
    BASE_FILAMENT_COST_PER_GRAM = Decimal('2.5')

try:
    FILAMENT_MARKUP_MULTIPLIER = Decimal(FILAMENT_MARKUP_MULTIPLIER_STR)
except InvalidOperation:
    print(f"Warning: Invalid FILAMENT_MARKUP_MULTIPLIER value '{FILAMENT_MARKUP_MULTIPLIER_STR}'. Using default 3.")
    FILAMENT_MARKUP_MULTIPLIER = Decimal('3')

try:
    COST_PER_MINUTE = Decimal(COST_PER_MINUTE_STR)
except InvalidOperation:
    print(f"Warning: Invalid COST_PER_MINUTE value '{COST_PER_MINUTE_STR}'. Using default 1.")
    COST_PER_MINUTE = Decimal('1')


# Calculated cost per gram after markup
MARKED_UP_FILAMENT_COST_PER_GRAM = BASE_FILAMENT_COST_PER_GRAM * FILAMENT_MARKUP_MULTIPLIER

jobs_table = dynamodb.Table(JOBS_TABLE_NAME)

def find_metadata_value(root, key_name):
    """ Helper function to find a metadata value in the XML """
    for metadata in root.findall('.//metadata'):
        if metadata.get('key') == key_name:
            return metadata.get('value')
    return None # Return None if key not found

def lambda_handler(event, context):
    """
    Handles S3 event for a newly created .3mf file in the processed bucket.
    Downloads the file, extracts metadata from slice_info.config (XML),
    calculates price based on environment variables, and updates DynamoDB.
    """
    print("Received S3 event:", json.dumps(event, indent=2))

    job_id = None # Initialize jobId for error handling

    try:
        # 1. Extract file info from S3 event
        record = event['Records'][0]
        bucket_name = record['s3']['bucket']['name']
        object_key = urllib.parse.unquote_plus(record['s3']['object']['key'], encoding='utf-8') # e.g., jobs/jobId/filename.3mf

        print(f"Processing object {object_key} from bucket {bucket_name}")

        key_parts = object_key.split('/')
        if len(key_parts) < 3 or key_parts[0] != 'jobs':
            print(f"Object key {object_key} does not match 'jobs/jobId/fileName'. Skipping.")
            return {'statusCode': 200, 'body': 'Object key format not applicable.'}
        job_id = key_parts[1]
        # Extract the base name of the .3mf file (e.g., "test" from "jobs/id/test.3mf")
        base_3mf_name = key_parts[-1].rsplit('.', 1)[0]

        # 2. Update status to "Calculating"
        print(f"Updating JobId {job_id} status to Calculating")
        timestamp = datetime.now(timezone.utc).isoformat()
        try:
            jobs_table.update_item(
                Key={'jobId': job_id},
                UpdateExpression="SET #st = :newStatus, #ua = :updateTime",
                ExpressionAttributeNames={"#st": "status", "#ua": "updatedAt"},
                ExpressionAttributeValues={":newStatus": "Calculating", ":updateTime": timestamp}
            )
        except Exception as db_error:
            print(f"Error updating status to Calculating for {job_id}: {db_error}")
            raise

        # 3. Download the .3mf file from S3 into memory
        print(f"Downloading s3://{bucket_name}/{object_key}")
        try:
            s3_response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
            three_mf_content = s3_response['Body'].read()
        except Exception as s3_error:
            print(f"Error downloading from S3: {s3_error}")
            raise

        # 4. Unzip and find the slice_info.config XML in memory
        print("Extracting .3mf content in memory to find slice_info.config")
        config_content = None
        expected_config_path_suffix = f"Metadata/slice_info.config" # Relative path within zip
        try:
            with io.BytesIO(three_mf_content) as zip_stream:
                with zipfile.ZipFile(zip_stream, 'r') as zip_ref:
                    config_filename = None
                    # Find the specific config file
                    for name in zip_ref.namelist():
                        # Allow flexibility in the root folder name (e.g., test/Metadata/...)
                        if name.endswith(expected_config_path_suffix):
                            config_filename = name
                            break

                    if not config_filename:
                        raise ValueError(f"Could not find '{expected_config_path_suffix}' inside the .3mf archive.")

                    print(f"Found config file: {config_filename}")
                    config_content = zip_ref.read(config_filename).decode('utf-8')

        except Exception as zip_error:
            print(f"Error extracting zip file or finding config: {zip_error}")
            raise

        # Parse the XML content
        xml_root = ET.fromstring(config_content)

        # 5. Extract relevant data from XML
        prediction_str = find_metadata_value(xml_root, 'prediction') # Time in seconds
        weight_str = find_metadata_value(xml_root, 'weight') # Weight in grams

        if prediction_str is None or weight_str is None:
            raise ValueError("Could not find 'prediction' or 'weight' metadata in slice_info.config.")

        # Convert string values to Decimal safely
        try:
            print_time_seconds = Decimal(prediction_str)
        except InvalidOperation:
            print(f"Warning: Could not parse prediction '{prediction_str}' as Decimal. Using 0.")
            print_time_seconds = Decimal('0')

        try:
            filament_used_grams = Decimal(weight_str)
        except InvalidOperation:
             print(f"Warning: Could not parse weight '{weight_str}' as Decimal. Using 0.")
             filament_used_grams = Decimal('0')

        print(f"Extracted Data - Time: {print_time_seconds}s, Filament: {filament_used_grams}g")

        # 6. Calculate Price using values from environment variables
        filament_cost = filament_used_grams * MARKED_UP_FILAMENT_COST_PER_GRAM # Uses calculated marked-up cost
        print_time_minutes = print_time_seconds / Decimal('60')
        time_cost = print_time_minutes * COST_PER_MINUTE # Uses cost per minute from env var
        total_price = filament_cost + time_cost

        # Round to 2 decimal places for final price
        total_price_rounded = total_price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        print(f"Calculated Price: {total_price_rounded} RSD (Filament Cost: {filament_cost.quantize(Decimal('0.01'))}, Time Cost: {time_cost.quantize(Decimal('0.01'))})")
        print(f"Using Base Filament Cost: {BASE_FILAMENT_COST_PER_GRAM} RSD/g, Markup: x{FILAMENT_MARKUP_MULTIPLIER}, Cost Per Minute: {COST_PER_MINUTE} RSD/min")


        # 7. Update DynamoDB with final status and price
        timestamp = datetime.now(timezone.utc).isoformat()
        update_expression = "SET #st = :newStatus, #pr = :price, #pt = :printTime, #fu = :filamentUsed, #ua = :updateTime"
        expression_names = {
            "#st": "status", "#pr": "price", "#pt": "printTimeSeconds",
            "#fu": "filamentUsedGrams", "#ua": "updatedAt"
        }
        # Use Decimal for price in DynamoDB for precision
        expression_values = {
            ":newStatus": "Completed", ":price": total_price_rounded,
            ":printTime": print_time_seconds, # Store original seconds as Decimal/Number
            ":filamentUsed": filament_used_grams, # Store original grams as Decimal/Number
            ":updateTime": timestamp
        }

        print("Updating DynamoDB with final result:", {k: str(v) for k, v in expression_values.items()}) # Log decimals as strings
        jobs_table.update_item(
            Key={'jobId': job_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values
        )

        print(f"JobId {job_id} completed successfully.")

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Price calculation successful', 'jobId': job_id, 'price': float(total_price_rounded)}) # Return price as float in JSON
        }

    except Exception as e:
        error_message = f"Error calculating price for JobId {job_id if job_id else 'UNKNOWN'}: {str(e)}"
        print(error_message)
        # Attempt to update DynamoDB status to "Failed" if possible
        if job_id and JOBS_TABLE_NAME:
            try:
                timestamp = datetime.now(timezone.utc).isoformat()
                jobs_table.update_item(
                    Key={'jobId': job_id},
                    UpdateExpression="SET #st = :failStatus, #err = :errorMsg, #ua = :updateTime",
                    ExpressionAttributeNames={"#st": "status", "#err": "errorMessage", "#ua": "updatedAt"},
                    ExpressionAttributeValues={":failStatus": "FailedCalculation", ":errorMsg": str(e), ":updateTime": timestamp}
                )
            except Exception as db_error:
                print(f"Failed to update status to FailedCalculation for {job_id}: {db_error}")

        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Failed to calculate price', 'error': str(e)})
        }

