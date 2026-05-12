variable "project_name" { type = string }
variable "environment" { type = string }
variable "region" { type = string }

# From storage module
variable "jobs_table_name" { type = string }
variable "uploads_bucket_name" { type = string }
variable "uploads_bucket_arn" { type = string }
variable "processed_bucket_name" { type = string }
variable "processed_bucket_arn" { type = string }

# From slicing_engine module
variable "step_function_arn" { type = string }

# For DynamoDB stream trigger on PushNotification
variable "dynamodb_stream_arn" { type = string }