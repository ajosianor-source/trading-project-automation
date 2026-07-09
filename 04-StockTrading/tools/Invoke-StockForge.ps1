[CmdletBinding()]
param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\config\stocks.example.json'),
    [ValidateSet('Config', 'Demo', 'AlphaVantage')]
    [string]$Provider = 'Config',
    [switch]$NoDelay
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Import-Module (Join-Path $projectRoot 'strategy\StockForge.psm1') -Force

if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Configuration not found: $ConfigPath" }
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$selectedProvider = if ($Provider -eq 'Config') { [string]$config.dataProvider } else { $Provider.ToLowerInvariant() }
$cacheRoot = Join-Path $projectRoot 'data\cache'
if (-not (Test-Path -LiteralPath $cacheRoot)) { New-Item -ItemType Directory -Path $cacheRoot | Out-Null }

function Invoke-AlphaRequest {
    param([hashtable]$Parameters, [string]$CacheName, [int]$CacheMinutes = 30)
    $cachePath = Join-Path $cacheRoot $CacheName
    if (Test-Path -LiteralPath $cachePath) {
        $age = (Get-Date) - (Get-Item -LiteralPath $cachePath).LastWriteTime
        if ($age.TotalMinutes -lt $CacheMinutes) {
            return Get-Content -LiteralPath $cachePath -Raw | ConvertFrom-Json
        }
    }
    $keyName = [string]$config.api.alphaVantageKeyEnvironmentVariable
    $apiKey = [Environment]::GetEnvironmentVariable($keyName)
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        throw "Set the $keyName environment variable before using Alpha Vantage. Use -Provider Demo for a synthetic system test."
    }
    $parts = New-Object System.Collections.Generic.List[string]
    foreach ($key in $Parameters.Keys) {
        $parts.Add(('{0}={1}' -f [uri]::EscapeDataString($key), [uri]::EscapeDataString([string]$Parameters[$key])))
    }
    $parts.Add(('apikey={0}' -f [uri]::EscapeDataString($apiKey)))
    $uri = 'https://www.alphavantage.co/query?' + ($parts -join '&')
    $response = Invoke-RestMethod -Uri $uri -Method Get -UseBasicParsing
    if ($response.Note) { throw "Alpha Vantage rate limit: $($response.Note)" }
    if ($response.Information) { throw "Alpha Vantage response: $($response.Information)" }
    if ($response.'Error Message') { throw "Alpha Vantage error: $($response.'Error Message')" }
    $response | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $cachePath -Encoding UTF8
    if (-not $NoDelay) { Start-Sleep -Seconds ([int]$config.api.alphaVantageDelaySeconds) }
    return $response
}

function ConvertFrom-AlphaBars {
    param($Response)
    $series = $Response.'Time Series (Daily)'
    if ($null -eq $series) { throw 'Alpha Vantage daily time series was missing.' }
    $bars = New-Object System.Collections.Generic.List[object]
    foreach ($property in $series.PSObject.Properties) {
        $row = $property.Value
        $bars.Add([pscustomobject]@{
            date = $property.Name
            open = [double]$row.'1. open'
            high = [double]$row.'2. high'
            low = [double]$row.'3. low'
            close = [double]$row.'4. close'
            volume = [long]$row.'5. volume'
        })
    }
    return @($bars.ToArray() | Sort-Object date)
}

function ConvertFrom-AlphaOverview {
    param($Response)
    return [pscustomobject]@{
        ReturnOnEquityTTM = ConvertTo-FiniteNumber $Response.ReturnOnEquityTTM
        OperatingMarginTTM = ConvertTo-FiniteNumber $Response.OperatingMarginTTM
        QuarterlyRevenueGrowthYOY = ConvertTo-FiniteNumber $Response.QuarterlyRevenueGrowthYOY
        QuarterlyEarningsGrowthYOY = ConvertTo-FiniteNumber $Response.QuarterlyEarningsGrowthYOY
        DebtToEquity = ConvertTo-FiniteNumber $Response.DebtToEquity
        ForwardPE = ConvertTo-FiniteNumber $Response.ForwardPE 100
        PEGRatio = ConvertTo-FiniteNumber $Response.PEGRatio 5
    }
}

function Get-AlphaSentimentMap {
    param([string[]]$Symbols)
    $map = @{}
    foreach ($symbol in $Symbols) { $map[$symbol] = 0.0 }
    $response = Invoke-AlphaRequest -Parameters @{
        function = 'NEWS_SENTIMENT'
        tickers = ($Symbols -join ',')
        sort = 'LATEST'
        limit = 200
    } -CacheName 'news-sentiment.json' -CacheMinutes 60
    if ($null -eq $response.feed) { return $map }
    $sums = @{}
    $counts = @{}
    foreach ($article in $response.feed) {
        foreach ($ticker in $article.ticker_sentiment) {
            $symbol = [string]$ticker.ticker
            if ($map.ContainsKey($symbol)) {
                if (-not $sums.ContainsKey($symbol)) { $sums[$symbol] = 0.0; $counts[$symbol] = 0 }
                $sums[$symbol] += ConvertTo-FiniteNumber $ticker.ticker_sentiment_score
                $counts[$symbol]++
            }
        }
    }
    foreach ($symbol in $Symbols) {
        if ($counts.ContainsKey($symbol) -and $counts[$symbol] -gt 0) { $map[$symbol] = $sums[$symbol] / $counts[$symbol] }
    }
    return $map
}

$symbols = @($config.universe | ForEach-Object { ([string]$_).ToUpperInvariant() } | Select-Object -Unique)
if ($symbols.Count -eq 0) { throw 'The configured stock universe is empty.' }
$allSymbols = @($symbols + ([string]$config.benchmark).ToUpperInvariant() | Select-Object -Unique)
$barsBySymbol = @{}
$fundamentalsBySymbol = @{}
$sentimentBySymbol = @{}
$sourceLabel = ''

if ($selectedProvider -eq 'demo') {
    foreach ($symbol in $allSymbols) { $barsBySymbol[$symbol] = New-DemoBars $symbol }
    foreach ($symbol in $symbols) {
        $fundamentalsBySymbol[$symbol] = Get-DemoFundamentals $symbol
        $sentimentBySymbol[$symbol] = 0.0
    }
    $sourceLabel = 'SYNTHETIC DEMO - NOT MARKET DATA'
} elseif ($selectedProvider -eq 'alphavantage') {
    foreach ($symbol in $allSymbols) {
        Write-Host "Downloading daily bars for $symbol..."
        $response = Invoke-AlphaRequest -Parameters @{
            function = 'TIME_SERIES_DAILY'
            symbol = $symbol
            outputsize = 'full'
        } -CacheName ("daily-{0}.json" -f $symbol) -CacheMinutes ([int]$config.api.cacheMinutes)
        $barsBySymbol[$symbol] = ConvertFrom-AlphaBars $response
    }
    foreach ($symbol in $symbols) {
        Write-Host "Downloading fundamentals for $symbol..."
        $overview = Invoke-AlphaRequest -Parameters @{ function = 'OVERVIEW'; symbol = $symbol } -CacheName ("overview-{0}.json" -f $symbol) -CacheMinutes 720
        $fundamentalsBySymbol[$symbol] = ConvertFrom-AlphaOverview $overview
    }
    $sentimentBySymbol = Get-AlphaSentimentMap $symbols
    $sourceLabel = 'Alpha Vantage'
} else {
    throw "Unsupported provider '$selectedProvider'."
}

$benchmarkBars = $barsBySymbol[([string]$config.benchmark).ToUpperInvariant()]
$benchmarkCloses = @($benchmarkBars | Sort-Object date | ForEach-Object { [double]$_.close })
$benchmarkSma200 = ($benchmarkCloses[($benchmarkCloses.Count - 200)..($benchmarkCloses.Count - 1)] | Measure-Object -Average).Average
$marketRegimeScore = if ($benchmarkCloses[-1] -gt $benchmarkSma200) { 100.0 } else { 20.0 }

$results = New-Object System.Collections.Generic.List[object]
foreach ($symbol in $symbols) {
    $result = Get-StockScore -Symbol $symbol -Bars $barsBySymbol[$symbol] -Fundamentals $fundamentalsBySymbol[$symbol] `
        -Sentiment ([double]$sentimentBySymbol[$symbol]) -MarketRegimeScore $marketRegimeScore -Config $config -DataSource $sourceLabel
    $results.Add($result)
}
$ranked = @($results.ToArray() | Sort-Object score -Descending)
for ($i = 0; $i -lt $ranked.Count; $i++) { $ranked[$i].rank = $i + 1 }
$eligible = @($ranked | Where-Object eligible)
$best = if ($eligible.Count -gt 0) { $eligible[0].symbol } else { $null }

$scan = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    mode = [string]$config.mode
    provider = $sourceLabel
    benchmark = [string]$config.benchmark
    marketRegime = if ($marketRegimeScore -ge 50) { 'risk-on' } else { 'risk-off' }
    orderRoutingEnabled = [bool]$config.broker.orderRoutingEnabled
    recommendation = $best
    recommendationMeaning = if ($best) { 'Highest-ranked eligible candidate for further review; not an instruction to buy.' } else { 'No stock passed every configured gate.' }
    results = $ranked
}

$json = $scan | ConvertTo-Json -Depth 20
$jsonPath = Join-Path $projectRoot 'data\latest-scan.json'
$jsPath = Join-Path $projectRoot 'dashboard\scan-data.js'
$json | Set-Content -LiteralPath $jsonPath -Encoding UTF8
("window.STOCK_FORGE_SCAN = {0};" -f $json) | Set-Content -LiteralPath $jsPath -Encoding UTF8

Write-Host ''
Write-Host ("Provider: {0}" -f $sourceLabel)
Write-Host ("Market regime: {0}" -f $scan.marketRegime)
if ($best) {
    $leader = $ranked[0]
    Write-Host ("Top review candidate: {0} | Score {1} | Price {2}" -f $leader.symbol, $leader.score, $leader.price)
} else {
    Write-Host 'No stock passed all configured selection and risk gates.'
}
Write-Host ("Dashboard data: {0}" -f $jsPath)
