package healthgov.healthcare.data_source_governance_test

import data.healthgov.healthcare.data_source_governance
import rego.v1

test_synthetic_allowed if {
	data_source_governance.allow with input as {
		"access_tier": "SYNTHETIC",
		"reidentification_prohibited": true,
		"attribution_required": false,
		"attribution_reference": "",
	}
}

test_mimic_blocked_without_dua if {
	not data_source_governance.allow with input as {
		"access_tier": "CONTROLLED_RESEARCH",
		"credential_verified": false,
		"dua_reference": "",
		"approved_purpose": "",
		"third_party_transfer": false,
	}
}

test_public_requires_attribution if {
	not data_source_governance.allow with input as {
		"access_tier": "PUBLIC_DEIDENTIFIED",
		"reidentification_prohibited": true,
		"attribution_required": true,
		"attribution_reference": "",
	}
}
