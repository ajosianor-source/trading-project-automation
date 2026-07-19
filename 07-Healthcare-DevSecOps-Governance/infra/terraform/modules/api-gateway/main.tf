variable "namespace" {
  type    = string
  default = "healthgov-system"
}
variable "gateway_image" {
  type = string
}
variable "replicas" {
  type    = number
  default = 3
}

resource "kubernetes_deployment_v1" "gateway" {
  metadata {
    name      = "api-gateway"
    namespace = var.namespace
  }
  spec {
    replicas = var.replicas
    selector {
      match_labels = { app = "api-gateway" }
    }
    template {
      metadata { labels = { app = "api-gateway" } }
      spec {
        service_account_name = "api-gateway"
        security_context {
          run_as_non_root = true
          seccomp_profile {
            type = "RuntimeDefault"
          }
        }
        container {
          name  = "envoy"
          image = var.gateway_image
          port {
            container_port = 8443
          }
          resources {
            requests = { cpu = "250m", memory = "256Mi" }
            limits   = { cpu = "1", memory = "512Mi" }
          }
          security_context {
            allow_privilege_escalation = false
            read_only_root_filesystem  = true
            capabilities {
              drop = ["ALL"]
            }
          }
          readiness_probe {
            http_get {
              path = "/ready"
              port = 9901
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "gateway" {
  metadata {
    name      = "api-gateway"
    namespace = var.namespace
  }
  spec {
    selector = { app = "api-gateway" }
    port {
      name        = "https"
      port        = 443
      target_port = 8443
    }
    type = "LoadBalancer"
  }
}

output "service_name" {
  value = kubernetes_service_v1.gateway.metadata[0].name
}
