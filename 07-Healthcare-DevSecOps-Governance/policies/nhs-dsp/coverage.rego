package healthgov.nhs_dspt.coverage

import rego.v1

default allow := false
allow if count(violations) == 0

violations contains "DSPT profile must be 2025-26 Version 8" if input.framework_version != "2025-26-v8"
violations contains "All applicable DSPT evidence items must be mapped" if input.applicable_evidence_items != input.mapped_evidence_items
violations contains "Mandatory DSPT evidence must be current" if input.stale_mandatory_evidence > 0
violations contains "DSPT critical improvement actions must be closed" if input.overdue_critical_actions > 0
violations contains "Independent assessment is required for this organisation profile" if {
  input.independent_assessment_required
  not input.independent_assessment_complete
}
