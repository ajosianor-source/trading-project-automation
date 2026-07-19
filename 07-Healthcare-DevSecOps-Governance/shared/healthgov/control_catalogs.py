from healthgov.frameworks import Control


def _series(prefix: str, count: int, domain: str, evidence: tuple[str, ...]) -> tuple[Control, ...]:
    return tuple(
        Control(f"{prefix}.{number}", domain, f"{domain} control {prefix}.{number}", evidence)
        for number in range(1, count + 1)
    )


# ISO/IEC 27001:2022 Annex A complete identifier coverage: 37 organizational,
# 8 people, 14 physical, and 34 technological controls (93 total). Licensed
# standard text is intentionally not reproduced.
ISO27001_CONTROLS = (
    _series("A.5", 37, "Organizational", ("policy", "risk_record", "approval"))
    + _series("A.6", 8, "People", ("training", "screening", "offboarding"))
    + _series("A.7", 14, "Physical", ("site_review", "access_log", "maintenance"))
    + _series("A.8", 34, "Technological", ("configuration", "scan", "monitoring"))
)

# NHS DSP Toolkit 2025-26 Version 8 profile. Exact evidence applicability varies
# by organisation type, so profile-specific evidence packs are imported at runtime.
DSP_CONTROLS = tuple(
    Control(control_id, domain, title, evidence)
    for control_id, domain, title, evidence in [
        (
            "1.1",
            "People",
            "Personal confidential data is handled safely",
            ("IG policy", "Caldicott accountability"),
        ),
        (
            "1.2",
            "People",
            "Staff understand data-security responsibilities",
            ("training plan", "completion report"),
        ),
        (
            "1.3",
            "People",
            "Annual data-security training is complete",
            ("95 percent completion", "exceptions"),
        ),
        ("2.1", "People", "Staff pass appropriate security checks", ("screening records",)),
        (
            "3.1",
            "Process",
            "Data-security incidents are managed",
            ("incident plan", "exercise report"),
        ),
        (
            "4.1",
            "Technology",
            "Critical IT assets are inventoried",
            ("asset inventory", "ownership"),
        ),
        (
            "4.2",
            "Technology",
            "Unsupported systems are eliminated or isolated",
            ("support status", "exception plan"),
        ),
        (
            "5.1",
            "Process",
            "Continuity plans protect health and care services",
            ("BCP", "clinical safety impact"),
        ),
        (
            "6.1",
            "Process",
            "Cyber incidents are detected and responded to",
            ("IR test", "SIEM evidence"),
        ),
        ("6.3", "Process", "Lessons from incidents improve controls", ("post-incident reviews",)),
        (
            "7.1",
            "Technology",
            "Vulnerabilities are identified",
            ("authenticated scans", "asset coverage"),
        ),
        (
            "7.2",
            "Technology",
            "Critical vulnerabilities meet remediation SLA",
            ("remediation report",),
        ),
        (
            "8.1",
            "Technology",
            "User accounts are uniquely assigned",
            ("identity inventory", "joiner mover leaver"),
        ),
        ("8.3", "Technology", "Privileged access uses MFA", ("MFA configuration", "access review")),
        (
            "9.1",
            "Technology",
            "Network boundaries and data flows are protected",
            ("network diagram", "firewall review"),
        ),
        (
            "9.4",
            "Process",
            "Independent assurance is completed where required",
            ("audit report", "improvement plan"),
        ),
        ("10.1", "Technology", "Backups and recovery are tested", ("restore evidence", "RPO RTO")),
    ]
)

SOC2_CONTROLS = (
    _series("CC1", 5, "Control environment", ("governance evidence", "oversight record"))
    + _series("CC2", 3, "Communication", ("policy communication", "external communication"))
    + _series("CC3", 4, "Risk assessment", ("risk assessment", "fraud assessment"))
    + _series("CC4", 2, "Monitoring", ("control monitoring", "deficiency remediation"))
    + _series("CC5", 3, "Control activities", ("control design", "technology controls"))
    + _series("CC6", 8, "Logical and physical access", ("access review", "MFA evidence"))
    + _series("CC7", 5, "System operations", ("monitoring", "incident evidence"))
    + _series("CC8", 1, "Change management", ("approved change", "test evidence"))
    + _series("CC9", 2, "Risk mitigation", ("vendor review", "business disruption plan"))
    + _series("A1", 3, "Availability", ("capacity", "backup", "recovery test"))
    + _series("C1", 2, "Confidentiality", ("classification", "disposal"))
    + _series("PI1", 5, "Processing integrity", ("quality control", "exception reconciliation"))
    + _series("P1", 1, "Privacy notice", ("privacy notice",))
    + _series("P2", 1, "Choice and consent", ("consent record",))
    + _series("P3", 2, "Collection", ("collection limitation", "source inventory"))
    + _series("P4", 3, "Use retention and disposal", ("purpose register", "retention evidence"))
    + _series("P5", 2, "Access", ("data subject workflow", "identity verification"))
    + _series("P6", 7, "Disclosure", ("disclosure register", "processor agreement"))
    + _series("P7", 1, "Quality", ("correction workflow",))
    + _series("P8", 1, "Privacy monitoring", ("privacy control review",))
)
