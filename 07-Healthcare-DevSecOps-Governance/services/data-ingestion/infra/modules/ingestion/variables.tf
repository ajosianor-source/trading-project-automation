variable "ingestion_enabled" {
  description = "Enable local ingestion script validation."
  type        = bool
}

variable "ingestion_scripts_path" {
  description = "Path to the data-ingestion service root."
  type        = string
}

variable "railway_project_id" {
  description = "External Railway project identifier."
  type        = string
  default     = ""
}

variable "vercel_project_id" {
  description = "External Vercel project identifier."
  type        = string
  default     = ""
}

variable "python_executable" {
  description = "Python executable for local provisioners."
  type        = string
  default     = "python"
}

