output "ingestion_status" {
  description = "Whether local validation is enabled and represented in state."
  value       = var.ingestion_enabled ? "enabled-and-validated" : "disabled"
}

output "ingestion_scripts_location" {
  description = "Absolute path Terraform used for ingestion script validation."
  value       = local.scripts_location
}

