package healthgov.iso13485.quality_system

import rego.v1

default allow := false
allow if count(violations) == 0

violations contains "ISO 13485 4.2.4: document approval required" if not input.document.approved
violations contains "ISO 13485 4.2.5: record retention defined required" if input.document.retention_days <= 0
violations contains "ISO 13485 6.2: trained approver required" if not input.approver.training_current
violations contains "ISO 13485 7.3: design traceability required" if not input.design.traceability_complete
violations contains "ISO 13485 7.3.6: design verification evidence required" if not input.design.verification_passed
violations contains "ISO 13485 7.3.7: design validation evidence required" if not input.design.validation_passed
violations contains "ISO 13485 8.3: nonconforming output disposition required" if {
	input.nonconformance.exists
	input.nonconformance.disposition == ""
}
violations contains "ISO 13485 8.5.2: CAPA required for unresolved major issue" if {
	input.nonconformance.severity == "major"
	not input.capa.opened
}

