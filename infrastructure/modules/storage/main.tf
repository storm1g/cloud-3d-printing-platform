# --- DYNAMODB ---
resource "aws_dynamodb_table" "jobs" {
  name         = "${var.project_name}-${var.environment}-jobs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "jobId"

  attribute {
    name = "jobId"
    type = "S"
  }

  # CRITICAL: Enables Flow 2 (Stream -> Lambda -> WebSocket)
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = {
    Name = "${var.project_name}-${var.environment}-jobs"
  }
}

# --- S3 BUCKETS ---

# 1. Uploads Bucket
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project_name}-${var.environment}-uploads"
  force_destroy = var.environment == "dev" ? true : false
}

# CORS
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = ["*"] # Lock this down in Prod!
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# 2. Config Bucket
resource "aws_s3_bucket" "config" {
  bucket = "${var.project_name}-${var.environment}-config"
  force_destroy = var.environment == "dev" ? true : false
}

# 3. Processed Bucket
resource "aws_s3_bucket" "processed" {
  bucket = "${var.project_name}-${var.environment}-processed"
  force_destroy = var.environment == "dev" ? true : false
}

# --- SECURITY: BLOCK PUBLIC ACCESS ---

resource "aws_s3_bucket_public_access_block" "block_public" {
  for_each = {
    uploads   = aws_s3_bucket.uploads.id
    config    = aws_s3_bucket.config.id
    processed = aws_s3_bucket.processed.id
  }

  bucket = each.value

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}