terraform {
  required_version = ">= 1.8.0"

  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

# This stack intentionally uses local state by default. Do not place PHI, access
# tokens, database URLs, or private keys in variables because Terraform records
# variable and resource values in state.

