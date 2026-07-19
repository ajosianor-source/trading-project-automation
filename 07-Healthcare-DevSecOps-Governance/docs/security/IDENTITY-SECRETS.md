# Production identity and secrets

The production pilot uses Microsoft Entra ID; Okta or Keycloak may be substituted only after
the same controls pass. Browser authentication is authorization-code OAuth 2.0/OIDC with S256
PKCE through the portal BFF. Access tokens last ten minutes, remain server-side, and contain
tenant, role, authentication-strength and purpose-compatible claims. Conditional Access
requires FIDO2/passkeys or certificate authentication. SMS and password-only access are denied.
SMART on FHIR authorization uses a separate audience and least-privilege launch/user/patient
scopes. Break-glass identities are cloud-only, hardware-key protected, excluded from routine
use, monitored continuously and reviewed after every activation.

The local BFF and `/api/auth/staging-login` are staging-only and fail closed unless explicitly
enabled. Production environment validation rejects either component.

External Secrets Operator obtains runtime values using EKS workload identity. Terraform creates
secret containers but never secret values. Database credentials use short-lived dynamic
credentials where supported; certificates rotate at 30 days with overlap; signing keys rotate
at 90 days or immediately after suspected compromise. Rotation is tested in staging before
promotion and raises an alert if secret age exceeds policy.

## Joiner, mover, leaver

| Event | Automated action | Approval | Maximum completion |
|---|---|---|---|
| Joiner | HR event creates identity with no platform role | Manager + data owner | Before start |
| Mover | Recalculate group/role grants; remove conflicting access first | Old/new managers | 4 hours |
| Leaver | Revoke sessions, groups, tokens, certificates and device trust | HR authoritative | 15 minutes |
| Privileged grant | Time-bound PIM activation with purpose and ticket | Security owner | Just in time |

Quarterly access certification covers every role and tenant. Joy Abu is mapped to
`security_admin`, not a universal application superuser. Emergency access never bypasses audit,
purpose-of-use capture, tenant scope or post-event review.
