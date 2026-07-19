variable "ingestion_enabled" {
  description = "Whether Terraform should validate the local ingestion scripts."
  type        = bool
  default     = true
}

variable "ingestion_scripts_path" {
  description = "Path to the data-ingestion service root, relative to this Terraform root or absolute."
  type        = string
  default     = ".."

  validation {
    condition     = length(trimspace(var.ingestion_scripts_path)) > 0
    error_message = "ingestion_scripts_path must not be empty."
  }
}

variable "railway_project_id" {
  description = "Existing Railway project ID used as deployment metadata; Railway is external to this stack."
  type        = string
  default     = ""
  sensitive   = false
}

variable "vercel_project_id" {
  description = "Existing Vercel project ID for the Next.js dashboard; Vercel is external to this stack."
  type        = string
  default     = ""
  sensitive   = false
}

variable "python_executable" {
  description = "Python 3.11+ executable used by local validation provisioners."
  type        = string
  default     = "python"
}

