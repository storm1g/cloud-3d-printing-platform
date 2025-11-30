variable "project_name" { type = string }
variable "environment" { type = string }

variable "force_destroy" {
  description = "Delete bucket even if not empty? (True for Dev, False for Prod)"
  type        = bool
  default     = false
}