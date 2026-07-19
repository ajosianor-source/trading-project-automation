module "cluster_baseline" {
  source        = "../../modules/onprem"
  cluster_name  = "healthgov-edge"
  api_endpoint  = var.api_endpoint
  distribution  = var.distribution
  vault_address = var.vault_address
}
variable "api_endpoint" { type = string }
variable "distribution" {
  type    = string
  default = "k3s"
}
variable "vault_address" { type = string }
