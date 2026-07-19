# Stakeholder control mapping

| Capability | HIPAA | GDPR | NHS DSPT | ISO 27001 / SOC 2 | Evidence source |
|---|---|---|---|---|---|
| Tenant RBAC and MFA | 164.312(a,d) | Arts. 25, 32 | 8.3 | A.5.15 / CC6 | IdP policy, assignment review |
| Immutable audit chain | 164.312(b) | Arts. 5, 30, 32 | 6, 7 | A.8.15 / CC7 | Audit hash manifest, object lock |
| Encryption and keys | 164.312(e) | Art. 32 | 9 | A.8.24 / CC6 | KMS config, rotation evidence |
| Vulnerability gates | 164.308(a) | Art. 32 | 7.2 | A.8.8 / CC7 | Semgrep, Trivy, Snyk, Checkov |
| Incident response | 164.308(a)(6) | Arts. 33, 34 | 6.1 | A.5.24 / CC7 | Exercise and incident records |
| Backup and recovery | 164.308(a)(7) | Arts. 5, 32 | 10.1 | A.8.13 / A1 | Restore test evidence |
| Supplier governance | 164.308(b) | Art. 28 | 10 | A.5.19 / CC9 | vendor review, contracts |
| Data minimization | 164.502(b) | Art. 5 | 1 | A.5.34 / C1 | tokenization, export policy |

This mapping accelerates evidence collection but does not replace legal advice, a HIPAA
risk analysis, a GDPR DPIA, an NHS DSP Toolkit submission, an ISO certification audit, or a
SOC 2 examination.
