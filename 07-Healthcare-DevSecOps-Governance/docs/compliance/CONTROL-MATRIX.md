# Compliance control matrix

| Platform control | HIPAA | GDPR | FDA 21 CFR Part 11 | ISO 13485 | ISO 14971 | Evidence |
|---|---|---|---|---|---|---|
| OIDC, MFA, RBAC, purpose | 164.312(a,d) | Arts. 5, 25, 32 | 11.10(d,g) | 4.1.6 | 7.2 | Auth and OPA decisions |
| PHI AEAD encryption/tokenization | 164.312(a,e) | Arts. 25, 32 | 11.10(c) | 4.2.5 | 7.2 | KMS logs, config scan |
| Immutable audit trail | 164.312(b) | Arts. 5(2), 30 | 11.10(e), 11.50 | 4.2.5 | 9, 10 | Hash-chain and object-lock report |
| Signed release/provenance | 164.308(a)(8) | Art. 32 | 11.10(a,k) | 7.3, 7.5.6 | 7.2 | SBOM, signature, provenance |
| Design traceability and approvals | 164.308 | Art. 25 | 11.10(k) | 7.3 | 4–8 | Approved trace matrix |
| Hazard and post-market monitoring | 164.308(a)(1) | Art. 35 | 11.10(a) | 8.2, 8.5 | 4–10 | Risk file, CAPA, alerts |
| De-identification | 164.514 | Arts. 5, 25 | N/A | 7.3.7 | 5, 7 | Privacy report |
| Medical-device identity/attestation | 164.312(d) | Art. 32 | 11.10(d) | 7.5.6 | 6, 7 | Enrollment and attestation |
| Backup/recovery validation | 164.308(a)(7) | Arts. 32, 33 | 11.10(c) | 6.3, 6.4 | 7.2, 10 | Restore exercise |

This matrix is a control-design aid, not a declaration of conformity. Control owners must document scope,
implementation, operating effectiveness, exceptions, evidence retention, and jurisdictional applicability.

