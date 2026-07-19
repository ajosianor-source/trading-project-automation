provider "google" {
  project = var.project_id
  region  = var.region
}
variable "project_id" { type = string }
variable "region" {
  type    = string
  default = "europe-west2"
}

resource "google_compute_network" "this" {
  name                    = "healthgov-prod"
  auto_create_subnetworks = false
}
resource "google_compute_subnetwork" "this" {
  name = "healthgov-prod"
  ip_cidr_range = "10.60.0.0/16"
  region = var.region
  network = google_compute_network.this.id
  private_ip_google_access = true
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.70.0.0/16"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.80.0.0/20"
  }
}
module "gke" {
  source = "../../modules/gke"
  name = "healthgov-prod"
  project_id = var.project_id
  region = var.region
  network = google_compute_network.this.id
  subnetwork = google_compute_subnetwork.this.id
}
