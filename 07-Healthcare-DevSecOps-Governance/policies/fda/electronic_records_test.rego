package healthgov.fda.electronic_records_test

import data.healthgov.fda.electronic_records
import rego.v1

test_compliant_record if {
	electronic_records.allow with input as {
		"validation": {"approved": true},
		"records": {"exportable": true, "retention_days": 3650},
		"access": {"role_enforced": true, "authority_checked": true},
		"audit": {"enabled": true, "immutable": true},
		"documents": {"version_controlled": true},
		"signature": {
			"required": true,
			"includes_name_date_meaning": true,
			"cryptographically_linked": true,
		},
	}
}

