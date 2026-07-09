Set-StrictMode -Version 2.0

function ConvertTo-FiniteNumber {
    param($Value, [double]$Default = 0.0)
    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value) -or $Value -eq 'None' -or $Value -eq '-') {
        return $Default
    }
    $number = 0.0
    if ([double]::TryParse([string]$Value, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
        if (-not [double]::IsNaN($number) -and -not [double]::IsInfinity($number)) {
            return $number
        }
    }
    return $Default
}

function Limit-Number {
    param([double]$Value, [double]$Minimum, [double]$Maximum)
    return [math]::Max($Minimum, [math]::Min($Maximum, $Value))
}

function Get-Mean {
    param([double[]]$Values)
    if ($null -eq $Values -or $Values.Count -eq 0) { return 0.0 }
    return ($Values | Measure-Object -Average).Average
}

function Get-StandardDeviation {
    param([double[]]$Values)
    if ($null -eq $Values -or $Values.Count -lt 2) { return 0.0 }
    $mean = Get-Mean $Values
    $sum = 0.0
    foreach ($value in $Values) { $sum += [math]::Pow($value - $mean, 2) }
    return [math]::Sqrt($sum / ($Values.Count - 1))
}

function Get-Sma {
    param([double[]]$Values, [int]$Period)
    if ($Values.Count -lt $Period -or $Period -lt 1) { return $null }
    return Get-Mean ($Values[($Values.Count - $Period)..($Values.Count - 1)])
}

function Get-Return {
    param([double[]]$Values, [int]$Periods)
    if ($Values.Count -le $Periods -or $Periods -lt 1) { return 0.0 }
    $start = $Values[$Values.Count - 1 - $Periods]
    if ($start -le 0) { return 0.0 }
    return ($Values[-1] / $start) - 1.0
}

function Get-Rsi {
    param([double[]]$Values, [int]$Period = 14)
    if ($Values.Count -le $Period) { return 50.0 }
    $gains = 0.0
    $losses = 0.0
    $start = $Values.Count - $Period
    for ($i = $start; $i -lt $Values.Count; $i++) {
        $change = $Values[$i] - $Values[$i - 1]
        if ($change -gt 0) { $gains += $change } else { $losses += -$change }
    }
    if ($losses -eq 0) { return 100.0 }
    $rs = ($gains / $Period) / ($losses / $Period)
    return 100.0 - (100.0 / (1.0 + $rs))
}

function Get-Atr {
    param([object[]]$Bars, [int]$Period = 14)
    if ($Bars.Count -le $Period) { return 0.0 }
    $trueRanges = New-Object System.Collections.Generic.List[double]
    for ($i = $Bars.Count - $Period; $i -lt $Bars.Count; $i++) {
        $high = [double]$Bars[$i].high
        $low = [double]$Bars[$i].low
        $previousClose = [double]$Bars[$i - 1].close
        $range = [math]::Max($high - $low, [math]::Max([math]::Abs($high - $previousClose), [math]::Abs($low - $previousClose)))
        $trueRanges.Add($range)
    }
    return Get-Mean $trueRanges.ToArray()
}

function Get-MaxDrawdown {
    param([double[]]$Values)
    if ($Values.Count -eq 0) { return 0.0 }
    $peak = $Values[0]
    $maximumDrawdown = 0.0
    foreach ($value in $Values) {
        if ($value -gt $peak) { $peak = $value }
        if ($peak -gt 0) {
            $drawdown = ($peak - $value) / $peak
            if ($drawdown -gt $maximumDrawdown) { $maximumDrawdown = $drawdown }
        }
    }
    return $maximumDrawdown
}

function Get-DailyReturns {
    param([double[]]$Values)
    $returns = New-Object System.Collections.Generic.List[double]
    for ($i = 1; $i -lt $Values.Count; $i++) {
        if ($Values[$i - 1] -gt 0) { $returns.Add(($Values[$i] / $Values[$i - 1]) - 1.0) }
    }
    return $returns.ToArray()
}

function Get-ScaledScore {
    param([double]$Value, [double]$Bad, [double]$Good)
    if ($Good -eq $Bad) { return 0.0 }
    return Limit-Number ((($Value - $Bad) / ($Good - $Bad)) * 100.0) 0.0 100.0
}

function Get-DemoFundamentals {
    param([string]$Symbol)
    $seed = 0
    foreach ($character in $Symbol.ToCharArray()) { $seed += [int]$character }
    return [pscustomobject]@{
        ReturnOnEquityTTM = 0.12 + (($seed % 20) / 100.0)
        OperatingMarginTTM = 0.10 + (($seed % 18) / 100.0)
        QuarterlyRevenueGrowthYOY = 0.03 + (($seed % 22) / 100.0)
        QuarterlyEarningsGrowthYOY = 0.02 + (($seed % 28) / 100.0)
        DebtToEquity = 0.25 + (($seed % 90) / 100.0)
        ForwardPE = 16 + ($seed % 22)
        PEGRatio = 0.8 + (($seed % 20) / 10.0)
    }
}

function New-DemoBars {
    param([string]$Symbol, [int]$Count = 260)
    $seed = 0
    foreach ($character in $Symbol.ToCharArray()) { $seed += [int]$character }
    $random = New-Object System.Random($seed)
    $price = 45.0 + ($seed % 180)
    $drift = 0.00015 + (($seed % 11) / 20000.0)
    $volatility = 0.009 + (($seed % 8) / 1000.0)
    $dates = New-Object System.Collections.Generic.List[datetime]
    $date = (Get-Date).Date
    while ($dates.Count -lt $Count) {
        if ($date.DayOfWeek -ne [DayOfWeek]::Saturday -and $date.DayOfWeek -ne [DayOfWeek]::Sunday) { $dates.Add($date) }
        $date = $date.AddDays(-1)
    }
    $bars = New-Object System.Collections.Generic.List[object]
    foreach ($tradingDate in @($dates.ToArray() | Sort-Object)) {
        $shock = (($random.NextDouble() - 0.5) * 2.0 * $volatility) + $drift
        $open = $price
        $price = [math]::Max(2.0, $price * (1.0 + $shock))
        $spread = $price * (0.004 + ($random.NextDouble() * 0.012))
        $bars.Add([pscustomobject]@{
            date = $tradingDate.ToString('yyyy-MM-dd')
            open = [math]::Round($open, 4)
            high = [math]::Round([math]::Max($open, $price) + $spread, 4)
            low = [math]::Round([math]::Max(0.01, [math]::Min($open, $price) - $spread), 4)
            close = [math]::Round($price, 4)
            volume = [long](1500000 + ($random.NextDouble() * 9000000))
        })
    }
    return $bars.ToArray()
}

function Get-StockScore {
    param(
        [string]$Symbol,
        [object[]]$Bars,
        $Fundamentals,
        [double]$Sentiment,
        [double]$MarketRegimeScore,
        $Config,
        [string]$DataSource = 'unknown'
    )

    $minimumBars = [int]$Config.selection.minimumHistoryBars
    if ($Bars.Count -lt $minimumBars) {
        return [pscustomobject]@{ symbol = $Symbol; eligible = $false; score = 0; reason = "Only $($Bars.Count) bars; $minimumBars required." }
    }

    $orderedBars = @($Bars | Sort-Object date)
    [double[]]$closes = @($orderedBars | ForEach-Object { [double]$_.close })
    [double[]]$volumes = @($orderedBars | ForEach-Object { [double]$_.volume })
    $latest = $orderedBars[-1]
    $price = [double]$latest.close
    $dataAgeHours = ((Get-Date).ToUniversalTime() - ([datetime]::ParseExact([string]$latest.date, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)).ToUniversalTime()).TotalHours
    $sma20 = Get-Sma $closes 20
    $sma50 = Get-Sma $closes 50
    $sma200 = Get-Sma $closes 200
    $rsi14 = Get-Rsi $closes 14
    $atr14 = Get-Atr $orderedBars 14
    $momentum63 = Get-Return $closes 63
    $momentum126 = Get-Return $closes 126
    $yearValues = $closes[($closes.Count - 200)..($closes.Count - 1)]
    $high200 = ($yearValues | Measure-Object -Maximum).Maximum
    $maxDrawdown = Get-MaxDrawdown $yearValues
    $dailyReturns = Get-DailyReturns $yearValues
    $annualizedVolatility = (Get-StandardDeviation $dailyReturns) * [math]::Sqrt(252)
    $averageVolume20 = Get-Sma $volumes 20
    $averageDollarVolume = $averageVolume20 * $price
    $volumeRatio = if ($averageVolume20 -gt 0) { [double]$latest.volume / $averageVolume20 } else { 0.0 }

    $trendScore = 0.0
    if ($price -gt $sma20) { $trendScore += 25 }
    if ($sma20 -gt $sma50) { $trendScore += 25 }
    if ($sma50 -gt $sma200) { $trendScore += 35 }
    if ($price -gt $sma200) { $trendScore += 15 }
    $momentumScore = (Get-ScaledScore $momentum63 -0.15 0.30) * 0.45 + (Get-ScaledScore $momentum126 -0.20 0.45) * 0.55
    $rsiScore = if ($rsi14 -ge 45 -and $rsi14 -le 68) { 100 } elseif ($rsi14 -gt 75 -or $rsi14 -lt 30) { 20 } else { 60 }
    $breakoutDistance = if ($high200 -gt 0) { $price / $high200 } else { 0 }
    $breakoutScore = Get-ScaledScore $breakoutDistance 0.72 0.98
    $volumeScore = Get-ScaledScore $volumeRatio 0.55 1.6
    $technicalScore = ($trendScore * 0.38) + ($momentumScore * 0.32) + ($rsiScore * 0.10) + ($breakoutScore * 0.12) + ($volumeScore * 0.08)

    $roe = ConvertTo-FiniteNumber $Fundamentals.ReturnOnEquityTTM
    $operatingMargin = ConvertTo-FiniteNumber $Fundamentals.OperatingMarginTTM
    $revenueGrowth = ConvertTo-FiniteNumber $Fundamentals.QuarterlyRevenueGrowthYOY
    $earningsGrowth = ConvertTo-FiniteNumber $Fundamentals.QuarterlyEarningsGrowthYOY
    $debtToEquity = ConvertTo-FiniteNumber $Fundamentals.DebtToEquity
    $forwardPe = ConvertTo-FiniteNumber $Fundamentals.ForwardPE 100
    $peg = ConvertTo-FiniteNumber $Fundamentals.PEGRatio 5
    $fundamentalScore =
        (Get-ScaledScore $roe 0.03 0.30) * 0.20 +
        (Get-ScaledScore $operatingMargin 0.03 0.30) * 0.15 +
        (Get-ScaledScore $revenueGrowth -0.10 0.25) * 0.18 +
        (Get-ScaledScore $earningsGrowth -0.15 0.35) * 0.18 +
        (100 - (Get-ScaledScore $debtToEquity 0.25 2.5)) * 0.14 +
        (100 - (Get-ScaledScore $forwardPe 18 55)) * 0.08 +
        (100 - (Get-ScaledScore $peg 1.0 3.5)) * 0.07

    $liquidityScore = Get-ScaledScore $averageDollarVolume $Config.portfolio.minimumAverageDollarVolume ($Config.portfolio.minimumAverageDollarVolume * 10)
    $volatilityScore = 100 - (Get-ScaledScore $annualizedVolatility 0.18 $Config.selection.maximumAnnualizedVolatility)
    $drawdownScore = 100 - (Get-ScaledScore $maxDrawdown 0.08 0.45)
    $atrPercent = if ($price -gt 0) { $atr14 / $price } else { 1.0 }
    $atrScore = 100 - (Get-ScaledScore $atrPercent 0.012 0.065)
    $riskQualityScore = ($liquidityScore * 0.30) + ($volatilityScore * 0.25) + ($drawdownScore * 0.25) + ($atrScore * 0.20)
    $sentimentScore = Limit-Number (($Sentiment + 1.0) * 50.0) 0 100

    $weights = $Config.selection.weights
    $totalWeight = [double]$weights.technical + [double]$weights.fundamental + [double]$weights.riskQuality + [double]$weights.sentiment + [double]$weights.marketRegime
    $totalScore = (
        $technicalScore * [double]$weights.technical +
        $fundamentalScore * [double]$weights.fundamental +
        $riskQualityScore * [double]$weights.riskQuality +
        $sentimentScore * [double]$weights.sentiment +
        $MarketRegimeScore * [double]$weights.marketRegime
    ) / $totalWeight

    $reasons = New-Object System.Collections.Generic.List[string]
    if ($price -gt $sma200 -and $sma50 -gt $sma200) { $reasons.Add('Long-term trend is positive') }
    if ($momentum126 -gt 0.10) { $reasons.Add('Six-month momentum exceeds 10%') }
    if ($roe -gt 0.18) { $reasons.Add('Return on equity is strong') }
    if ($revenueGrowth -gt 0.10) { $reasons.Add('Revenue growth exceeds 10%') }
    if ($annualizedVolatility -gt $Config.selection.maximumAnnualizedVolatility) { $reasons.Add('Volatility exceeds configured ceiling') }
    if ($averageDollarVolume -lt $Config.portfolio.minimumAverageDollarVolume) { $reasons.Add('Liquidity is below configured minimum') }
    if ($rsi14 -gt 75) { $reasons.Add('RSI indicates an extended move') }
    if ($dataAgeHours -gt [double]$Config.selection.maximumDataAgeHours) { $reasons.Add('Market data is older than the configured freshness limit') }
    if ($reasons.Count -eq 0) { $reasons.Add('No single factor dominates the result') }

    $riskBudget = [double]$Config.portfolio.accountValue * ([double]$Config.portfolio.riskPerTradePercent / 100.0)
    $stopDistance = $atr14 * [double]$Config.portfolio.atrStopMultiple
    $sharesByRisk = if ($stopDistance -gt 0) { [math]::Floor($riskBudget / $stopDistance) } else { 0 }
    $positionCap = [double]$Config.portfolio.accountValue * ([double]$Config.portfolio.maxPositionPercent / 100.0)
    $sharesByCap = if ($price -gt 0) { [math]::Floor($positionCap / $price) } else { 0 }
    $suggestedShares = [int][math]::Max(0, [math]::Min($sharesByRisk, $sharesByCap))
    $eligible = $totalScore -ge [double]$Config.selection.minimumScore -and
        $annualizedVolatility -le [double]$Config.selection.maximumAnnualizedVolatility -and
        $averageDollarVolume -ge [double]$Config.portfolio.minimumAverageDollarVolume -and
        $dataAgeHours -le [double]$Config.selection.maximumDataAgeHours

    return [pscustomobject]@{
        symbol = $Symbol
        eligible = $eligible
        score = [math]::Round($totalScore, 2)
        rank = 0
        price = [math]::Round($price, 2)
        asOf = [string]$latest.date
        dataSource = $DataSource
        componentScores = [ordered]@{
            technical = [math]::Round($technicalScore, 1)
            fundamental = [math]::Round($fundamentalScore, 1)
            riskQuality = [math]::Round($riskQualityScore, 1)
            sentiment = [math]::Round($sentimentScore, 1)
            marketRegime = [math]::Round($MarketRegimeScore, 1)
        }
        metrics = [ordered]@{
            sma20 = [math]::Round($sma20, 2)
            sma50 = [math]::Round($sma50, 2)
            sma200 = [math]::Round($sma200, 2)
            rsi14 = [math]::Round($rsi14, 1)
            atr14 = [math]::Round($atr14, 2)
            momentum3MonthPercent = [math]::Round($momentum63 * 100, 1)
            momentum6MonthPercent = [math]::Round($momentum126 * 100, 1)
            annualizedVolatilityPercent = [math]::Round($annualizedVolatility * 100, 1)
            maxDrawdownPercent = [math]::Round($maxDrawdown * 100, 1)
            averageDollarVolume = [math]::Round($averageDollarVolume, 0)
            returnOnEquityPercent = [math]::Round($roe * 100, 1)
            revenueGrowthPercent = [math]::Round($revenueGrowth * 100, 1)
            earningsGrowthPercent = [math]::Round($earningsGrowth * 100, 1)
            forwardPE = [math]::Round($forwardPe, 1)
            sentiment = [math]::Round($Sentiment, 3)
            dataAgeHours = [math]::Round($dataAgeHours, 1)
        }
        riskPlan = [ordered]@{
            suggestedShares = $suggestedShares
            estimatedPositionValue = [math]::Round($suggestedShares * $price, 2)
            initialStop = [math]::Round([math]::Max(0.01, $price - $stopDistance), 2)
            riskBudget = [math]::Round($riskBudget, 2)
        }
        reasons = $reasons.ToArray()
    }
}

Export-ModuleMember -Function ConvertTo-FiniteNumber, Get-DemoFundamentals, New-DemoBars, Get-StockScore
