package healthgov.nhs_dspt.toolkit_test

import data.healthgov.nhs_dspt.toolkit
import rego.v1

test_compliant_state if {
  toolkit.allow with input as {
    "governance": {"caldicott_guardian": true},
    "workforce": {"training_completion_percent": 98},
    "assets": {"unsupported_critical": 0},
    "incident_response": {"tested_last_12_months": true},
    "vulnerabilities": {"critical_over_sla": 0},
    "access": {"privileged_mfa": true},
    "resilience": {"recovery_tested": true},
  }
}
