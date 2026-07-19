package healthgov.fda.electronic_records

import rego.v1

default allow := false

allow if count(violations) == 0

violations contains "21 CFR 11.10(a): system validation evidence required" if not input.validation.approved
violations contains "21 CFR 11.10(b): records must be human-readable and exportable" if not input.records.exportable
violations contains "21 CFR 11.10(c): retention control is required" if input.records.retention_days <= 0
violations contains "21 CFR 11.10(d): system access must be limited" if not input.access.role_enforced
violations contains "21 CFR 11.10(e): secure, time-stamped audit trail required" if {
	not input.audit.enabled
}
violations contains "21 CFR 11.10(e): audit trail must be immutable" if not input.audit.immutable
violations contains "21 CFR 11.10(g): authority checks required" if not input.access.authority_checked
violations contains "21 CFR 11.10(k): controlled documentation required" if not input.documents.version_controlled
violations contains "21 CFR 11.50: signature manifestation incomplete" if {
	input.signature.required
	not input.signature.includes_name_date_meaning
}
violations contains "21 CFR 11.70: signature must be linked to its record" if {
	input.signature.required
	not input.signature.cryptographically_linked
}

