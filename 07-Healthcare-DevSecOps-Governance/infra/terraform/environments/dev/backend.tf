terraform {
  backend "s3" {
    bucket         = "healthgov-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "eu-west-2"
    encrypt        = true
    dynamodb_table = "healthgov-terraform-locks"
  }
}

