$ErrorActionPreference = 'Stop'
$response = Invoke-RestMethod `
    -Method Post `
    -Uri 'http://127.0.0.1:8787/alert' `
    -ContentType 'text/plain; charset=utf-8' `
    -Body 'SignalForge alert test: relay connected successfully.'

$response | Format-List
