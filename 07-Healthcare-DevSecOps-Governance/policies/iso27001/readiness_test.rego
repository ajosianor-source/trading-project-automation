package healthgov.iso27001.readiness_test

import data.healthgov.iso27001.readiness
import rego.v1

test_compliant_state if {
  readiness.allow with input as {
    "policies": {"approved": true},
    "access": {"policy_defined": true},
    "vulnerabilities": {"over_sla": 0},
    "logging": {"enabled": true},
    "encryption": {"customer_managed_keys": true},
    "risk": {"high_without_treatment": 0},
  }
}
