package healthgov.iso14971.risk_management_test

import data.healthgov.iso14971.risk_management
import rego.v1

test_missing_postmarket_denied if {
	not risk_management.allow with input as {
		"plan": {"approved": true},
		"hazards": [{"id": "H-1"}],
		"controls": {"options_analyzed": true, "verified": true},
		"residual_risk": {"evaluated": true, "unacceptable": false},
		"benefit_risk": {"approved": false},
		"overall_risk": {"approved": true},
		"post_market": {"monitoring_enabled": false},
	}
}

