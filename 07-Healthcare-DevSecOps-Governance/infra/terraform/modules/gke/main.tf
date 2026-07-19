variable "name" { type = string }
variable "project_id" { type = string }
variable "region" { type = string }
variable "network" { type = string }
variable "subnetwork" { type = string }

resource "google_container_cluster" "this" {
  name                     = var.name
  project                  = var.project_id
  location                 = var.region
  network                  = var.network
  subnetwork               = var.subnetwork
  deletion_protection      = true
  remove_default_node_pool = true
  initial_node_count       = 1
  enable_shielded_nodes    = true
  enable_intranode_visibility = true
  datapath_provider        = "ADVANCED_DATAPATH"
  networking_mode          = "VPC_NATIVE"
  workload_identity_config { workload_pool = "${var.project_id}.svc.id.goog" }
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = true
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
  master_authorized_networks_config {}
  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.gke.id
  }
  release_channel { channel = "STABLE" }
}
resource "google_kms_key_ring" "this" {
  name     = var.name
  location = var.region
}
resource "google_kms_crypto_key" "gke" {
  name            = "gke-secrets"
  key_ring        = google_kms_key_ring.this.id
  rotation_period = "7776000s"
}
resource "google_container_node_pool" "this" {
  name       = "workloads"
  cluster    = google_container_cluster.this.id
  node_count = 3
  node_config {
    machine_type = "e2-standard-4"
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
    workload_metadata_config { mode = "GKE_METADATA" }
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
  autoscaling {
    min_node_count = 3
    max_node_count = 10
  }
}
