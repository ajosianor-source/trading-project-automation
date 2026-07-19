variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "subnet_id" { type = string }
variable "log_analytics_workspace_id" { type = string }

resource "azurerm_kubernetes_cluster" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.name
  private_cluster_enabled             = true
  role_based_access_control_enabled   = true
  local_account_disabled              = true
  azure_policy_enabled                = true
  oidc_issuer_enabled                 = true
  workload_identity_enabled           = true
  sku_tier                            = "Standard"

  default_node_pool {
    name                 = "system"
    vm_size              = "Standard_D4ds_v5"
    vnet_subnet_id       = var.subnet_id
    auto_scaling_enabled = true
    min_count            = 3
    max_count            = 10
    os_disk_type         = "Ephemeral"
    only_critical_addons_enabled = true
  }
  identity { type = "SystemAssigned" }
  network_profile {
    network_plugin = "azure"
    network_policy = "cilium"
    network_data_plane = "cilium"
    outbound_type = "userDefinedRouting"
  }
  oms_agent { log_analytics_workspace_id = var.log_analytics_workspace_id }
  key_vault_secrets_provider { secret_rotation_enabled = true }
}
output "cluster_id" { value = azurerm_kubernetes_cluster.this.id }

