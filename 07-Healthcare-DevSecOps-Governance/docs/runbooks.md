# Security runbooks

## Denied PHI access

1. Preserve the alert and correlated audit IDs; do not export raw PHI.
2. Validate identity, source, purpose-of-use, and affected resources.
3. Disable the session or identity if compromise is suspected.
4. Notify the privacy incident lead and follow the approved breach assessment procedure.

## Audit outage

1. Confirm service, queue, storage, and SIEM health.
2. PHI endpoints must fail closed. Do not bypass the audit dependency.
3. Restore from the last known signed configuration and verify event-chain continuity.
4. Record the gap assessment and obtain privacy/security approval before reopening PHI access.

## OPA outage

1. Confirm bundle validity and OPA health.
2. Keep deployment and sensitive data operations blocked.
3. Roll back the policy bundle to the last signed, tested version.
4. Re-run policy tests and capture evidence before resuming.

## Clinical interface failure

1. Stop automatic retries if they can create duplicate orders, results, or patient merges.
2. Preserve message digests and routing metadata without copying PHI into the incident channel.
3. Validate source identity, schema/profile, sequence, acknowledgements, and downstream availability.
4. Reconcile with the clinical system of record before replay; require a two-person approval for bulk replay.

## Clinical model drift

1. Route the affected model to a safe state defined in its clinical safety case.
2. Preserve model, dataset, feature, prediction and monitoring versions.
3. Clinical safety determines whether use is paused; engineering must not silently change thresholds.
4. Revalidate subgroup performance, intended use and human oversight before promotion.

## Credential attack

1. Correlate failures by subject, tenant, source network, device posture, and request ID.
2. Revoke affected sessions and credentials; rotate signing material if issuer compromise is possible.
3. Preserve identity-provider and gateway evidence in immutable storage without copying PHI.
4. Require phishing-resistant re-authentication and security approval before restoring access.

## Audit integrity failure

1. Quarantine the affected audit partition and preserve its object-lock retention state.
2. Compare chain heads with the independently stored signed checkpoint and SIEM copy.
3. Treat unexplained divergence as a security incident; do not repair or delete original records.
4. Restore append-only service only after forensics and privacy owners approve the evidence gap.

## Policy denial spike

1. Determine whether denials represent an attack, drift, or a newly signed policy bundle.
2. Keep sensitive operations fail-closed and roll back only to the last signed approved bundle.
3. Correlate the OPA decision ID with gateway, deployment, identity, and audit records.
4. Re-run policy tests and record two-person approval before resuming blocked workflows.

## Tenant boundary violation

1. Preserve request, identity, tenant, policy-decision and trace identifiers; never copy PHI.
2. Revoke the requesting session and isolate the affected workload while scope is determined.
3. Verify database RLS, cache keys, Kafka partitions and object prefixes for both tenants.
4. Notify security and privacy, perform breach assessment, and require independent validation
   of tenant isolation before service restoration.
