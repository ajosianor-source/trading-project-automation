variable "provider_name" {
  type = string
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.provider_name)
    error_message = "provider_name must be aws, azure, or gcp."
  }
}
variable "name" {
  type = string
}
variable "region" {
  type = string
}
variable "azure_resource_group_name" {
  type    = string
  default = null
}

resource "aws_s3_bucket" "lake" {
  count  = var.provider_name == "aws" ? 1 : 0
  bucket = var.name
}
resource "aws_s3_bucket_versioning" "lake" {
  count  = var.provider_name == "aws" ? 1 : 0
  bucket = aws_s3_bucket.lake[0].id
  versioning_configuration {
    status = "Enabled"
  }
}
resource "aws_s3_bucket_public_access_block" "lake" {
  count                   = var.provider_name == "aws" ? 1 : 0
  bucket                  = aws_s3_bucket.lake[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "lake" {
  count  = var.provider_name == "aws" ? 1 : 0
  bucket = aws_s3_bucket.lake[0].id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "azurerm_storage_account" "lake" {
  count                    = var.provider_name == "azure" ? 1 : 0
  name                     = replace(var.name, "-", "")
  resource_group_name      = var.azure_resource_group_name
  location                 = var.region
  account_tier             = "Standard"
  account_replication_type = "GRS"
  min_tls_version          = "TLS1_2"
  shared_access_key_enabled         = false
  infrastructure_encryption_enabled = true
  public_network_access_enabled      = false
}

resource "google_storage_bucket" "lake" {
  count                       = var.provider_name == "gcp" ? 1 : 0
  name                        = var.name
  location                    = var.region
  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }
  public_access_prevention = "enforced"
}

resource "aws_glue_catalog_database" "lake" {
  count = var.provider_name == "aws" ? 1 : 0
  name  = replace(var.name, "-", "_")
}

resource "aws_athena_workgroup" "lake" {
  count = var.provider_name == "aws" ? 1 : 0
  name  = var.name
  configuration {
    enforce_workgroup_configuration = true
    result_configuration {
      output_location = "s3://${aws_s3_bucket.lake[0].id}/query-results/"
      encryption_configuration {
        encryption_option = "SSE_KMS"
      }
    }
  }
}

resource "google_bigquery_dataset" "lake" {
  count                      = var.provider_name == "gcp" ? 1 : 0
  dataset_id                 = replace(var.name, "-", "_")
  location                   = var.region
  delete_contents_on_destroy = false
}

output "storage_id" {
  value = coalesce(
    try(aws_s3_bucket.lake[0].id, null),
    try(azurerm_storage_account.lake[0].id, null),
    try(google_storage_bucket.lake[0].id, null)
  )
}
