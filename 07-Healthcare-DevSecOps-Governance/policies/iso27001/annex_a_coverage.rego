package healthgov.iso27001.annex_a_coverage

import rego.v1

default allow := false
allow if count(violations) == 0

violations contains "ISO 27001:2022 Annex A comparison must cover all 93 controls" if input.annex_a_control_count != 93
violations contains "Statement of Applicability requires approval" if not input.statement_of_applicability_approved
violations contains "Excluded controls require risk-based justification" if input.unjustified_exclusions > 0
violations contains "ISMS risks require treatment owners and due dates" if input.unowned_risk_treatments > 0
violations contains "Internal audit programme is overdue" if input.internal_audit_age_days > 365
violations contains "Management review is overdue" if input.management_review_age_days > 365
