$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Import-Module (Join-Path $projectRoot 'strategy\StockForge.psm1') -Force
$config = Get-Content -LiteralPath (Join-Path $projectRoot 'config\stocks.demo.json') -Raw | ConvertFrom-Json

$bars = New-DemoBars 'TEST' 260
if ($bars.Count -ne 260) { throw 'Demo bar generator returned the wrong count.' }
if ($bars[-1].close -le 0) { throw 'Demo bar generator returned an invalid price.' }

$score = Get-StockScore -Symbol 'TEST' -Bars $bars -Fundamentals (Get-DemoFundamentals 'TEST') `
    -Sentiment 0.1 -MarketRegimeScore 100 -Config $config -DataSource 'test'
if ($score.score -lt 0 -or $score.score -gt 100) { throw "Score out of range: $($score.score)" }
if ($score.riskPlan.estimatedPositionValue -gt ($config.portfolio.accountValue * $config.portfolio.maxPositionPercent / 100) + 0.01) {
    throw 'Position sizing exceeded the configured cap.'
}
if ($score.metrics.sma200 -le 0 -or $score.metrics.atr14 -le 0) { throw 'Indicators were not calculated.' }

& (Join-Path $PSScriptRoot 'Invoke-StockForge.ps1') -ConfigPath (Join-Path $projectRoot 'config\stocks.demo.json') -Provider Demo
$scanPath = Join-Path $projectRoot 'data\latest-scan.json'
if (-not (Test-Path -LiteralPath $scanPath)) { throw 'Scanner did not write latest-scan.json.' }
$scan = Get-Content -LiteralPath $scanPath -Raw | ConvertFrom-Json
if ($scan.results.Count -ne $config.universe.Count) { throw 'Scanner result count does not match the universe.' }
if ($scan.provider -notmatch 'SYNTHETIC') { throw 'Demo output is not clearly labelled synthetic.' }

Write-Host 'StockForge tests passed.'
