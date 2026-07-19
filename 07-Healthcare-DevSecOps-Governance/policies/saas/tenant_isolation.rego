package healthgov.saas.tenant_isolation

import rego.v1

default allow := false

allow if {
	input.token.tenant_id != ""
	input.token.tenant_id == input.resource.tenant_id
	input.database.rls_enabled
	input.events.tenant_keyed
}

violations contains "tenant claim is required" if input.token.tenant_id == ""
violations contains "cross-tenant access denied" if input.token.tenant_id != input.resource.tenant_id
violations contains "PostgreSQL RLS must be enabled" if not input.database.rls_enabled
violations contains "events must carry authenticated tenant context" if not input.events.tenant_keyed

