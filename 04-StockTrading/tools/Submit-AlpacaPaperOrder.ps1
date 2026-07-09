[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Z][A-Z0-9.-]{0,9}$')]
    [string]$Symbol,
    [Parameter(Mandatory = $true)]
    [ValidateSet('buy', 'sell')]
    [string]$Side,
    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 1000000)]
    [int]$Quantity,
    [Parameter(Mandatory = $true)]
    [ValidateRange(0.01, 1000000)]
    [double]$LimitPrice,
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\config\stocks.local.json'),
    [switch]$Submit,
    [string]$Confirmation
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Local configuration not found: $ConfigPath" }
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json

$order = [ordered]@{
    symbol = $Symbol.ToUpperInvariant()
    qty = $Quantity.ToString()
    side = $Side
    type = 'limit'
    time_in_force = 'day'
    limit_price = $LimitPrice.ToString([Globalization.CultureInfo]::InvariantCulture)
    client_order_id = ('stockforge-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'), $Symbol.ToLowerInvariant())
}
$notional = $Quantity * $LimitPrice

if (-not $Submit) {
    [pscustomobject]@{ dryRun = $true; notional = $notional; order = $order } | ConvertTo-Json -Depth 5
    Write-Host 'Dry run only. No request was sent.'
    exit 0
}

if ([string]$config.mode -ne 'paper') { throw "Configuration mode must be 'paper'." }
if ([string]$config.broker.environment -ne 'paper') { throw "Broker environment must be 'paper'." }
if (-not [bool]$config.broker.orderRoutingEnabled) { throw 'orderRoutingEnabled is false.' }
if ([string]$config.broker.baseUrl -ne 'https://paper-api.alpaca.markets') { throw 'Only the exact Alpaca paper endpoint is allowed by this script.' }
if ($Confirmation -ne 'SUBMIT PAPER ORDER') { throw "Pass -Confirmation 'SUBMIT PAPER ORDER' to acknowledge paper submission." }
if ($notional -gt [double]$config.broker.maximumOrderNotional) { throw "Order notional $notional exceeds the configured limit." }

$key = [Environment]::GetEnvironmentVariable([string]$config.broker.keyEnvironmentVariable)
$secret = [Environment]::GetEnvironmentVariable([string]$config.broker.secretEnvironmentVariable)
if ([string]::IsNullOrWhiteSpace($key) -or [string]::IsNullOrWhiteSpace($secret)) { throw 'Alpaca paper credentials are missing.' }

$headers = @{ 'APCA-API-KEY-ID' = $key; 'APCA-API-SECRET-KEY' = $secret }
$response = Invoke-RestMethod -Uri "$($config.broker.baseUrl)/v2/orders" -Method Post -Headers $headers `
    -ContentType 'application/json' -Body ($order | ConvertTo-Json)
$response | ConvertTo-Json -Depth 10
