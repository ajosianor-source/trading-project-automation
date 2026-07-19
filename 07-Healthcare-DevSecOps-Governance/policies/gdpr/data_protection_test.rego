package healthgov.gdpr.data_protection_test

import data.healthgov.gdpr.data_protection
import rego.v1

test_compliant_processing if {
	data_protection.allow with input as {
		"environment": "production",
		"processing": {
			"lawful_basis": "legal_obligation",
			"purpose": "care_delivery",
			"retention_days": 2555,
			"cross_border": false,
		},
		"data": {"personal": true, "source": "production", "tokenized": false},
		"controls": {"encrypted": true},
	}
}

