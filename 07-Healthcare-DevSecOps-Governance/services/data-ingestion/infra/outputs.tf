output "ingestion_status" {
  description = "Local ingestion validation status."
  value       = module.ingestion.ingestion_status
}

output "ingestion_scripts_location" {
  description = "Resolved location of the ingestion service scripts."
  value       = module.ingestion.ingestion_scripts_location
}

output "external_deployment_metadata" {
  description = "Non-secret references to externally managed Railway and Vercel projects."
  value = {
    railway_project_id = var.railway_project_id
    vercel_project_id  = var.vercel_project_id
  }
}

