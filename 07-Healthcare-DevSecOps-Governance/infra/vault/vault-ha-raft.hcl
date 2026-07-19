# HashiCorp Vault High Availability Configuration
# Uses Raft Integrated Storage and AWS KMS Auto-Unseal

listener "tcp" {
  address     = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file = "/vault/userconfig/vault-tls/tls.crt"
  tls_key_file  = "/vault/userconfig/vault-tls/tls.key"
  tls_client_ca_file = "/vault/userconfig/vault-tls/ca.crt"
  tls_min_version = "tls13"
}

storage "raft" {
  path    = "/vault/data"
  node_id = "vault-node-1" # Dynamically set per pod in StatefulSet

  retry_join {
    leader_api_addr = "https://vault-0.vault-internal.healthgov.svc.cluster.local:8200"
  }
  retry_join {
    leader_api_addr = "https://vault-1.vault-internal.healthgov.svc.cluster.local:8200"
  }
  retry_join {
    leader_api_addr = "https://vault-2.vault-internal.healthgov.svc.cluster.local:8200"
  }
}

# AWS KMS Auto-Unseal Configuration
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/vault-unseal-key"
}

cluster_addr = "https://vault-0.vault-internal.healthgov.svc.cluster.local:8201"
api_addr     = "https://vault-0.vault-internal.healthgov.svc.cluster.local:8200"
disable_mlock = true
ui = true
