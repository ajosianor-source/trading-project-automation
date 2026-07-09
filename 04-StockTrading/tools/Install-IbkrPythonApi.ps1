[CmdletBinding()]
param(
    [string]$ApiSource = 'C:\TWS API\source\pythonclient'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mlRoot = Join-Path $projectRoot 'ml'
$python = Join-Path $mlRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $python)) {
    throw "StockForge ML environment is missing. Run 'uv sync' from $mlRoot first."
}
if (-not (Test-Path -LiteralPath $ApiSource)) {
    throw @"
Official IBKR Python API source was not found at:
$ApiSource

Install the official TWS API package from IBKR, then rerun this script.
IBKR Desktop alone does not include the socket API required by StockForge.
"@
}

Push-Location $mlRoot
try {
    & uv pip install --python $python $ApiSource
    if ($LASTEXITCODE -ne 0) { throw 'IBKR Python API installation failed.' }
    & $python -c "from ibapi.client import EClient; print('Official IBKR Python API import passed.')"
    if ($LASTEXITCODE -ne 0) { throw 'IBKR Python API import check failed.' }
}
finally {
    Pop-Location
}
