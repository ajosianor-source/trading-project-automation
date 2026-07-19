package playbooks.terraform

# Default deny all
default allow = false

# Rule 1: Block public S3/storage buckets
allow {
    not has_public_buckets
    has_encryption_at_rest
    enforces_tls_1_3
}

has_public_buckets {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    acl := resource.change.after.acl
    acl == "public-read"
}

has_public_buckets {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    acl := resource.change.after.acl
    acl == "public-read-write"
}

# Rule 2: Enforce database encryption-at-rest
has_encryption_at_rest {
    # Check all aws_db_instance resources
    db_instances := [db | db := input.resource_changes[_]; db.type == "aws_db_instance"]
    all_db_encrypted(db_instances)
}

all_db_encrypted(db_instances) {
    count(db_instances) == 0
}

all_db_encrypted(db_instances) {
    count(db_instances) > 0
    encrypted_instances := [db | db := db_instances[_]; db.change.after.storage_encrypted == true]
    count(db_instances) == count(encrypted_instances)
}

# Rule 3: Enforce TLS 1.3 on all ingress controllers
enforces_tls_1_3 {
    ingresses := [ing | ing := input.resource_changes[_]; ing.type == "kubernetes_ingress_v1"]
    all_ingress_tls_1_3(ingresses)
}

all_ingress_tls_1_3(ingresses) {
    count(ingresses) == 0
}

all_ingress_tls_1_3(ingresses) {
    count(ingresses) > 0
    tls_1_3_ingresses := [ing | ing := ingresses[_]; 
        contains(ing.change.after.metadata[_].annotations["nginx.ingress.kubernetes.io/ssl-ciphers"], "TLS_AES_256_GCM_SHA384")
    ]
    count(ingresses) == count(tls_1_3_ingresses)
}
