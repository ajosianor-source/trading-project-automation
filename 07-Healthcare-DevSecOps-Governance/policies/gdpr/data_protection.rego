package healthgov.gdpr.data_protection

import rego.v1

default allow := false

lawful_bases := {"consent", "contract", "legal_obligation", "vital_interests", "public_task", "legitimate_interests"}

allow if count(violations) == 0

violations contains "GDPR Art. 5: lawful basis is required" if not input.processing.lawful_basis in lawful_bases
violations contains "GDPR Art. 5: purpose limitation is required" if input.processing.purpose == ""
violations contains "GDPR Art. 5: retention period must be defined" if input.processing.retention_days <= 0
violations contains "GDPR Art. 25/32: personal data must be encrypted" if {
	input.data.personal
	not input.controls.encrypted
}
violations contains "GDPR Art. 25: production data must not be used in non-production" if {
	input.environment != "production"
	input.data.source == "production"
	not input.data.tokenized
}
violations contains "GDPR Art. 44: transfer mechanism required" if {
	input.processing.cross_border
	input.processing.transfer_mechanism == ""
}

