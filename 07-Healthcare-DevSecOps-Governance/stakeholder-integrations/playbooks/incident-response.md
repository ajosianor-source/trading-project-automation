# Incident response playbooks

Every action must preserve patient safety, clinical availability, chain of custody, and
tenant isolation. Automation may contain systems but cannot make clinical safety or
regulatory notification decisions without an authorized human.

## PHI exposure

1. Validate the alert and assign severity using volume, sensitivity, identifiability,
   jurisdiction, and patient-safety impact.
2. Revoke the affected session or service credential and block the observed access path.
3. Preserve gateway, application, FHIR, database, and object-access logs using immutable
   object lock. Record hashes in the audit chain.
4. Identify subjects, purposes of use, resources, recipients, and cross-border transfers.
5. Notify the privacy officer, DPO, legal counsel, and clinical safety owner.
6. Start HIPAA/GDPR/NHS breach assessment clocks; counsel determines notification duties.
7. Restore access using least privilege and monitor for recurrence.

## IoMT compromise

1. Confirm device identity, firmware, network segment, and clinical dependency.
2. Coordinate with clinical engineering before isolation; unsafe disconnection can harm
   patients.
3. Quarantine through the medical-device VLAN or gateway, retaining safe clinical
   functionality where approved.
4. Capture attestation, certificate chain, firmware hash, telemetry, network flows, and
   manufacturer advisories.
5. Rotate device credentials and deploy signed firmware only after manufacturer and
   clinical engineering approval.
6. Assess ISO 14971 risk-control effectiveness and medical-device reporting obligations.

## AI model integrity or drift

1. Freeze the model version, feature pipeline, dataset version, prompts, and inference logs.
2. Route decisions to the approved fallback or human review workflow.
3. Re-run signature, SBOM, adversarial, subgroup, drift, privacy, and provenance checks.
4. Compare affected population and clinical outcomes against approved intended use.
5. Require clinical safety, quality, privacy, and model-owner approval before redeployment.

## Forensic capture manifest

Capture only references and cryptographic hashes in tickets:

```json
{
  "incident_id": "INC-...",
  "tenant_id": "derived-from-token",
  "time_window": {"start": "...", "end": "..."},
  "artifacts": [
    {"type": "gateway-log", "uri": "immutable://...", "sha256": "..."}
  ],
  "collector_identity": "...",
  "legal_hold": false
}
```

Never paste PHI, access tokens, signing keys, raw DICOM pixels, or complete HL7 messages
into Slack, email, Jira, or ServiceNow.
