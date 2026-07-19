package healthgov.hipaa.break_glass

import rego.v1

default allow := false

allow if {
  input.authenticated
  input.requested == true
  input.reason != ""
  input.incident_reference != ""
  input.duration_minutes <= 30
  input.duration_minutes > 0
  input.user.roles["clinician"]
  input.audit_synchronous == true
  input.notification_targets.security == true
  input.notification_targets.privacy == true
}

violations contains "Break-glass reason and incident reference are required" if {
  input.requested == true
  input.reason == ""
}
violations contains "Break-glass reason and incident reference are required" if {
  input.requested == true
  input.incident_reference == ""
}
violations contains "Break-glass duration must not exceed 30 minutes" if input.duration_minutes > 30
violations contains "Break-glass requires synchronous audit" if input.audit_synchronous != true
violations contains "Security and privacy notification is required" if {
  input.notification_targets.security != true
}
violations contains "Security and privacy notification is required" if {
  input.notification_targets.privacy != true
}
