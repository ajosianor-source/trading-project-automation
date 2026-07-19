# Security operations

## Identity and access

Federate enterprise identity through OIDC with phishing-resistant MFA. Access tokens must be RS256,
five minutes or shorter, audience-restricted, and carry mapped roles. Every PHI request includes
`X-Purpose-Of-Use`. Break-glass access requires justification, expires automatically, and alerts the SOC.

## Key and secret lifecycle

Generate data-encryption keys through KMS envelope encryption. Rotate KMS keys yearly and application
secrets at least every 90 days. Store only secret references in configuration. Re-encrypt asynchronously
after rotation and keep old key versions only for the approved retention period.

## PHI handling rules

- Never place raw PHI in logs, traces, URLs, metrics labels, exception text, or CI artifacts.
- Tokenize identifiers before analytics or non-production use.
- Bind AEAD associated data to tenant, resource type, and schema version to prevent ciphertext swapping.
- Reject PHI reads without identity, role, purpose, and a healthy audit path.
- Apply minimum necessary access and quarterly access reviews.

## Vulnerability policy

Critical or high exploitable findings block release. Exceptions require a time-bound risk acceptance signed
by the service owner and security. SBOMs, signatures, provenance, scan reports, and policy results are
retained as release evidence.

## Shared responsibility

This scaffold supplies technical controls, not automatic regulatory certification. Privacy, legal, and
security owners must validate data flows, BAAs/DPAs, retention, residency, incident procedures, and control
effectiveness for each deployment.

