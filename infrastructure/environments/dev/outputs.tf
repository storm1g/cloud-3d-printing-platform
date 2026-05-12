output "http_api_endpoint" {
  description = "Full URL for the CreateJob endpoint. Set as NEXT_PUBLIC_REST_API_ENDPOINT in the frontend."
  value       = module.serverless_platform.http_api_endpoint
}

output "websocket_api_endpoint" {
  description = "WSS URL for the WebSocket API. Set as NEXT_PUBLIC_WEBSOCKET_URL in the frontend."
  value       = module.serverless_platform.websocket_api_endpoint
}

output "websocket_connection_url" {
  description = "HTTPS URL used by PushNotification Lambda to post messages to connected clients."
  value       = module.serverless_platform.websocket_connection_url
}

output "frontend_url" {
  description = "Amplify default domain for the deployed frontend."
  value       = module.frontend_hosting.amplify_default_domain
}

