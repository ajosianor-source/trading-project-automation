provider "azurerm" { features {} }
variable "subscription_id" { type = string }
variable "location" {
  type    = string
  default = "uksouth"
}

resource "azurerm_resource_group" "this" {
  name     = "healthgov-prod"
  location = var.location
}
resource "azurerm_virtual_network" "this" {
  name = "healthgov-prod"
  address_space = ["10.50.0.0/16"]
  location = var.location
  resource_group_name = azurerm_resource_group.this.name
}
resource "azurerm_subnet" "aks" {
  name = "aks"
  resource_group_name = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes = ["10.50.0.0/20"]
}
resource "azurerm_log_analytics_workspace" "this" {
  name = "healthgov-prod"
  location = var.location
  resource_group_name = azurerm_resource_group.this.name
  retention_in_days = 365
}
module "aks" {
  source = "../../modules/aks"
  name = "healthgov-prod"
  location = var.location
  resource_group_name = azurerm_resource_group.this.name
  subnet_id = azurerm_subnet.aks.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
}
