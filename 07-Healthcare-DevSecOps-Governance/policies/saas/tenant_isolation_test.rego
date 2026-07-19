package healthgov.saas.tenant_isolation_test

import data.healthgov.saas.tenant_isolation
import rego.v1

test_cross_tenant_denied if {
	not tenant_isolation.allow with input as {
		"token": {"tenant_id": "hospital-a"},
		"resource": {"tenant_id": "hospital-b"},
		"database": {"rls_enabled": true},
		"events": {"tenant_keyed": true},
	}
}

