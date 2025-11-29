provider "aws" {
  region  = "eu-central-1"
  profile = "printujme-mgmt"

  assume_role {
    role_arn = "arn:aws:iam::087397489867:role/OrganizationAccountAccessRole"
  }
}