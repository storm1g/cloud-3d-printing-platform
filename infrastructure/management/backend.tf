terraform {
  backend "s3" {
    bucket         = "printujme-infra-terraform-state"
    key            = "management/terraform.tfstate"  # <--- Different key!
    region         = "eu-central-1"
    dynamodb_table = "printujme-infra-locks"
    encrypt        = true
  }
}