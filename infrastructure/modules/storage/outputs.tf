output "dynamodb_table_arn" {
  value = aws_dynamodb_table.jobs.arn
}

output "jobs_table_name" {
  value = aws_dynamodb_table.jobs.name
}

output "dynamodb_stream_arn" {
  value = aws_dynamodb_table.jobs.stream_arn
}

output "uploads_bucket_name" {
  value = aws_s3_bucket.uploads.id
}

output "uploads_bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "config_bucket_name" {
  value = aws_s3_bucket.config.id
}

output "config_bucket_arn" {
  value = aws_s3_bucket.config.arn
}

output "processed_bucket_name" {
  value = aws_s3_bucket.processed.id
}

output "processed_bucket_arn" {
  value = aws_s3_bucket.processed.arn
}