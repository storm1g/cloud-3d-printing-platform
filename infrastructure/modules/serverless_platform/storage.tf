# Get Account ID inside the module
data "aws_caller_identity" "current" {}

# 1. Config Bucket
resource "aws_s3_bucket" "config_bucket" {
  bucket = "${var.environment}-${var.project_name}-config-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "config_bucket_pab" {
  bucket = aws_s3_bucket.config_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2. Uploads Bucket
resource "aws_s3_bucket" "uploads_bucket" {
  bucket = "${var.project_name}-uploads-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "uploads_bucket_pab" {
  bucket = aws_s3_bucket.uploads_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. Processed Bucket
resource "aws_s3_bucket" "processed_bucket" {
  bucket = "${var.project_name}-processed-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "processed_bucket_pab" {
  bucket = aws_s3_bucket.processed_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- ECR Repository ---
resource "aws_ecr_repository" "slicer_repo" {
  name = var.project_name

  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}