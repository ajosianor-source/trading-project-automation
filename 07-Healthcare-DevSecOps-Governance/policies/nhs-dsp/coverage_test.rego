package healthgov.nhs_dspt.coverage_test

import data.healthgov.nhs_dspt.coverage
import rego.v1

test_complete_profile if {
  coverage.allow with input as {
    "framework_version": "2025-26-v8",
    "applicable_evidence_items": 20,
    "mapped_evidence_items": 20,
    "stale_mandatory_evidence": 0,
    "overdue_critical_actions": 0,
    "independent_assessment_required": false,
    "independent_assessment_complete": false,
  }
}
