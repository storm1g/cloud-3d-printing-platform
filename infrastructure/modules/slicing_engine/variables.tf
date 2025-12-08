variable "project_name" {}
variable "environment" {}
variable "region" {}

variable "uploads_bucket_name" {}
variable "uploads_bucket_arn" {}
variable "config_bucket_name" {}
variable "config_bucket_arn" {}
variable "processed_bucket_name" {}
variable "processed_bucket_arn" {}

variable "public_subnet_ids" { type = list(string) }
variable "security_group_id" { description = "SG for the Fargate Task" }