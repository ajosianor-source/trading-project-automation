module "ingestion" {
  source = "./modules/ingestion"

  ingestion_enabled      = var.ingestion_enabled
  ingestion_scripts_path = var.ingestion_scripts_path
  railway_project_id     = var.railway_project_id
  vercel_project_id      = var.vercel_project_id
  python_executable      = var.python_executable
}

# Railway and Vercel are deliberately external resources. Their deployments
# contain application secrets and mutable release state that should be managed
# by their CLIs/Git integrations, not by local-exec provisioners.

# Optional AWS expansion
# ----------------------
# Prefer the production modules already provided under the repository-level
# infra/terraform tree. A minimal expansion would connect:
#
# module "eks" {
#   source      = "../../../infra/terraform/modules/eks"
#   name        = "healthgov-ingestion"
#   vpc_id      = module.network.vpc_id
#   subnet_ids  = module.network.private_subnet_ids
#   kms_key_arn = aws_kms_key.ingestion.arn
# }
#
# resource "aws_db_instance" "ingestion" {
#   identifier              = "healthgov-ingestion"
#   engine                  = "postgres"
#   engine_version          = "16.8"
#   instance_class          = "db.r6g.large"
#   storage_encrypted       = true
#   kms_key_id              = aws_kms_key.ingestion.arn
#   multi_az                = true
#   publicly_accessible     = false
#   backup_retention_period = 35
#   deletion_protection     = true
#   skip_final_snapshot     = false
# }
#
# Do not uncomment partial examples directly in production. Add the AWS
# provider, remote state, IAM, networking, security groups, secret injection,
# monitoring, backup validation, and approved region/data-residency controls.

