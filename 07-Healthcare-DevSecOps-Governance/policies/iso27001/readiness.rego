package healthgov.iso27001.readiness

import rego.v1

default allow := false
allow if count(violations) == 0

violations contains "ISO 27001 A.5.1: security policies require approval" if not input.policies.approved
violations contains "ISO 27001 A.5.15: access control policy required" if not input.access.policy_defined
violations contains "ISO 27001 A.8.8: vulnerability remediation SLA exceeded" if input.vulnerabilities.over_sla > 0
violations contains "ISO 27001 A.8.15: security events must be logged" if not input.logging.enabled
violations contains "ISO 27001 A.8.24: cryptographic controls required" if not input.encryption.customer_managed_keys
violations contains "ISO 27001 Clause 6.1: treatment plan required for high risks" if input.risk.high_without_treatment > 0
