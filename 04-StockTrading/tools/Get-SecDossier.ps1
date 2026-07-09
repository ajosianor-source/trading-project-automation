[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Z][A-Z0-9.-]{0,9}$')]
    [string]$Symbol,
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cacheRoot = Join-Path $projectRoot 'data\cache'
if (-not (Test-Path -LiteralPath $cacheRoot)) { New-Item -ItemType Directory -Path $cacheRoot | Out-Null }
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $projectRoot ("reports\sec-{0}.json" -f $Symbol.ToLowerInvariant())
}

$userAgent = [Environment]::GetEnvironmentVariable('SEC_USER_AGENT')
if ([string]::IsNullOrWhiteSpace($userAgent) -or $userAgent -notmatch '@') {
    throw 'Set SEC_USER_AGENT to an application name and contact email, for example: StockForge you@example.com'
}
$headers = @{ 'User-Agent' = $userAgent; 'Accept-Encoding' = 'gzip, deflate'; 'Host' = 'www.sec.gov' }

$tickerCache = Join-Path $cacheRoot 'sec-company-tickers.json'
if (-not (Test-Path -LiteralPath $tickerCache) -or ((Get-Date) - (Get-Item -LiteralPath $tickerCache).LastWriteTime).TotalHours -gt 24) {
    Invoke-WebRequest -Uri 'https://www.sec.gov/files/company_tickers.json' -Headers $headers -UseBasicParsing -OutFile $tickerCache
}
$tickerMap = Get-Content -LiteralPath $tickerCache -Raw | ConvertFrom-Json
$company = @($tickerMap.PSObject.Properties.Value | Where-Object { $_.ticker -eq $Symbol.ToUpperInvariant() }) | Select-Object -First 1
if ($null -eq $company) { throw "SEC ticker mapping not found for $Symbol." }
$cik = ([int64]$company.cik_str).ToString('0000000000')

$dataHeaders = @{ 'User-Agent' = $userAgent; 'Accept-Encoding' = 'gzip, deflate' }
$submissions = Invoke-RestMethod -Uri "https://data.sec.gov/submissions/CIK$cik.json" -Headers $dataHeaders -UseBasicParsing
$facts = Invoke-RestMethod -Uri "https://data.sec.gov/api/xbrl/companyfacts/CIK$cik.json" -Headers $dataHeaders -UseBasicParsing

function Get-LatestSecFact {
    param($CompanyFacts, [string[]]$Tags, [string]$Unit = 'USD')
    foreach ($tag in $Tags) {
        $concept = $CompanyFacts.facts.'us-gaap'.$tag
        if ($null -eq $concept) { continue }
        $units = $concept.units.$Unit
        if ($null -eq $units) { continue }
        $fact = @($units | Where-Object { $_.form -in @('10-K', '10-Q') } | Sort-Object filed -Descending) | Select-Object -First 1
        if ($null -ne $fact) {
            return [ordered]@{
                value = $fact.val
                periodEnd = $fact.end
                filed = $fact.filed
                form = $fact.form
                accession = $fact.accn
                concept = $tag
            }
        }
    }
    return $null
}

$recent = $submissions.filings.recent
$filings = New-Object System.Collections.Generic.List[object]
for ($i = 0; $i -lt [math]::Min(40, $recent.form.Count); $i++) {
    if ($recent.form[$i] -in @('10-K', '10-Q', '8-K', '4', '13D', '13G')) {
        $filings.Add([ordered]@{
            form = $recent.form[$i]
            filingDate = $recent.filingDate[$i]
            reportDate = $recent.reportDate[$i]
            accessionNumber = $recent.accessionNumber[$i]
            primaryDocument = $recent.primaryDocument[$i]
        })
    }
}

$dossier = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    source = 'SEC EDGAR'
    symbol = $Symbol.ToUpperInvariant()
    cik = $cik
    companyName = $submissions.name
    sic = $submissions.sic
    sicDescription = $submissions.sicDescription
    fiscalYearEnd = $submissions.fiscalYearEnd
    latestFacts = [ordered]@{
        revenue = Get-LatestSecFact $facts @('RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet')
        netIncome = Get-LatestSecFact $facts @('NetIncomeLoss', 'ProfitLoss')
        assets = Get-LatestSecFact $facts @('Assets')
        liabilities = Get-LatestSecFact $facts @('Liabilities')
        operatingCashFlow = Get-LatestSecFact $facts @('NetCashProvidedByUsedInOperatingActivities')
        stockholdersEquity = Get-LatestSecFact $facts @('StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest')
    }
    recentMaterialFilings = $filings.ToArray()
    warning = 'Extracted XBRL facts can use different concepts and periods. Verify material figures against the official filing document.'
}

$dossier | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Host "SEC dossier written to $OutputPath"
