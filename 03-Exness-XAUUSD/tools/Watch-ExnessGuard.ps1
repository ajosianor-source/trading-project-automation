[CmdletBinding()]
param(
    [string]$FeedPath = "$env:APPDATA\MetaQuotes\Terminal\Common\Files\ExnessGoldGuard\live.json",
    [string]$RelayBase = 'http://127.0.0.1:8787',
    [int]$StaleSeconds = 20,
    [int]$PollSeconds = 10,
    [switch]$Once
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot 'runtime'
$logPath = Join-Path $runtimePath 'watchdog.log'
$statePath = Join-Path $runtimePath 'watchdog-state.json'
New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null

function Write-WatchLog {
    param([string]$Level, [string]$Message)
    $line = '{0:u},{1},{2}' -f (Get-Date), $Level, ($Message -replace '[\r\n]+', ' ')
    Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
    Write-Host $line
}

function Read-WatchState {
    if (-not (Test-Path -LiteralPath $statePath)) {
        return [pscustomobject]@{ feed = 'UNKNOWN'; relay = 'UNKNOWN' }
    }
    try {
        return Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    } catch {
        return [pscustomobject]@{ feed = 'UNKNOWN'; relay = 'UNKNOWN' }
    }
}

function Save-WatchState {
    param([string]$Feed, [string]$Relay)
    [pscustomobject]@{
        feed = $Feed
        relay = $Relay
        checkedUtc = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
}

function Test-Relay {
    try {
        $null = Invoke-RestMethod -Method Get -Uri "$RelayBase/health" -TimeoutSec 3
        return 'HEALTHY'
    } catch {
        return 'DOWN'
    }
}

function Send-RelayAlert {
    param([string]$Message)
    try {
        $null = Invoke-RestMethod -Method Post -Uri "$RelayBase/alert" `
            -ContentType 'text/plain; charset=utf-8' -Body $Message -TimeoutSec 5
        Write-WatchLog 'INFO' 'Watchdog alert sent through the WhatsApp relay.'
    } catch {
        Write-WatchLog 'WARN' "Could not send watchdog alert: $($_.Exception.Message)"
    }
}

function Get-FeedStatus {
    if (-not (Test-Path -LiteralPath $FeedPath)) {
        return [pscustomobject]@{ status = 'MISSING'; age = -1; detail = 'live.json does not exist' }
    }
    try {
        $feed = Get-Content -LiteralPath $FeedPath -Raw | ConvertFrom-Json
        $heartbeat = [DateTimeOffset]::FromUnixTimeSeconds([long]$feed.heartbeat).UtcDateTime
        $age = [math]::Max(0, [int]((Get-Date).ToUniversalTime() - $heartbeat).TotalSeconds)
        $status = if ($age -le $StaleSeconds) { 'HEALTHY' } else { 'STALE' }
        return [pscustomobject]@{
            status = $status
            age = $age
            detail = "heartbeat age ${age}s; account $($feed.account.mode); engine $($feed.engine.version)"
        }
    } catch {
        return [pscustomobject]@{ status = 'INVALID'; age = -1; detail = $_.Exception.Message }
    }
}

do {
    $previous = Read-WatchState
    $feed = Get-FeedStatus
    $relay = Test-Relay

    Write-WatchLog 'CHECK' "Feed=$($feed.status) ($($feed.detail)); Relay=$relay"

    if ($feed.status -ne $previous.feed) {
        if ($feed.status -eq 'HEALTHY' -and $previous.feed -notin @('UNKNOWN', 'HEALTHY')) {
            if ($relay -eq 'HEALTHY') {
                Send-RelayAlert "Exness Gold Guard v1.40 RECOVERY: MT5 live feed is healthy again ($($feed.detail))."
            }
        } elseif ($feed.status -ne 'HEALTHY' -and $relay -eq 'HEALTHY') {
            Send-RelayAlert "Exness Gold Guard v1.40 WARNING: MT5 live feed is $($feed.status) ($($feed.detail)). Check the separate Exness terminal and EA."
        }
    }

    if ($relay -ne $previous.relay -and $relay -eq 'HEALTHY' -and $previous.relay -eq 'DOWN') {
        Write-WatchLog 'INFO' 'WhatsApp relay recovered.'
    }

    Save-WatchState -Feed $feed.status -Relay $relay
    if (-not $Once) {
        Start-Sleep -Seconds ([math]::Max(2, $PollSeconds))
    }
} while (-not $Once)

