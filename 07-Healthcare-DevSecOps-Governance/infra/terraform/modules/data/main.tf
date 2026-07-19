variable "name" { type = string }
variable "subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
variable "kms_key_arn" { type = string }
variable "database_password" {
  type      = string
  sensitive = true
}

resource "aws_db_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}
resource "aws_security_group" "db" {
  name_prefix = "${var.name}-db-"
  vpc_id      = var.vpc_id
}
resource "aws_db_instance" "postgres" {
  identifier                    = "${var.name}-postgres"
  engine                        = "postgres"
  engine_version                = "16.8"
  instance_class                = "db.r6g.large"
  allocated_storage             = 100
  max_allocated_storage         = 1000
  storage_encrypted             = true
  kms_key_id                    = var.kms_key_arn
  db_name                       = "healthgov"
  username                      = "healthgov_admin"
  password                      = var.database_password
  db_subnet_group_name          = aws_db_subnet_group.this.name
  vpc_security_group_ids        = [aws_security_group.db.id]
  publicly_accessible           = false
  multi_az                      = true
  backup_retention_period       = 35
  deletion_protection           = true
  performance_insights_enabled  = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  skip_final_snapshot           = false
}
resource "aws_elasticache_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.name}-redis"
  description                = "Encrypted HealthGov cache"
  node_type                  = "cache.r7g.large"
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  automatic_failover_enabled = true
  multi_az_enabled           = true
  num_cache_clusters         = 2
  kms_key_id                 = var.kms_key_arn
}
