provider "aws" { region = "eu-west-2" }
resource "aws_kms_key" "phi" {
  description             = "HealthGov PHI and Kubernetes secrets"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}
module "network" {
  source = "../../modules/network"
  name = "healthgov-dev"
  cidr = "10.40.0.0/16"
  azs  = ["eu-west-2a", "eu-west-2b", "eu-west-2c"]
}
module "eks" {
  source = "../../modules/eks"
  name = "healthgov-dev"
  vpc_id = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids
  kms_key_arn = aws_kms_key.phi.arn
}
module "data" {
  source = "../../modules/data"
  name = "healthgov-dev"
  vpc_id = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids
  kms_key_arn = aws_kms_key.phi.arn
  database_password = var.database_password
}
module "kafka" {
  source     = "../../modules/kafka"
  name       = "healthgov-dev"
  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids
  kms_key_arn = aws_kms_key.phi.arn
}
module "secrets" {
  source      = "../../modules/secrets"
  name        = "healthgov-dev"
  kms_key_arn = aws_kms_key.phi.arn
}
module "audit_evidence" {
  source      = "../../modules/audit-evidence"
  name        = "healthgov-dev"
  kms_key_arn = aws_kms_key.phi.arn
}
module "waf" {
  source = "../../modules/waf"
  name   = "healthgov-dev-api"
}
variable "database_password" {
  type      = string
  sensitive = true
}
