package healthgov.healthcare.data_source_governance

import rego.v1

default allow := false

approved_tiers := {"SYNTHETIC", "PUBLIC_DEIDENTIFIED"}

allow if {
	input.access_tier in approved_tiers
	input.reidentification_prohibited == true
	not missing_attribution
}

allow if {
	input.access_tier == "CONTROLLED_RESEARCH"
	input.credential_verified == true
	input.dua_reference != ""
	input.approved_purpose != ""
	input.third_party_transfer == false
}

missing_attribution if {
	input.attribution_required == true
	input.attribution_reference == ""
}

deny contains "live PHI is prohibited in shared test environments" if {
	input.environment != "production"
	input.access_tier == "LIVE_PHI"
}

deny contains "dataset attribution is required" if {
	missing_attribution
}

deny contains "controlled research data requires credentials and a DUA" if {
	input.access_tier == "CONTROLLED_RESEARCH"
	not allow
}
