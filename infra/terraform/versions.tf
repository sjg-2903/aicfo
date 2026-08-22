terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6"
    }
  }
}

# For team / CI usage, move the state to S3 + DynamoDB and remove the local
# backend below by uncommenting:
# backend "s3" {
#   bucket         = "aicfo-tfstate"
#   key            = "prod/terraform.tfstate"
#   region         = "ap-south-1"
#   dynamodb_table = "aicfo-tfstate-lock"
#   encrypt        = true
# }
