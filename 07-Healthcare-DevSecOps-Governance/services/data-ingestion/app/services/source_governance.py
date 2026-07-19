from app.models.sources import AccessTier, EthicalSource, SourceAssessment
import structlog

log = structlog.get_logger()

SOURCES = {
    "synthea": EthicalSource(
        source_id="synthea",
        name="Synthea synthetic patients",
        modalities=["FHIR_R4", "HL7_V2"],
        access_tier=AccessTier.synthetic,
        license="Apache-2.0",
        homepage="https://github.com/synthetichealth/synthea",
    ),
    "nhs-synthetic": EthicalSource(
        source_id="nhs-synthetic",
        name="NHS Synthetic Data",
        modalities=["FHIR_R4"],
        access_tier=AccessTier.synthetic,
        license="OGL-3.0",
        homepage="https://digital.nhs.uk/services/synthetic-data",
    ),
    "cms-synthetic": EthicalSource(
        source_id="cms-synthetic",
        name="CMS Synthetic Medicare Data",
        modalities=["FHIR_R4"],
        access_tier=AccessTier.synthetic,
        license="CC0-1.0",
        homepage="https://www.cms.gov/Research-Statistics-Data-and-Systems/Downloadable-Public-Use-Files/SynPUFs",
    ),
    "private-hapi": EthicalSource(
        source_id="private-hapi",
        name="Private HAPI FHIR",
        modalities=["FHIR_R4"],
        access_tier=AccessTier.synthetic,
        license="Apache-2.0",
        homepage="https://github.com/hapifhir/hapi-fhir-jpaserver-starter",
        restrictions=["Synthetic data only in local and shared test environments"],
    ),
    "tcia": EthicalSource(
        source_id="tcia",
        name="TCIA TCGA-LUAD Version 4",
        modalities=["DICOM"],
        access_tier=AccessTier.public_deidentified,
        license="TCIA_DATA_USAGE_POLICY",
        homepage="https://www.cancerimagingarchive.net/collection/tcga-luad/",
        attribution_required=True,
        restrictions=[
            "Approved collection only: DOI 10.7937/K9/TCIA.2016.JGNIHEP5",
            "Collection attribution and TCIA Data Usage Policy must be recorded",
            "No re-identification",
        ],
    ),
    "physionet-bidmc": EthicalSource(
        source_id="physionet-bidmc",
        name="BIDMC PPG and Respiration Dataset",
        modalities=["IOMT", "ECG", "PPG"],
        access_tier=AccessTier.public_deidentified,
        license="ODC-By-1.0",
        homepage="https://physionet.org/content/bidmc/1.0.0/",
        attribution_required=True,
    ),
    "mimic-iv": EthicalSource(
        source_id="mimic-iv",
        name="MIMIC-IV",
        modalities=["ICU"],
        access_tier=AccessTier.controlled_research,
        license="PHYSIONET_CREDENTIALLED_HEALTH_DATA_DUA",
        homepage="https://physionet.org/content/mimiciv/",
        attribution_required=True,
        credential_required=True,
        dua_required=True,
        enabled=False,
        restrictions=[
            "Human-subjects training and PhysioNet credentialing required",
            "No transfer to unapproved third-party services",
        ],
    ),
}


class SourceGovernance:
    def list(self) -> list[EthicalSource]:
        return list(SOURCES.values())

    def assess(self, source_id: str, approval_reference: str | None = None, license_accepted: bool = False, doi: str | None = None) -> SourceAssessment:
        if source_id not in SOURCES:
            return SourceAssessment(allowed=False, source=None, reasons=[f"Unknown source: {source_id}"])

        source = SOURCES[source_id]
        reasons: list[str] = []

        # Rule 1: Synthetic datasets (Synthea, NHS, CMS) -> auto-ingest allowed
        if source.access_tier == AccessTier.synthetic:
            return SourceAssessment(allowed=True, source=source)

        # Rule 2: De-identified datasets (BIDMC, TCIA) -> auto-ingest only after license + DOI recorded
        if source.access_tier == AccessTier.public_deidentified:
            if not license_accepted:
                reasons.append(f"License acceptance is required for de-identified dataset: {source_id}")
            if source_id == "tcia" and not doi:
                reasons.append("DOI is required for TCIA DICOM collection")
            return SourceAssessment(allowed=not reasons, source=source, reasons=reasons)

        # Rule 3: Restricted datasets (MIMIC-IV) -> ingestion blocked until DUA + credentialing approved
        if source_id == "mimic-iv":
            controlled_approval = (
                approval_reference is not None
                and all(
                    marker in approval_reference
                    for marker in ("DUA:", "CREDENTIAL:", "GOVERNANCE:")
                )
            )
            if not controlled_approval:
                # Log audit event to SIEM
                log.error(
                    "mimic_iv_ingestion_blocked_governance_gate",
                    source_id=source_id,
                    reason="DUA + credentialing required",
                    action="blocked",
                )
                # Notify security + clinical governance (simulated via structured logging)
                log.critical(
                    "security_alert_unauthorized_mimic_iv_ingestion_attempt",
                    source_id=source_id,
                    severity="critical",
                )
                reasons.append("MIMIC-IV ingestion is strictly blocked until DUA + credentialing are approved")
            
            source_copy = source.model_copy(
                update={
                    "approval_reference": approval_reference or source.approval_reference,
                    "enabled": source.enabled or controlled_approval,
                }
            )
            return SourceAssessment(allowed=not reasons, source=source_copy, reasons=reasons)

        return SourceAssessment(allowed=not reasons, source=source, reasons=reasons)

    def require(self, source_id: str, approval_reference: str | None = None, license_accepted: bool = False, doi: str | None = None) -> EthicalSource:
        assessment = self.assess(source_id, approval_reference, license_accepted, doi)
        if not assessment.allowed:
            raise PermissionError("; ".join(assessment.reasons))
        return assessment.source
