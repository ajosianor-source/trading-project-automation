# Terraform configuration for AWS IAM Roles for Service Accounts (IRSA)
# and Enterprise OIDC Provider (Okta/Keycloak) Integration

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# 1. Retrieve EKS Cluster OIDC Provider details
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

# 2. Create IAM Policy for HealthGov Runtime (S3 and KMS access)
resource "aws_iam_policy" "healthgov_runtime_policy" {
  name        = "healthgov-runtime-policy"
  path        = "/"
  description = "Least-privilege policy for HealthGov runtime pods"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Allow read/write access to the audit logs S3 bucket
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::healthgov-audit-logs-${data.aws_caller_identity.current.account_id}",
          "arn:aws:s3:::healthgov-audit-logs-${data.aws_caller_identity.current.account_id}/*"
        ]
      },
      # Allow transit encryption/decryption using AWS KMS
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [
          "arn:aws:kms:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:key/healthgov-app-key"
        ]
      }
    ]
  })
}

# 3. Create IAM Role for Service Account (IRSA) with OIDC Trust Policy
resource "aws_iam_role" "healthgov_runtime_role" {
  name = "healthgov-runtime-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:healthgov:healthgov-runtime"
          }
        }
      }
    ]
  })
}

# 4. Attach Policy to Role
resource "aws_iam_role_policy_attachment" "healthgov_runtime_attach" {
  role       = aws_iam_role.healthgov_runtime_role.name
  policy_arn = aws_iam_policy.healthgov_runtime_policy.arn
}
