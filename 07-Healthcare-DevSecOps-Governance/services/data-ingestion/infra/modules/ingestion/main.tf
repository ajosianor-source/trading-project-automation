locals {
  scripts_location = abspath(var.ingestion_scripts_path)
  source_files = setunion(
    try(fileset(local.scripts_location, "app/**/*.py"), toset([])),
    try(fileset(local.scripts_location, "*_ingest.py"), toset([])),
    try(fileset(local.scripts_location, "ingestion_orchestrator.py"), toset([]))
  )
  source_digest = try(
    sha256(join("", [
      for filename in sort(tolist(local.source_files)) :
      filesha256("${local.scripts_location}/${filename}")
    ])),
    "source-unavailable"
  )
}

resource "null_resource" "ingestion_orchestration" {
  count = var.ingestion_enabled ? 1 : 0

  triggers = {
    scripts_location   = local.scripts_location
    source_digest      = local.source_digest
    railway_project_id = var.railway_project_id
    vercel_project_id  = var.vercel_project_id
  }

  # Terraform validates code only. Starting long-running ingestion or processing
  # PHI from a provisioner would be non-idempotent and would leak operational
  # concerns into infrastructure state.
  provisioner "local-exec" {
    working_dir = local.scripts_location
    command     = "${var.python_executable} -m compileall -q app"
  }

  provisioner "local-exec" {
    working_dir = local.scripts_location
    command     = "${var.python_executable} ingestion_orchestrator.py --help"
  }

  lifecycle {
    precondition {
      condition     = !var.ingestion_enabled || local.source_digest != "source-unavailable"
      error_message = "The ingestion scripts path could not be read."
    }
    precondition {
      condition     = !var.ingestion_enabled || length(local.source_files) > 0
      error_message = "No ingestion Python scripts were found at ingestion_scripts_path."
    }
  }
}
