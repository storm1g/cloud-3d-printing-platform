import json
import os

print('Loading connect handler function')

def lambda_handler(event, context):
    """
    Handles WebSocket $connect events.
    Logs the connectionId or the event if structure is unexpected.
    Returns success to API Gateway to allow the connection.
    """
    print("Received event:", json.dumps(event, indent=2)) # Log the entire event

    # Safely get the requestContext
    request_context = event.get('requestContext')

    if not request_context:
        print("[ERROR] 'requestContext' not found in the event object.")
        # Return error to API Gateway, connection will fail
        return {'statusCode': 500, 'body': 'Internal server error: Invalid event structure.'}

    connection_id = request_context.get('connectionId')
    event_type = request_context.get('eventType')

    if not connection_id:
         print("[ERROR] 'connectionId' not found in requestContext.")
         return {'statusCode': 500, 'body': 'Internal server error: Connection ID missing.'}

    # Log the successful connection attempt
    print(f"Handling {event_type} event for connectionId: {connection_id}")

    # Simply return success to allow the connection
    return {
        'statusCode': 200,
        'body': json.dumps('Connected.')
    }

