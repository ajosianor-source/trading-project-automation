package healthgov.soc2.readiness

import rego.v1

default allow := false
allow if count(violations) == 0

violations contains "SOC 2 CC6: logical access review overdue" if input.access.review_age_days > 90
violations contains "SOC 2 CC7: security monitoring required" if not input.monitoring.continuous
violations contains "SOC 2 CC7: incident exercises required" if input.incident_response.exercise_age_days > 365
violations contains "SOC 2 CC8: production change approval required" if input.changes.unapproved > 0
violations contains "SOC 2 A1: availability objectives require tested recovery" if not input.availability.recovery_tested
violations contains "SOC 2 PI1: processing integrity exceptions unresolved" if input.processing.unresolved_exceptions > 0
