param(
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [Parameter(Mandatory = $true)][string]$RestoreDatabaseUrl,
  [int]$MaximumRpoMinutes = 15
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $BackupFile)) { throw "Backup file does not exist" }
$age = (Get-Date).ToUniversalTime() - (Get-Item -LiteralPath $BackupFile).LastWriteTimeUtc
if ($age.TotalMinutes -gt $MaximumRpoMinutes) { throw "Backup exceeds the RPO" }
pg_restore --list $BackupFile | Out-Null
pg_restore --clean --if-exists --no-owner --dbname $RestoreDatabaseUrl $BackupFile
$counts = psql $RestoreDatabaseUrl -v ON_ERROR_STOP=1 -Atc @"
SELECT json_build_object(
  'tenants', (SELECT count(DISTINCT tenant_id) FROM ingestion_event_ledger),
  'audit_events', (SELECT count(*) FROM audit_log),
  'controls', (SELECT count(*) FROM compliance_control_registry)
);
"@
if ($LASTEXITCODE -ne 0) { throw "Restored database validation failed" }
Write-Output $counts
