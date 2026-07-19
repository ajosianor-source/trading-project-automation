package healthgov.iso27001.annex_a_coverage_test

import data.healthgov.iso27001.annex_a_coverage
import rego.v1

test_complete_soa if {
  annex_a_coverage.allow with input as {
    "annex_a_control_count": 93,
    "statement_of_applicability_approved": true,
    "unjustified_exclusions": 0,
    "unowned_risk_treatments": 0,
    "internal_audit_age_days": 100,
    "management_review_age_days": 100,
  }
}
