# Service-level objectives

| Service | SLI | Target | Alert windows |
|---|---|---:|---|
| Clinical ingestion | accepted valid events / valid events | 99.95% / 30d | 1h and 6h burn rate |
| Clinical query APIs | successful non-user-error requests | 99.9% / 30d | 1h and 6h burn rate |
| Audit append | durable appends / attempts | 99.99% / 30d | immediate paging |
| Portal | successful page/API requests | 99.9% / 30d | 1h and 6h burn rate |

Latency objectives are p95 under 500 ms for clinical query APIs and under 2 seconds from
Kafka receipt to durable storage. PHI confidentiality and tenant isolation have zero-error
budgets: any confirmed breach invokes the incident and regulatory-notification playbooks.
