package healthgov.soc2.tsc_coverage

import rego.v1

default allow := false
allow if count(violations) == 0

violations contains "Security common criteria must always be in scope" if not input.categories.security
violations contains "Selected Trust Service categories require complete control mapping" if input.unmapped_selected_criteria > 0
violations contains "Control owner attestations are overdue" if input.overdue_attestations > 0
violations contains "Evidence samples must cover the audit period" if input.audit_period_coverage_percent < 100
violations contains "Exceptions require disposition before readiness" if input.unresolved_exceptions > 0
