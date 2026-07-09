$ErrorActionPreference = 'Stop'
$relayRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$environmentFile = Join-Path $relayRoot '.env'
$server = Join-Path $relayRoot 'server.py'

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw "Missing $environmentFile. Copy .env.example to .env and enter your Twilio details."
}

Set-Location -LiteralPath $relayRoot
py $server
