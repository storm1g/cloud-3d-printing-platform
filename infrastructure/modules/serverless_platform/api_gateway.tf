# =============================================================================
# HTTP API  (API Gateway v2)
# Handles the single REST-style endpoint: POST /job → CreateJob Lambda
# The browser calls this to get a Job ID + a presigned S3 upload URL
# =============================================================================

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-${var.environment}-http-api"
  protocol_type = "HTTP"

  # CORS is configured here at the API level (HTTP API v2 feature).
  # This replaces the manual OPTIONS method you had in the old REST API v1.
  # When the browser sends a preflight OPTIONS request, API Gateway answers it
  # automatically — your Lambda never sees it.
  cors_configuration {
    allow_origins = ["*"] # Lock this down to your domain in prod
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type"]
  }
}

# Integration: the bridge between a route and a Lambda function.
# AWS_PROXY means API Gateway passes the full request to Lambda and returns
# whatever Lambda returns — no transformation, no mapping templates.
# payload_format_version "2.0" is the newer, simpler format for HTTP API.
resource "aws_apigatewayv2_integration" "create_job" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_job.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Route: maps an HTTP method + path to an integration.
# "POST /job" matches how the frontend calls the API (NEXT_PUBLIC_REST_API_ENDPOINT
# is set to the full URL including /job, so the frontend just POSTs to it directly).
resource "aws_apigatewayv2_route" "create_job" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /job"
  target    = "integrations/${aws_apigatewayv2_integration.create_job.id}"
}

# Stage: a named deployment of the API that generates a live URL.
# auto_deploy = true means every Terraform apply automatically deploys changes —
# no separate "deploy" action needed (unlike the old REST API v1).
resource "aws_apigatewayv2_stage" "http" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = var.environment # e.g. "dev" → URL will end in /dev
  auto_deploy = true
}

# Permission: tells Lambda "API Gateway is allowed to invoke you".
# Without this, API Gateway's call would be rejected with AccessDenied.
# source_arn uses wildcards for method and route — allows any route on this API
# to invoke the function (safe because we only have one route anyway).
resource "aws_lambda_permission" "apigw_invoke_create_job" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_job.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}


# =============================================================================
# WEBSOCKET API  (API Gateway v2)
# Handles persistent browser connections for real-time status updates.
# Each message's "action" field determines which route (and Lambda) handles it.
# =============================================================================

resource "aws_apigatewayv2_api" "websocket" {
  name                       = "${var.project_name}-${var.environment}-ws-api"
  protocol_type              = "WEBSOCKET"

  # Route selection expression: API Gateway reads this field from every incoming
  # message body to decide which route to call.
  # "$request.body.action" → reads the "action" key from the JSON payload.
  # So {"action":"subscribeJob","jobId":"..."} → hits the "subscribeJob" route.
  route_selection_expression = "$request.body.action"
}

# --- $connect route ---
# Fires when a browser opens a new WebSocket connection.
# Must return 2xx or API Gateway rejects the connection entirely.
resource "aws_apigatewayv2_integration" "ws_connect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_connect.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "ws_connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_connect.id}"
}

resource "aws_lambda_permission" "apigw_invoke_ws_connect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

# --- subscribeJob route ---
# Fires when the browser sends {"action":"subscribeJob","jobId":"..."}.
# WsSubscribe writes the connectionId into the DynamoDB job record.
resource "aws_apigatewayv2_integration" "ws_subscribe" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_subscribe.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "ws_subscribe" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "subscribeJob"
  target    = "integrations/${aws_apigatewayv2_integration.ws_subscribe.id}"
}

resource "aws_lambda_permission" "apigw_invoke_ws_subscribe" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_subscribe.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

# --- WebSocket Stage ---
resource "aws_apigatewayv2_stage" "websocket" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = var.environment
  auto_deploy = true
}
