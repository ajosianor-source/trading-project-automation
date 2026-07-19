variable "namespace" {
  type    = string
  default = "healthgov-observability"
}
variable "grafana_admin_secret_name" {
  type    = string
  default = "grafana-admin"
}
variable "otlp_endpoint" {
  type      = string
  sensitive = true
}

resource "kubernetes_namespace_v1" "observability" {
  metadata { name = var.namespace }
}

resource "helm_release" "kube_prometheus" {
  name       = "kube-prometheus-stack"
  namespace  = kubernetes_namespace_v1.observability.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "69.8.2"
  atomic     = true
  values = [yamlencode({
    grafana = { admin = { existingSecret = var.grafana_admin_secret_name } }
    prometheus = { prometheusSpec = { retention = "30d", enableRemoteWriteReceiver = false } }
  })]
}

resource "helm_release" "otel_collector" {
  name       = "otel-collector"
  namespace  = kubernetes_namespace_v1.observability.metadata[0].name
  repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
  chart      = "opentelemetry-collector"
  version    = "0.117.3"
  atomic     = true
  values = [yamlencode({
    mode = "deployment"
    config = {
      processors = { batch = {}, memory_limiter = { limit_mib = 512 } }
      exporters = { otlp = { endpoint = var.otlp_endpoint } }
      service = { pipelines = {
        traces = { receivers = ["otlp"], processors = ["memory_limiter", "batch"], exporters = ["otlp"] }
      } }
    }
  })]
}

output "namespace" {
  value = kubernetes_namespace_v1.observability.metadata[0].name
}
