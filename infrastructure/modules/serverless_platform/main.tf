# =============================================================================
# LAMBDA: CreateJob
# Trigger: API Gateway HTTP POST /create-job  (wired up in api_gateway.tf later)
# What it does: Creates a DynamoDB job record + returns a presigned S3 upload URL
# =============================================================================

# --- Packaging ---
# Terraform watches the source_dir. When any file inside changes, it re-zips
# and re-uploads the Lambda automatically on the next apply.
data "archive_file" "create_job" {
  type        = "zip"
  source_dir  = "${path.root}/../../../apps/backend/lambda_functions/api/CreateJob"
  output_path = "${path.module}/.builds/create_job.zip"
}

# --- IAM Role ---
# Every Lambda needs an execution role — this is the identity Lambda assumes
# when it runs. The trust policy says "only Lambda can use this role".
resource "aws_iam_role" "create_job" {
  name = "${var.project_name}-${var.environment}-create-job-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Basic execution policy: allows Lambda to write its own logs to CloudWatch.
# Every Lambda needs this — without it you'd be flying blind with no logs.
resource "aws_iam_role_policy_attachment" "create_job_logs" {
  role       = aws_iam_role.create_job.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy: what THIS specific Lambda is allowed to do in your account.
resource "aws_iam_policy" "create_job" {
  name = "${var.project_name}-${var.environment}-create-job-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DynamoDBWrite"
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = "arn:aws:dynamodb:${var.region}:*:table/${var.jobs_table_name}"
      },
      {
        # Presigned URLs are generated client-side using the Lambda's own credentials.
        # The Lambda needs s3:PutObject permission so the presigned URL it generates
        # is actually valid for the browser to use.
        Sid      = "S3PresignedUrl"
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${var.uploads_bucket_arn}/jobs/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "create_job_custom" {
  role       = aws_iam_role.create_job.name
  policy_arn = aws_iam_policy.create_job.arn
}

# --- The Lambda function itself ---
resource "aws_lambda_function" "create_job" {
  function_name = "${var.project_name}-${var.environment}-create-job"
  role          = aws_iam_role.create_job.arn

  # filename + source_code_hash together tell Lambda: "here's the zip, and here's
  # its fingerprint — only redeploy if the fingerprint changes"
  filename         = data.archive_file.create_job.output_path
  source_code_hash = data.archive_file.create_job.output_base64sha256

  # Node.js runtime — must match the .mjs extension and SDK v3 imports in the code
  runtime = "nodejs22.x"
  handler = "index.handler" # filename (index.mjs) dot exported function name (handler)

  environment {
    variables = {
      JOBS_TABLE_NAME    = var.jobs_table_name
      UPLOADS_BUCKET_NAME = var.uploads_bucket_name
    }
  }
}


# =============================================================================
# LAMBDA: StartSlicing
# Trigger: S3 ObjectCreated on the uploads bucket  (wired below)
# What it does: Updates DynamoDB status → "Slicing", starts the Step Function
# =============================================================================

data "archive_file" "start_slicing" {
  type        = "zip"
  source_dir  = "${path.root}/../../../apps/backend/lambda_functions/processing/StartSlicing"
  output_path = "${path.module}/.builds/start_slicing.zip"
}

resource "aws_iam_role" "start_slicing" {
  name = "${var.project_name}-${var.environment}-start-slicing-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "start_slicing_logs" {
  role       = aws_iam_role.start_slicing.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "start_slicing" {
  name = "${var.project_name}-${var.environment}-start-slicing-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DynamoDBUpdate"
        Effect   = "Allow"
        Action   = ["dynamodb:UpdateItem"]
        Resource = "arn:aws:dynamodb:${var.region}:*:table/${var.jobs_table_name}"
      },
      {
        Sid      = "StartStepFunction"
        Effect   = "Allow"
        Action   = ["states:StartExecution"]
        Resource = var.step_function_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "start_slicing_custom" {
  role       = aws_iam_role.start_slicing.name
  policy_arn = aws_iam_policy.start_slicing.arn
}

resource "aws_lambda_function" "start_slicing" {
  function_name = "${var.project_name}-${var.environment}-start-slicing"
  role          = aws_iam_role.start_slicing.arn

  filename         = data.archive_file.start_slicing.output_path
  source_code_hash = data.archive_file.start_slicing.output_base64sha256

  runtime = "nodejs22.x"
  handler = "index.handler"

  environment {
    variables = {
      JOBS_TABLE_NAME   = var.jobs_table_name
      STATE_MACHINE_ARN = var.step_function_arn
    }
  }
}

# --- S3 Trigger for StartSlicing ---
# This is a two-part setup:
# Part 1: Tell Lambda "you are allowed to be invoked by S3"
resource "aws_lambda_permission" "s3_invoke_start_slicing" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.start_slicing.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.uploads_bucket_arn
}

# Part 2: Tell S3 "when a file is created under jobs/, call this Lambda"
# NOTE: S3 notifications cannot be added to a bucket created in a different module
# without creating a circular dependency. We solve this by defining the notification
# here and passing the bucket name in — Terraform handles the ordering correctly
# because we use the ARN reference, not the bucket resource itself.
resource "aws_s3_bucket_notification" "uploads_trigger" {
  bucket = var.uploads_bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.start_slicing.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "jobs/" # Only trigger for files under the jobs/ prefix
    filter_suffix       = ".stl"  # Only trigger for .stl files (lowercase — CreateJob standardizes this)
  }

  # Explicit dependency: Lambda permission must exist before S3 can be configured
  # to call it, otherwise the apply would fail with an "access denied" error.
  depends_on = [aws_lambda_permission.s3_invoke_start_slicing]
}


# =============================================================================
# LAMBDA: CalculatePrice
# Trigger: S3 ObjectCreated on the PROCESSED bucket (fires after Fargate slices)
# What it does: Reads the .3mf output, extracts print time + filament weight,
#               calculates price, and updates DynamoDB to "Completed"
# =============================================================================

data "archive_file" "calculate_price" {
  type        = "zip"
  source_dir  = "${path.root}/../../../apps/backend/lambda_functions/processing/CalculatePrice"
  output_path = "${path.module}/.builds/calculate_price.zip"
}

resource "aws_iam_role" "calculate_price" {
  name = "${var.project_name}-${var.environment}-calculate-price-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "calculate_price_logs" {
  role       = aws_iam_role.calculate_price.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "calculate_price" {
  name = "${var.project_name}-${var.environment}-calculate-price-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ReadProcessed"
        Effect = "Allow"
        # GetObject: download the .3mf file to read the slice metadata inside it
        Action   = ["s3:GetObject"]
        Resource = "${var.processed_bucket_arn}/jobs/*"
      },
      {
        Sid    = "DynamoDBUpdate"
        Effect = "Allow"
        # UpdateItem: set status to "Calculating" then "Completed" with price data
        Action   = ["dynamodb:UpdateItem"]
        Resource = "arn:aws:dynamodb:${var.region}:*:table/${var.jobs_table_name}"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "calculate_price_custom" {
  role       = aws_iam_role.calculate_price.name
  policy_arn = aws_iam_policy.calculate_price.arn
}

resource "aws_lambda_function" "calculate_price" {
  function_name = "${var.project_name}-${var.environment}-calculate-price"
  role          = aws_iam_role.calculate_price.arn

  filename         = data.archive_file.calculate_price.output_path
  source_code_hash = data.archive_file.calculate_price.output_base64sha256

  # Python runtime — must match the boto3 imports and .py file extension
  runtime = "python3.13"
  handler = "lambda_function.lambda_handler" # filename dot function name

  # The slicer can produce large .3mf files. The default 3s timeout and 128MB
  # memory are too low — give it room to download and parse the zip in memory.
  timeout     = 60
  memory_size = 256

  environment {
    variables = {
      JOBS_TABLE_NAME                = var.jobs_table_name
      # Pricing configuration — change these without touching code
      BASE_FILAMENT_COST_PER_GRAM    = "2.5"  # RSD per gram (material cost)
      FILAMENT_MARKUP_MULTIPLIER     = "3"     # x3 markup on material cost
      COST_PER_MINUTE                = "1"     # RSD per minute of print time
    }
  }
}

# --- S3 Trigger for CalculatePrice ---
resource "aws_lambda_permission" "s3_invoke_calculate_price" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.calculate_price.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.processed_bucket_arn
}

resource "aws_s3_bucket_notification" "processed_trigger" {
  bucket = var.processed_bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.calculate_price.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "jobs/"
    filter_suffix       = ".3mf"
  }

  depends_on = [aws_lambda_permission.s3_invoke_calculate_price]
}


# =============================================================================
# LAMBDA: WsConnect
# Trigger: API Gateway WebSocket $connect route (fires when a browser opens a WS)
# What it does: Logs the connectionId and returns 200 to allow the connection.
#               API Gateway will reject the connection if this returns non-2xx.
# No env vars needed — it does nothing except log and return success.
# =============================================================================

data "archive_file" "ws_connect" {
  type        = "zip"
  source_dir  = "${path.root}/../../../apps/backend/lambda_functions/api/WsConnect"
  output_path = "${path.module}/.builds/ws_connect.zip"
}

resource "aws_iam_role" "ws_connect" {
  name = "${var.project_name}-${var.environment}-ws-connect-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Only needs CloudWatch logs — this Lambda has no AWS API calls of its own
resource "aws_iam_role_policy_attachment" "ws_connect_logs" {
  role       = aws_iam_role.ws_connect.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "ws_connect" {
  function_name = "${var.project_name}-${var.environment}-ws-connect"
  role          = aws_iam_role.ws_connect.arn

  filename         = data.archive_file.ws_connect.output_path
  source_code_hash = data.archive_file.ws_connect.output_base64sha256

  runtime = "python3.13"
  handler = "lambda_function.lambda_handler"
}


# =============================================================================
# LAMBDA: WsSubscribe
# Trigger: API Gateway WebSocket "subscribeJob" route
# What it does: Writes the connectionId into the DynamoDB job record so that
#               PushNotification knows who to send updates to for that job.
# =============================================================================

data "archive_file" "ws_subscribe" {
  type        = "zip"
  source_dir  = "${path.root}/../../../apps/backend/lambda_functions/api/WsSubscribe"
  output_path = "${path.module}/.builds/ws_subscribe.zip"
}

resource "aws_iam_role" "ws_subscribe" {
  name = "${var.project_name}-${var.environment}-ws-subscribe-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ws_subscribe_logs" {
  role       = aws_iam_role.ws_subscribe.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "ws_subscribe" {
  name = "${var.project_name}-${var.environment}-ws-subscribe-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DynamoDBUpdateConnectionId"
      Effect = "Allow"
      # UpdateItem: stores the WebSocket connectionId on the job record so
      # PushNotification knows where to send status updates for this job
      Action   = ["dynamodb:UpdateItem"]
      Resource = "arn:aws:dynamodb:${var.region}:*:table/${var.jobs_table_name}"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ws_subscribe_custom" {
  role       = aws_iam_role.ws_subscribe.name
  policy_arn = aws_iam_policy.ws_subscribe.arn
}

resource "aws_lambda_function" "ws_subscribe" {
  function_name = "${var.project_name}-${var.environment}-ws-subscribe"
  role          = aws_iam_role.ws_subscribe.arn

  filename         = data.archive_file.ws_subscribe.output_path
  source_code_hash = data.archive_file.ws_subscribe.output_base64sha256

  runtime = "python3.13"
  handler = "lambda_function.lambda_handler"

  environment {
    variables = {
      JOBS_TABLE_NAME = var.jobs_table_name
    }
  }
}


# =============================================================================
# LAMBDA: PushNotification
# Trigger: DynamoDB Stream on the jobs table
# What it does: Watches for status changes on job records and pushes them to
#               the browser's open WebSocket connection in real-time.
#
# This is the last Lambda. It couldn't be built until we had the WebSocket
# API URL — it needs it as an env var to know where to post messages back.
# =============================================================================

data "archive_file" "push_notification" {
  type        = "zip"
  source_dir  = "${path.root}/../../../apps/backend/lambda_functions/processing/PushNotification"
  output_path = "${path.module}/.builds/push_notification.zip"
}

resource "aws_iam_role" "push_notification" {
  name = "${var.project_name}-${var.environment}-push-notification-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# AWSLambdaDynamoDBExecutionRole is an AWS managed policy that grants:
#   - dynamodb:GetRecords / GetShardIterator / DescribeStream / ListStreams
#     (everything needed to read from a DynamoDB stream)
#   - logs:CreateLogGroup / CreateLogStream / PutLogEvents
#     (CloudWatch logging — replaces the separate BasicExecutionRole attachment
#      we used for the other Lambdas, since this one covers both)
resource "aws_iam_role_policy_attachment" "push_notification_dynamodb_stream" {
  role       = aws_iam_role.push_notification.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaDynamoDBExecutionRole"
}

# Custom policy for posting messages back to WebSocket clients.
# execute-api:ManageConnections is the permission that lets a Lambda call
# the API Gateway Management API to push data to a specific connectionId.
resource "aws_iam_policy" "push_notification" {
  name = "${var.project_name}-${var.environment}-push-notification-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "PostToWebSocketConnections"
      Effect = "Allow"
      Action = ["execute-api:ManageConnections"]
      # The @connections/* resource represents all active WebSocket connections
      # on our API. We scope it to our specific stage for least-privilege.
      Resource = "${aws_apigatewayv2_stage.websocket.execution_arn}/POST/@connections/*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "push_notification_custom" {
  role       = aws_iam_role.push_notification.name
  policy_arn = aws_iam_policy.push_notification.arn
}

resource "aws_lambda_function" "push_notification" {
  function_name = "${var.project_name}-${var.environment}-push-notification"
  role          = aws_iam_role.push_notification.arn

  filename         = data.archive_file.push_notification.output_path
  source_code_hash = data.archive_file.push_notification.output_base64sha256

  runtime = "python3.13"
  handler = "lambda_function.lambda_handler"

  environment {
    variables = {
      # The HTTPS endpoint the Lambda uses to call the API Gateway Management API.
      # Format: https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
      # This is how the Lambda "pushes" a message to a specific browser connection.
      WEBSOCKET_CONNECTION_URL = "https://${aws_apigatewayv2_api.websocket.id}.execute-api.${var.region}.amazonaws.com/${var.environment}"
    }
  }
}

# --- DynamoDB Stream Trigger ---
# event_source_mapping connects a DynamoDB stream to a Lambda function.
# Unlike S3 triggers (which use bucket notifications + permissions), DynamoDB
# stream triggers use a polling model — Lambda continuously polls the stream
# and invokes the function when new records appear.
#
# starting_position = "LATEST" means: only process new changes from now on,
# ignore anything that happened before this Lambda was created.
# batch_size = 1 means: invoke the Lambda once per changed item, so each
# job status change gets its own Lambda invocation.
resource "aws_lambda_event_source_mapping" "dynamodb_stream" {
  event_source_arn  = var.dynamodb_stream_arn
  function_name     = aws_lambda_function.push_notification.arn
  starting_position = "LATEST"
  batch_size        = 1
}
