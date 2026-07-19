variable "cluster_name" { type = string }
variable "api_endpoint" { type = string }
variable "distribution" {
  type = string
  validation {
    condition     = contains(["k3s", "openshift"], var.distribution)
    error_message = "Distribution must be k3s or openshift."
  }
}
variable "vault_address" { type = string }

locals {
  baseline = {
    cluster_name            = var.cluster_name
    api_endpoint            = var.api_endpoint
    distribution            = var.distribution
    require_fips            = true
    require_tpm             = true
    require_disk_encryption = true
    require_private_registry = true
    vault_address           = var.vault_address
  }
}

resource "terraform_data" "validated_baseline" {
  input = local.baseline
  lifecycle {
    precondition {
      condition     = startswith(var.api_endpoint, "https://")
      error_message = "On-prem Kubernetes API must use TLS."
    }
    precondition {
      condition     = startswith(var.vault_address, "https://")
      error_message = "Vault must use TLS."
    }
  }
}
output "baseline" { value = terraform_data.validated_baseline.output }

