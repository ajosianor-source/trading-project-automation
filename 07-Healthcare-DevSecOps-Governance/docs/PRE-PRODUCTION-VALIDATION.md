# HealthGov Pre-Production Security Validation & Operational Runbook

This document outlines the final steps required to validate, deploy, and operate the **HealthGov** platform in a production environment under **HIPAA, GDPR, and FDA** regulations.

---

## 1. Continuous Compliance & Policy-as-Code

### A. OPA Gatekeeper in Kubernetes
We have deployed **OPA Gatekeeper** in the Kubernetes cluster to enforce strict admission control rules at the API level.

#### Enforced Constraints:
1. **K8sReadOnlyRootFilesystem**: Rejects any pod that does not have `readOnlyRootFilesystem: true` configured in its security context.
2. **K8sDisallowPrivilegeEscalation**: Rejects any pod that has `allowPrivilegeEscalation: true` configured.
3. **Image Registry Restriction**: Rejects any container image that does not originate from your approved private registry (`ghcr.io/your-org/`).

To apply these constraints, run:
```bash
kubectl apply -f infra/kubernetes/base/gatekeeper-policies.yaml
```

### B. Automated Compliance Evidence Collection (WORM)
The `reporting-service` continuously aggregates signed compliance evidence from the PostgreSQL database and uploads it to an **AWS S3 bucket with Object Lock enabled**.

#### S3 Object Lock (WORM) Configuration:
```bash
# Create the S3 bucket with Object Lock enabled
aws s3api create-bucket \
    --bucket healthgov-compliance-evidence \
    --region us-east-1 \
    --object-lock-enabled-for-bucket

# Configure a default retention period of 7 years (2555 days) in Compliance mode
aws s3api put-object-lock-configuration \
    --bucket healthgov-compliance-evidence \
    --object-lock-configuration '{
        "ObjectLockEnabled": "Enabled",
        "Rule": {
            "DefaultRetention": {
                "Mode": "COMPLIANCE",
                "Days": 2555
            }
        }
    }'
```
*Note: In COMPLIANCE mode, the retention period cannot be shortened, and the objects cannot be deleted or overwritten by any user, including the root account, providing absolute tamper-evident proof for auditors.*

---

## 2. Observability, SIEM, & Incident Response

### A. Centralized Audit Logging
* **Application Logs**: All microservices use `structlog` to output structured JSON logs to `stdout`. These logs are collected by **FluentBit** and forwarded to **Wazuh** or **Splunk**.
* **Vault Audit Logs**: Enable Vault's file audit device to capture all cryptographic operations:
  ```bash
  vault audit enable file file_path=/vault/logs/audit.log
  ```

### B. Real-Time Prometheus & Grafana Alerts
Configure the following alert rules in your Prometheus setup (`observability/prometheus/alerts.yaml`):

```yaml
groups:
  - name: healthgov-security-alerts
    rules:
      # 1. Spike in 401/403 responses (Potential Brute Force or Token Expiration)
      - alert: HighUnauthorizedAccessSpike
        expr: sum(rate(http_requests_total{status=~"401|403"}[5m])) by (service) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High volume of unauthorized requests on {{ $labels.service }}"

      # 2. PHI Access without Purpose of Use
      - alert: PhiAccessWithoutPurpose
        expr: sum(rate(http_requests_total{path=~"/v1/phi/.*", purpose=""}[1m])) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "PHI access attempt detected without X-Purpose-Of-Use header!"

      # 3. Vault Token Renewal Failure
      - alert: VaultTokenRenewalFailure
        expr: vault_token_renewal_failures_total > 0
        for: 1m
        labels:
          severity: page
        annotations:
          summary: "Vault token renewal is failing; application may lose KMS access!"
```


### C. Incident Response Tabletop Exercises
To ensure your Security Operations Center (SOC) team is prepared, conduct quarterly tabletop exercises using the pre-configured playbooks:
1. **IoMT Device Compromise Playbook** (`docs/playbooks/IOMT-INCIDENT.md`): Simulates a rogue or compromised medical device sending forged telemetry.
2. **Clinical Data Breach Playbook** (`docs/playbooks/CLINICAL-DATA-BREACH.md`): Simulates an unauthorized attempt to access or exfiltrate patient PHI.

---

## 3. Pre-Production Security Validation

### A. Threat Modeling (STRIDE / LINDDUN)
Before launching, complete a formal threat model of the entire architecture:
* **STRIDE**: Analyze threats related to Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.
* **LINDDUN**: Specifically analyze privacy threats related to Linkability, Identifiability, Non-repudiation, Detectability, Disclosure of information, Unawareness, and Non-compliance.

### B. Third-Party Penetration Testing
Hire an external, certified cybersecurity firm to perform a comprehensive **grey-box penetration test**:
1. **API Penetration Testing**: Target the FastAPI microservices, testing for OWASP Top 10 API vulnerabilities (e.g., BOLA, broken authentication, rate limiting).
2. **Frontend Penetration Testing**: Target the Next.js portal, testing for XSS, CSRF, and session hijacking.
3. **Kubernetes Infrastructure Audit**: Perform a configuration audit of the EKS cluster, verifying RBAC, NetworkPolicies, and container isolation.

### C. Business Associate Agreement (BAA)
Under **HIPAA**, any third-party vendor that handles, stores, or transmits PHI is considered a **Business Associate**.
* **Cloud Providers**: Ensure that BAAs are signed with AWS, Azure, or GCP before deploying production workloads.
* **SaaS Vendors**: Ensure BAAs are signed with any third-party logging, monitoring, or identity providers (e.g., Okta, Datadog) that may ingest or process clinical metadata.
