variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "kms_key_arn" { type = string }

resource "aws_security_group" "this" {
  name_prefix = "${var.name}-msk-"
  vpc_id      = var.vpc_id
}

resource "aws_cloudwatch_log_group" "broker" {
  name              = "/healthgov/${var.name}/msk"
  retention_in_days = 365
  kms_key_id        = var.kms_key_arn
}

resource "aws_msk_cluster" "this" {
  cluster_name           = "${var.name}-kafka"
  kafka_version          = "3.8.x"
  number_of_broker_nodes = 3
  broker_node_group_info {
    instance_type   = "kafka.m7g.large"
    client_subnets  = var.subnet_ids
    security_groups = [aws_security_group.this.id]
    storage_info {
      ebs_storage_info { volume_size = 500 }
    }
  }
  encryption_info {
    encryption_at_rest_kms_key_arn = var.kms_key_arn
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }
  client_authentication {
    sasl { iam = true }
  }
  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.broker.name
      }
    }
  }
}

output "bootstrap_brokers_sasl_iam" {
  value     = aws_msk_cluster.this.bootstrap_brokers_sasl_iam
  sensitive = true
}
