variable "namespace" {
  type    = string
  default = "healthgov"
}
variable "oidc_group_prefix" {
  type    = string
  default = "healthgov:"
}

locals {
  roles = {
    auditor    = ["get", "list", "watch"]
    developer  = ["get", "list"]
    security   = ["get", "list", "watch", "patch"]
    compliance = ["get", "list", "watch"]
  }
}

resource "kubernetes_role_v1" "role" {
  for_each = local.roles
  metadata {
    name      = each.key
    namespace = var.namespace
  }
  rule {
    api_groups = [""]
    resources  = ["configmaps", "pods", "pods/log"]
    verbs      = each.value
  }
}

resource "kubernetes_role_binding_v1" "binding" {
  for_each = local.roles
  metadata {
    name      = "${each.key}-oidc"
    namespace = var.namespace
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.role[each.key].metadata[0].name
  }
  subject {
    kind      = "Group"
    name      = "${var.oidc_group_prefix}${each.key}"
    api_group = "rbac.authorization.k8s.io"
  }
}

output "roles" {
  value = keys(local.roles)
}
