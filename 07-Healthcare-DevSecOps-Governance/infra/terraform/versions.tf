terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws        = { source = "hashicorp/aws", version = "~> 5.100" }
    azurerm    = { source = "hashicorp/azurerm", version = "~> 4.30" }
    google     = { source = "hashicorp/google", version = "~> 6.35" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.36" }
    helm       = { source = "hashicorp/helm", version = "~> 2.17" }
  }
}
