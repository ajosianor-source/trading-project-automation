package healthgov.iso14971.risk_management

import rego.v1

default allow := false
allow if count(violations) == 0

violations contains "ISO 14971 4.4: risk management plan required" if not input.plan.approved
violations contains "ISO 14971 5.4: hazardous situations must be documented" if count(input.hazards) == 0
violations contains "ISO 14971 7.1: risk control options analysis required" if not input.controls.options_analyzed
violations contains "ISO 14971 7.2: risk control implementation evidence required" if not input.controls.verified
violations contains "ISO 14971 7.3: residual risk evaluation required" if not input.residual_risk.evaluated
violations contains "ISO 14971 7.5: benefit-risk analysis required" if {
	input.residual_risk.unacceptable
	not input.benefit_risk.approved
}
violations contains "ISO 14971 8: overall residual risk acceptance required" if not input.overall_risk.approved
violations contains "ISO 14971 10: production/post-production monitoring required" if not input.post_market.monitoring_enabled

