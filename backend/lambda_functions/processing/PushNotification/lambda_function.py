import json
import boto3
import os
from decimal import Decimal

# Initialize AWS clients
# We need the API Gateway Management API client to post back to WebSocket
apigw_management_client = None # Will be initialized lazily based on endpoint URL

# DynamoDB JSON decoder for handling Decimal types
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            # Check if it's an integer
            if o % 1 == 0:
                return int(o)
            else:
                return float(o) # Convert Decimal to float for JSON serialization
        return super(DecimalEncoder, self).default(o)

def get_apigw_client(endpoint_url):
    """ Initializes the API Gateway Management API client lazily """
    global apigw_management_client
    if apigw_management_client is None or apigw_management_client.meta.endpoint_url != endpoint_url:
        print(f"Initializing ApiGatewayManagementApi client for endpoint: {endpoint_url}")
        apigw_management_client = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=endpoint_url # IMPORTANT: Must use the Connection URL
        )
    return apigw_management_client

def lambda_handler(event, context):
    """
    Handles DynamoDB Stream events for the PrintPlatformJobs table.
    Sends status updates to the relevant WebSocket connection.
    """
    print("Received DynamoDB Stream event:", json.dumps(event, indent=2))

    # Get WebSocket Connection URL from environment variables
    # Example: https://<api-id>.execute-api.eu-central-1.amazonaws.com/prod
    websocket_connection_url = os.environ.get('WEBSOCKET_CONNECTION_URL')
    if not websocket_connection_url:
        print("Error: WEBSOCKET_CONNECTION_URL environment variable is not set.")
        return {'statusCode': 500, 'body': 'Configuration error.'}

    # Ensure the endpoint URL uses HTTPS
    if not websocket_connection_url.startswith("https://"):
         print(f"Warning: WEBSOCKET_CONNECTION_URL '{websocket_connection_url}' does not start with https://. Prepending.")
         websocket_connection_url = "https://" + websocket_connection_url.split("://")[-1] # Ensure https


    try:
        api_client = get_apigw_client(websocket_connection_url)
    except Exception as client_error:
         print(f"Error initializing API Gateway Management client: {client_error}")
         return {'statusCode': 500, 'body': 'Failed to initialize client.'}


    for record in event['Records']:
        # Only process MODIFY events (when an item is updated)
        if record['eventName'] == 'MODIFY':
            print("Processing MODIFY event")

            # Extract new image (current state) and old image (previous state)
            new_image = record['dynamodb'].get('NewImage', {})
            old_image = record['dynamodb'].get('OldImage', {})

            # Get connectionId and jobId from the new image
            connection_id = new_image.get('connectionId', {}).get('S') # 'S' for String type in DynamoDB
            job_id = new_image.get('jobId', {}).get('S')
            new_status = new_image.get('status', {}).get('S')
            old_status = old_image.get('status', {}).get('S') # Get old status for comparison


            # If connectionId is missing or status hasn't changed, skip
            if not connection_id:
                print(f"No connectionId found for JobId {job_id}. Skipping.")
                continue
            if new_status == old_status:
                print(f"Status for JobId {job_id} hasn't changed ('{new_status}'). Skipping notification.")
                continue

            print(f"Status changed for JobId {job_id} from '{old_status}' to '{new_status}'. Sending update to connectionId {connection_id}")

            # Prepare the message payload
            message_payload = {
                'jobId': job_id,
                'status': new_status
            }
            # Add price and other details if the status is Completed
            if new_status == 'Completed':
                price = new_image.get('price', {}).get('N') # 'N' for Number type
                print_time = new_image.get('printTimeSeconds', {}).get('N')
                filament_used = new_image.get('filamentUsedGrams', {}).get('N')

                if price:
                    message_payload['price'] = Decimal(price) # Keep as Decimal for encoder
                if print_time:
                    message_payload['printTimeSeconds'] = Decimal(print_time)
                if filament_used:
                     message_payload['filamentUsedGrams'] = Decimal(filament_used)


            # Send the message via WebSocket
            try:
                print("Posting to connection:", connection_id)
                api_client.post_to_connection(
                    ConnectionId=connection_id,
                    Data=json.dumps(message_payload, cls=DecimalEncoder) # Use custom encoder
                )
                print("Message posted successfully.")

            except api_client.exceptions.GoneException:
                # Client disconnected between the event and sending the message
                print(f"ConnectionId {connection_id} is gone. Cannot send message.")
                # Optional: Clean up connectionId in DynamoDB here if needed
            except Exception as e:
                print(f"Error sending message to {connection_id} for JobId {job_id}: {e}")
                # Don't stop processing other records if one fails
        else:
            print(f"Ignoring event type: {record['eventName']}")


    return {
        'statusCode': 200,
        'body': json.dumps('Processed DynamoDB stream records.')
    }

