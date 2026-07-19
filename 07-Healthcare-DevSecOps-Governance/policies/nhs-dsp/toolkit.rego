package healthgov.nhs_dspt.toolkit

import rego.v1

default allow := false

allow if count(violations) == 0

violations contains "NHS DSPT 1.1: accountable data security leadership required" if not input.governance.caldicott_guardian
violations contains "NHS DSPT 1.3: annual staff training evidence required" if input.workforce.training_completion_percent < 95
violations contains "NHS DSPT 4.2: unsupported critical systems prohibited" if input.assets.unsupported_critical > 0
violations contains "NHS DSPT 6.1: tested incident response plan required" if not input.incident_response.tested_last_12_months
violations contains "NHS DSPT 7.2: critical vulnerabilities require remediation" if input.vulnerabilities.critical_over_sla > 0
violations contains "NHS DSPT 8.3: privileged access must use MFA" if not input.access.privileged_mfa
violations contains "NHS DSPT 10.1: continuity recovery test required" if not input.resilience.recovery_tested
