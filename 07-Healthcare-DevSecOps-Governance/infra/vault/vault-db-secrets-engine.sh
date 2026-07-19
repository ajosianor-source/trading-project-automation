#!/bin/bash
# Configure HashiCorp Vault Database Secrets Engine for PostgreSQL
# Generates short-lived, unique credentials rotating every hour

set -euo pipefail

# 1. Enable the Database Secrets Engine
vault secrets enable database || true

# 2. Configure the PostgreSQL Connection
# Vault connects to PostgreSQL using a superuser role to manage dynamic roles
vault write database/config/postgresql \
    plugin_name="postgresql-database-plugin" \
    allowed_roles="healthgov-app" \
    connection_url="postgresql://{{username}}:{{password}}@postgres.healthgov.svc.cluster.local:5432/healthgov?sslmode=verify-full" \
    username="vault_admin" \
    password="vault_admin_secure_password"

# 3. Create the Role with a 1-Hour TTL
# This role dynamically creates a PostgreSQL user, grants privileges, and sets a 1-hour lease
vault write database/roles/healthgov-app \
    db_name="postgresql" \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
                         GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
                         GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

echo "Successfully configured Vault Database Secrets Engine with 1-hour credential rotation!"
