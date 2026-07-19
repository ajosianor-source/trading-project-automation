package healthgov.hipaa.break_glass_test

import data.healthgov.hipaa.break_glass
import rego.v1

test_approved_emergency_access if {
  break_glass.allow with input as {
    "authenticated": true,
    "requested": true,
    "reason": "Immediate treatment risk",
    "incident_reference": "INC-123",
    "duration_minutes": 15,
    "user": {"roles": {"clinician"}},
    "audit_synchronous": true,
    "notification_targets": {"security": true, "privacy": true},
  }
}

test_unbounded_emergency_access_denied if {
  not break_glass.allow with input as {
    "authenticated": true,
    "requested": true,
    "reason": "Emergency",
    "incident_reference": "INC-124",
    "duration_minutes": 120,
    "user": {"roles": {"clinician"}},
    "audit_synchronous": true,
    "notification_targets": {"security": true, "privacy": true},
  }
}
