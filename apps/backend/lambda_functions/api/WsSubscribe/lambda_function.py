import json
import boto3
import os
from datetime import datetime, timezone

print('Loading function')

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
JOBS_TABLE_NAME = os.environ.get('JOBS_TABLE_NAME')

if not JOBS_TABLE_NAME:
    raise ValueError("Environment variable JOBS_TABLE_NAME is required.")

jobs_table = dynamodb.Table(JOBS_TABLE_NAME)

def lambda_handler(event, context):
    """
    Handles WebSocket 'subscribeJob' actions.
    Associates the connectionId with the specified jobId in DynamoDB.
    """
    connection_id = event['requestContext'].get('connectionId')
    print(f"Received message from connectionId: {connection_id}")
    print("Event body:", event.get('body'))

    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        job_id = body.get('jobId')

        if action == 'subscribeJob' and job_id:
            print(f"Attempting to subscribe connection {connection_id} to JobId {job_id}")

            # Update the DynamoDB item for the jobId to include the connectionId
            timestamp = datetime.now(timezone.utc).isoformat()
            try:
                response = jobs_table.update_item(
                    Key={'jobId': job_id},
                    UpdateExpression="SET #connId = :cid, #ua = :updateTime",
                    ExpressionAttributeNames={
                        "#connId": "connectionId",
                        "#ua": "updatedAt"
                    },
                    ExpressionAttributeValues={
                        ":cid": connection_id,
                        ":updateTime": timestamp
                    },
                    ReturnValues="UPDATED_NEW" # Optional: return updated attributes
                )
                print("DynamoDB update successful:", response)
                # You could optionally send a confirmation message back to the client here
                # using the ApiGatewayManagementApi client if needed.

            except Exception as db_error:
                print(f"Error updating DynamoDB for JobId {job_id}: {db_error}")
                # Return error to the client (optional, depends on your API design)
                return {'statusCode': 500, 'body': 'Failed to subscribe.'}

        else:
            print("Received message is not a valid 'subscribeJob' action or missing jobId.")
            # Optionally send an error message back to the client

    except json.JSONDecodeError:
        print("Received non-JSON message body.")
        # Optionally send an error message back to the client
        return {'statusCode': 400, 'body': 'Invalid JSON format.'}
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return {'statusCode': 500, 'body': 'Internal server error.'}

    # Return success to API Gateway (stops it retrying)
    return {
        'statusCode': 200,
        'body': json.dumps('Subscription processed.')
    }
