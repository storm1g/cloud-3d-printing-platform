output "config_bucket_name" {
  description = "Ime S3 bucketa za konfiguracione fajlove."
  value       = aws_s3_bucket.config_bucket.bucket
}

output "uploads_bucket_name" {
  description = "Ime S3 bucketa za korisničke upload-e."
  value       = aws_s3_bucket.uploads_bucket.bucket
}

output "processed_bucket_name" {
  description = "Ime S3 bucketa za obrađene fajlove."
  value       = aws_s3_bucket.processed_bucket.bucket
}

output "ecr_repository_url" {
  description = "Puna URL adresa ECR repozitorijuma."
  value       = aws_ecr_repository.slicer_repo.repository_url
}

