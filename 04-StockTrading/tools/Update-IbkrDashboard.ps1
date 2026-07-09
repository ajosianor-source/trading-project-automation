[CmdletBinding()]
param(
    [string]$ConfigPath,
    [ValidateSet(7497, 4002)]
    [int]$Port = 7497,
    [string]$Duration = '2 Y'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ConfigPath = if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    Join-Path $projectRoot 'config\stocks.example.json'
} else {
    (Resolve-Path -LiteralPath $ConfigPath).Path
}
$mlRoot = Join-Path $projectRoot 'ml'
$userSecAgent = [Environment]::GetEnvironmentVariable('SEC_USER_AGENT', 'User')
if ([string]::IsNullOrWhiteSpace($env:SEC_USER_AGENT) -and
    -not [string]::IsNullOrWhiteSpace($userSecAgent)) {
    $env:SEC_USER_AGENT = $userSecAgent
}
$userAlphaKey = [Environment]::GetEnvironmentVariable('ALPHAVANTAGE_API_KEY', 'User')
if ([string]::IsNullOrWhiteSpace($env:ALPHAVANTAGE_API_KEY) -and
    -not [string]::IsNullOrWhiteSpace($userAlphaKey)) {
    $env:ALPHAVANTAGE_API_KEY = $userAlphaKey
}
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$symbols = @(([string]$config.benchmark).ToUpperInvariant()) +
    @($config.universe | ForEach-Object { ([string]$_).ToUpperInvariant() })
$symbols = @($symbols | Select-Object -Unique)

Push-Location $mlRoot
try {
    & uv run python scripts\fetch_ibkr_metadata.py --symbols $symbols --port $Port `
        --output data\ibkr-instruments.json
    if ($LASTEXITCODE -ne 0) { throw 'IBKR instrument-metadata refresh failed.' }

    & uv run python scripts\fetch_ibkr_bars.py --symbols $symbols --port $Port `
        --duration $Duration --output data\ibkr-daily-bars.csv
    if ($LASTEXITCODE -ne 0) { throw 'IBKR historical-data refresh failed.' }

    & uv run python scripts\sync_ibkr_history.py --port $Port --client-id 43 `
        --executions data\ibkr-executions.json --output data\trading-history.json
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'IBKR execution history was not refreshed; any existing local journal will remain visible.'
    }

    if ([string]::IsNullOrWhiteSpace($env:SEC_USER_AGENT)) {
        Write-Warning 'SEC fundamentals skipped. Set SEC_USER_AGENT to "StockForge your-real-email@example.com" to enable them.'
    } else {
        & uv run python scripts\fetch_sec_fundamentals.py --symbols @($config.universe) `
            --output data\sec-fundamentals.json
        if ($LASTEXITCODE -ne 0) { throw 'SEC fundamentals refresh failed.' }
    }

    & uv run python scripts\build_ibkr_dashboard.py --config $ConfigPath
    if ($LASTEXITCODE -ne 0) { throw 'IBKR dashboard build failed.' }

    if ([string]::IsNullOrWhiteSpace($env:ALPHAVANTAGE_API_KEY)) {
        Write-Warning 'Automated earnings/news checks skipped. Set ALPHAVANTAGE_API_KEY; the trade gate will fail closed.'
    } else {
        & uv run python scripts\fetch_market_evidence.py `
            --scan ..\data\latest-scan.json --output data\market-evidence.json `
            --max-news-symbols 10
        if ($LASTEXITCODE -ne 0) {
            Write-Warning 'Automated earnings/news refresh failed; the trade gate will fail closed.'
        }
    }

    & uv run python scripts\build_ibkr_dashboard.py --config $ConfigPath
    if ($LASTEXITCODE -ne 0) { throw 'Final IBKR dashboard build failed.' }
}
finally {
    Pop-Location
}

Write-Host "StockForge IBKR dashboard refreshed: $projectRoot\dashboard\index.html"
