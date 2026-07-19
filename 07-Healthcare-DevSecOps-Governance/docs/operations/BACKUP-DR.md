# Backup, restore, and disaster recovery

- PostgreSQL uses encrypted continuous WAL archiving plus daily snapshots with 35-day
  retention; quarterly archives follow the approved healthcare retention schedule.
- Object evidence uses versioning, legal hold, and compliance-mode object lock.
- Encryption keys are backed up separately under dual control; deleted tenant keys are
  recorded as crypto-erasure evidence.
- Target RPO is 5 minutes and RTO is 60 minutes for clinical ingestion and audit services.
- Restore tests run monthly in an isolated account. Evidence records snapshot identity,
  checksum, restored row counts, RLS tests, operator approvals, and elapsed time.
- Regional failover exercises run twice yearly and must prove DNS, Kafka replay,
  secret rehydration, audit-chain continuity, and rollback.

Backups containing PHI must never be restored to development or analytics environments.
