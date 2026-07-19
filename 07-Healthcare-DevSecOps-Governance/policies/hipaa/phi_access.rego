package healthgov.hipaa.phi_access

import rego.v1

default allow := false

clinical_roles := {"clinician", "nurse", "privacy_officer"}
valid_purposes := {"treatment", "payment", "operations", "legal", "patient_request"}

allow if {
	input.authenticated
	count(input.user.roles & clinical_roles) > 0
	input.purpose_of_use in valid_purposes
	input.resource.classification == "PHI"
	input.transport.tls_version >= "1.2"
	input.audit_enabled
}

violations contains "HIPAA: authenticated identity required" if not input.authenticated
violations contains "HIPAA: role is not authorized for PHI" if count(input.user.roles & clinical_roles) == 0
violations contains "HIPAA: valid purpose-of-use required" if not input.purpose_of_use in valid_purposes
violations contains "HIPAA: PHI access must be audited" if not input.audit_enabled
violations contains "HIPAA: TLS 1.2 or later required" if input.transport.tls_version < "1.2"

