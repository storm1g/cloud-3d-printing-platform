terraform {
  backend "s3" {
    bucket         = "printujme-infra-terraform-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "printujme-infra-locks"
    encrypt        = true
  }
}