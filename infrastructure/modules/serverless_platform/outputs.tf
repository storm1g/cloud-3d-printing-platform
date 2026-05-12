# The full URL the frontend uses to create a job.
# NEXT_PUBLIC_REST_API_ENDPOINT should be set to this value.
# Includes the /job path because the frontend POSTs directly to this URL.
output "http_api_endpoint" {
  value = "${aws_apigatewayv2_stage.http.invoke_url}/job"
}

# The wss:// URL the browser uses to open a WebSocket connection.
# NEXT_PUBLIC_WEBSOCKET_URL should be set to this value.
output "websocket_api_endpoint" {
  value = aws_apigatewayv2_stage.websocket.invoke_url
}

# The https:// URL the PushNotification Lambda uses to POST messages back
# to connected browsers. Same host as the WebSocket URL but https:// scheme.
# WEBSOCKET_CONNECTION_URL in PushNotification Lambda should be set to this.
output "websocket_connection_url" {
  value = "https://${aws_apigatewayv2_api.websocket.id}.execute-api.${var.region}.amazonaws.com/${var.environment}"
}
