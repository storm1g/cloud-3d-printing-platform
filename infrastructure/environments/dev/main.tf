data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  project_name = "printujme"
  environment  = "dev"
}

module "networking" {
  source = "../../modules/networking"

  project_name = local.project_name
  environment  = local.environment

  vpc_cidr = "10.0.0.0/16"

  # DYNAMIC AZs: Automatically pick the first 2 zones in WHATEVER region we are in
  azs                 = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
}

module "storage" {
  source = "../../modules/storage"

  project_name = local.project_name
  environment  = local.environment
}

module "slicing_engine" {
  source = "../../modules/slicing_engine"

  project_name = local.project_name
  environment  = local.environment
  region       = data.aws_region.current.id

  # Inputs from Storage
  uploads_bucket_name   = module.storage.uploads_bucket_name
  uploads_bucket_arn    = module.storage.uploads_bucket_arn
  config_bucket_name    = module.storage.config_bucket_name
  config_bucket_arn     = module.storage.config_bucket_arn
  processed_bucket_name = module.storage.processed_bucket_name
  processed_bucket_arn  = module.storage.processed_bucket_arn

  # Inputs from Networking
  public_subnet_ids = module.networking.public_subnet_ids
  security_group_id = module.networking.fargate_sg_id
}