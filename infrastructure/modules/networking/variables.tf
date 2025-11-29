variable "vpc_cidr" {
  description = "The IP range for the VPC"
  type        = string
}

variable "environment" {
  description = "e.g. dev, staging, prod"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "List of CIDRs for public subnets"
  type        = list(string)
}

variable "azs" {
  description = "List of Availability Zones"
  type        = list(string)
}

variable "project_name" {
  description = "The name of the project"
  type        = string
}