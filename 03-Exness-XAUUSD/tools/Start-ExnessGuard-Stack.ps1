[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dashboardScript = Join-Path $PSScriptRoot 'dashboard_server.py'
$watchdogScript = Join-Path $PSScriptRoot 'Watch-ExnessGuard.ps1'
$exnessTerminal = 'C:\mt5exness\terminal64.exe'

$exnessRunning = Get-Process -Name 'terminal64' -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -ieq $exnessTerminal }
if (-not $exnessRunning) {
    if (-not (Test-Path -LiteralPath $exnessTerminal)) {
        throw "The dedicated Exness terminal was not found at $exnessTerminal"
    }
    Start-Process -FilePath $exnessTerminal -WindowStyle Hidden
    Write-Host "Dedicated Exness terminal started: $exnessTerminal"
} else {
    Write-Host 'Dedicated Exness terminal is already running.'
}

function Find-Python {
    $commands = @('py.exe', 'python.exe', 'python3.exe')
    foreach ($name in $commands) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    throw 'Python 3 was not found in PATH.'
}

$dashboardListening = Get-NetTCPConnection -LocalPort 3030 -State Listen -ErrorAction SilentlyContinue
if (-not $dashboardListening) {
    $python = Find-Python
    $arguments = if ([IO.Path]::GetFileName($python) -ieq 'py.exe') {
        @('-3', $dashboardScript)
    } else {
        @($dashboardScript)
    }
    Start-Process -FilePath $python -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden
    Write-Host 'Dashboard server started at http://localhost:3030'
} else {
    Write-Host 'Dashboard server is already listening at http://localhost:3030'
}

$watchdogRunning = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*$watchdogScript*" }
if (-not $watchdogRunning) {
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'RemoteSigned', '-File', $watchdogScript) `
        -WorkingDirectory $projectRoot -WindowStyle Hidden
    Write-Host 'Feed watchdog started.'
} else {
    Write-Host 'Feed watchdog is already running.'
}

Write-Host 'MT5 must remain open with ExnessGoldGuard attached; the watchdog will alert if its exporter stalls.'
