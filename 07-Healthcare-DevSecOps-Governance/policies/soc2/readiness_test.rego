package healthgov.soc2.readiness_test

import data.healthgov.soc2.readiness
import rego.v1

test_compliant_state if {
  readiness.allow with input as {
    "access": {"review_age_days": 30},
    "monitoring": {"continuous": true},
    "incident_response": {"exercise_age_days": 120},
    "changes": {"unapproved": 0},
    "availability": {"recovery_tested": true},
    "processing": {"unresolved_exceptions": 0},
  }
}
