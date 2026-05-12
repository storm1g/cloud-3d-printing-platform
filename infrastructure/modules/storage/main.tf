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

# =============================================================================
# SLICER CONFIG FILES
#
# The Fargate slicer container downloads these three files from S3 at the start
# of every slicing job. They describe the printer hardware, print settings, and
# filament properties — think of them as the "recipe" for the slicer.
#
# Using aws_s3_object here means:
#   - The files are version-controlled in Git alongside the infrastructure
#   - terraform apply automatically re-uploads if the file content changes
#     (Terraform compares the etag/md5 hash of the local file vs S3)
#   - No manual `aws s3 cp` steps needed in CI/CD
#
# path.module points to the directory containing this file (modules/storage/).
# The config files live 3 levels up in apps/backend/slicer_config/.
# =============================================================================

locals {
  slicer_config_files = {
    "machine.json"  = "${path.module}/../../../apps/backend/slicer_config/machine.json"
    "process.json"  = "${path.module}/../../../apps/backend/slicer_config/process.json"
    "filament.json" = "${path.module}/../../../apps/backend/slicer_config/filament.json"
  }
}

resource "aws_s3_object" "slicer_config" {
  for_each = local.slicer_config_files

  bucket = aws_s3_bucket.config.id
  key    = each.key
  source = each.value

  # etag causes Terraform to re-upload the file whenever its content changes.
  # Without this, Terraform would only track whether the object *exists*,
  # not whether the content is up to date.
  etag = filemd5(each.value)
}