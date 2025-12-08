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
