package healthgov.saas.plugin

import rego.v1

prohibited := {"cluster.admin", "secrets.read_all", "tenants.cross_access"}
default allow := false

allow if count(violations) == 0

violations contains "plugin image must be digest-pinned" if not contains(input.image, "@sha256:")
violations contains "plugin signature verification required" if not input.signature_verified
violations contains "plugin must use a sandboxed runtime" if input.runtime_class != "gvisor"
violations contains "plugin requests prohibited permission" if count(input.permissions & prohibited) > 0
violations contains "PHI permission must be explicit" if {
	input.processes_phi
	not "phi.process" in input.permissions
}

