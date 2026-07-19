package healthgov.hipaa.phi_access_test

import data.healthgov.hipaa.phi_access
import rego.v1

test_clinician_treatment_allowed if {
	phi_access.allow with input as {
		"authenticated": true,
		"user": {"roles": {"clinician"}},
		"purpose_of_use": "treatment",
		"resource": {"classification": "PHI"},
		"transport": {"tls_version": "1.3"},
		"audit_enabled": true,
	}
}

test_missing_audit_denied if {
	not phi_access.allow with input as {
		"authenticated": true,
		"user": {"roles": {"clinician"}},
		"purpose_of_use": "treatment",
		"resource": {"classification": "PHI"},
		"transport": {"tls_version": "1.3"},
		"audit_enabled": false,
	}
}

