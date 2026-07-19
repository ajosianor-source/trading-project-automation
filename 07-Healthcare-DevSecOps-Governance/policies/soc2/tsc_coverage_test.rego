package healthgov.soc2.tsc_coverage_test

import data.healthgov.soc2.tsc_coverage
import rego.v1

test_ready if {
  tsc_coverage.allow with input as {
    "categories": {"security": true},
    "unmapped_selected_criteria": 0,
    "overdue_attestations": 0,
    "audit_period_coverage_percent": 100,
    "unresolved_exceptions": 0,
  }
}
