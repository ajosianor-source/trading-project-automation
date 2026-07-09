window.STOCK_FORGE_SCAN = {
  "generatedAt": "2026-07-04T08:33:01.735080+00:00",
  "mode": "paper-research",
  "provider": "IBKR PAPER HISTORICAL + SEC EDGAR",
  "benchmark": "SPY",
  "marketRegime": "risk-on",
  "orderRoutingEnabled": false,
  "recommendation": "V",
  "recommendationMeaning": "Highest-ranked technical, SEC-fundamental, and risk candidate for news review; not an instruction to buy.",
  "missingEvidence": [
    "earnings calendar",
    "news sentiment"
  ],
  "fundamentalCoverage": {
    "available": 49,
    "universe": 50,
    "pointInTime": true,
    "asOf": "2026-07-04"
  },
  "tradingHistory": {
    "generatedAt": "2026-07-04T07:58:14.429515+00:00",
    "source": "IBKR paper executions (local append-only journal)",
    "statistics": {
      "executionCount": 0,
      "closedTradeCount": 0,
      "winningTrades": 0,
      "losingTrades": 0,
      "winRatePercent": null,
      "realizedPnl": 0,
      "averageTradePnl": null,
      "profitFactor": null
    },
    "closedTrades": [],
    "openPositions": [],
    "unmatchedSells": [],
    "accounts": [
      "DUR172722",
      "DUR172722"
    ],
    "journal": "data\\ibkr-executions.json"
  },
  "results": [
    {
      "symbol": "V",
      "name": "VISA INC-CLASS A SHARES",
      "industry": "Financial",
      "category": "Diversified Finan Serv",
      "eligible": true,
      "score": 88.06,
      "rank": 1,
      "price": 362.13,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 84.3,
        "fundamental": 86.0,
        "riskQuality": 94.9,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 76.8,
        "momentum3MonthPercent": 21.6,
        "annualizedVolatilityPercent": 21.8,
        "averageDollarVolume": 1437159878,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 11.3,
        "operatingMarginPercent": 60.0,
        "freeCashFlowMarginPercent": 53.9,
        "liabilitiesToAssetsPercent": 61.9,
        "fundamentalsFiled": "2025-11-06",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 724.26,
        "initialStop": 346.52,
        "provisionalTwoRTarget": 393.36,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": true
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 11.3%",
        "Free-cash-flow margin was 53.9%",
        "Liabilities were 61.9% of assets",
        "SEC annual facts were filed 2025-11-06 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "LLY",
      "name": "ELI LILLY & CO",
      "industry": "Consumer, Non-cyclical",
      "category": "Pharmaceuticals",
      "eligible": true,
      "score": 87.25,
      "rank": 2,
      "price": 1213.91,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 92.0,
        "fundamental": 81.9,
        "riskQuality": 83.8,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 67.5,
        "momentum3MonthPercent": 27.4,
        "annualizedVolatilityPercent": 34.6,
        "averageDollarVolume": 2065642496,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 44.7,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": 13.8,
        "liabilitiesToAssetsPercent": 76.4,
        "fundamentalsFiled": "2026-02-12",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 0,
        "estimatedPositionValue": 0.0,
        "initialStop": 1137.17,
        "provisionalTwoRTarget": 1367.39,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": true
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 44.7%",
        "Free-cash-flow margin was 13.8%",
        "Liabilities were 76.4% of assets",
        "SEC annual facts were filed 2026-02-12 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "AAPL",
      "name": "APPLE INC",
      "industry": "Technology",
      "category": "Computers",
      "eligible": true,
      "score": 82.4,
      "rank": 3,
      "price": 308.63,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 84.3,
        "fundamental": 77.5,
        "riskQuality": 82.0,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 60.3,
        "momentum3MonthPercent": 20.8,
        "annualizedVolatilityPercent": 38.7,
        "averageDollarVolume": 10715061965,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 6.4,
        "operatingMarginPercent": 32.0,
        "freeCashFlowMarginPercent": 23.7,
        "liabilitiesToAssetsPercent": 79.5,
        "fundamentalsFiled": "2025-10-31",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 617.26,
        "initialStop": 290.75,
        "provisionalTwoRTarget": 344.39,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": true
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Annual revenue growth was 6.4%",
        "Free-cash-flow margin was 23.7%",
        "Liabilities were 79.5% of assets",
        "SEC annual facts were filed 2025-10-31 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "MA",
      "name": "MASTERCARD INC - A",
      "industry": "Financial",
      "category": "Diversified Finan Serv",
      "eligible": true,
      "score": 82.1,
      "rank": 4,
      "price": 539.39,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 78.4,
        "fundamental": 75.8,
        "riskQuality": 93.6,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 71.4,
        "momentum3MonthPercent": 9.9,
        "annualizedVolatilityPercent": 23.5,
        "averageDollarVolume": 984963122,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 95.1,
        "operatingMarginPercent": 33.8,
        "freeCashFlowMarginPercent": 30.3,
        "liabilitiesToAssetsPercent": 80.3,
        "fundamentalsFiled": "2022-02-11",
        "fiscalYear": 2021
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 1,
        "estimatedPositionValue": 539.39,
        "initialStop": 515.44,
        "provisionalTwoRTarget": 587.29,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": true
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 95.1%",
        "Free-cash-flow margin was 30.3%",
        "Liabilities were 80.3% of assets",
        "SEC annual facts were filed 2022-02-11 for fiscal 2021",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "AMAT",
      "name": "APPLIED MATERIALS INC",
      "industry": "Technology",
      "category": "Semiconductors",
      "eligible": false,
      "score": 80.89,
      "rank": 5,
      "price": 603.04,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 97.7,
        "fundamental": 81.8,
        "riskQuality": 45.3,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 54.0,
        "momentum3MonthPercent": 70.7,
        "annualizedVolatilityPercent": 110.0,
        "averageDollarVolume": 4073790799,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 4.4,
        "operatingMarginPercent": 29.2,
        "freeCashFlowMarginPercent": 20.1,
        "liabilitiesToAssetsPercent": 43.8,
        "fundamentalsFiled": "2025-12-12",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 0,
        "estimatedPositionValue": 0.0,
        "initialStop": 500.1,
        "provisionalTwoRTarget": 808.93,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": true
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Volatility exceeds the configured ceiling",
        "Annual revenue growth was 4.4%",
        "Free-cash-flow margin was 20.1%",
        "Liabilities were 43.8% of assets",
        "SEC annual facts were filed 2025-12-12 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "GOOGL",
      "name": "ALPHABET INC-CL A",
      "industry": "Communications",
      "category": "Internet",
      "eligible": true,
      "score": 80.38,
      "rank": 6,
      "price": 359.91,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 67.2,
        "fundamental": 93.9,
        "riskQuality": 78.2,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 49.5,
        "momentum3MonthPercent": 21.1,
        "annualizedVolatilityPercent": 35.1,
        "averageDollarVolume": 6793882865,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 13.9,
        "operatingMarginPercent": 32.1,
        "freeCashFlowMarginPercent": 20.8,
        "liabilitiesToAssetsPercent": 27.8,
        "fundamentalsFiled": "2025-02-05",
        "fiscalYear": 2024
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 719.82,
        "initialStop": 335.39,
        "provisionalTwoRTarget": 408.95,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": true
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 13.9%",
        "Free-cash-flow margin was 20.8%",
        "Liabilities were 27.8% of assets",
        "SEC annual facts were filed 2025-02-05 for fiscal 2024",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "JNJ",
      "name": "JOHNSON & JOHNSON",
      "industry": "Consumer, Non-cyclical",
      "category": "Pharmaceuticals",
      "eligible": true,
      "score": 79.91,
      "rank": 7,
      "price": 263.04,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 76.0,
        "fundamental": 74.4,
        "riskQuality": 90.0,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 73.4,
        "momentum3MonthPercent": 8.4,
        "annualizedVolatilityPercent": 28.5,
        "averageDollarVolume": 896266328,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 6.0,
        "operatingMarginPercent": 22.9,
        "freeCashFlowMarginPercent": 20.9,
        "liabilitiesToAssetsPercent": 59.1,
        "fundamentalsFiled": "2026-02-11",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 3,
        "estimatedPositionValue": 789.12,
        "initialStop": 250.58,
        "provisionalTwoRTarget": 287.95,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": true
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 6.0%",
        "Free-cash-flow margin was 20.9%",
        "Liabilities were 59.1% of assets",
        "SEC annual facts were filed 2026-02-11 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "KO",
      "name": "COCA-COLA CO/THE",
      "industry": "Consumer, Non-cyclical",
      "category": "Beverages",
      "eligible": true,
      "score": 78.83,
      "rank": 8,
      "price": 84.14,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 81.6,
        "fundamental": 63.1,
        "riskQuality": 92.3,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 65.0,
        "momentum3MonthPercent": 11.3,
        "annualizedVolatilityPercent": 27.2,
        "averageDollarVolume": 812594945,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 1.9,
        "operatingMarginPercent": 28.7,
        "freeCashFlowMarginPercent": 11.0,
        "liabilitiesToAssetsPercent": 69.3,
        "fundamentalsFiled": "2026-02-20",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 11,
        "estimatedPositionValue": 925.54,
        "initialStop": 81.02,
        "provisionalTwoRTarget": 90.37,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": true
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 1.9%",
        "Free-cash-flow margin was 11.0%",
        "Liabilities were 69.3% of assets",
        "SEC annual facts were filed 2026-02-20 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "MRK",
      "name": "MERCK & CO INC",
      "industry": "Consumer, Non-cyclical",
      "category": "Pharmaceuticals",
      "eligible": true,
      "score": 77.43,
      "rank": 9,
      "price": 129.56,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 78.1,
        "fundamental": 67.2,
        "riskQuality": 86.1,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 66.7,
        "momentum3MonthPercent": 8.0,
        "annualizedVolatilityPercent": 33.4,
        "averageDollarVolume": 690279630,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 1.3,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": 19.0,
        "liabilitiesToAssetsPercent": 61.6,
        "fundamentalsFiled": "2026-02-24",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 7,
        "estimatedPositionValue": 906.92,
        "initialStop": 122.68,
        "provisionalTwoRTarget": 143.32,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": true
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 1.3%",
        "Free-cash-flow margin was 19.0%",
        "Liabilities were 61.6% of assets",
        "SEC annual facts were filed 2026-02-24 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "BAC",
      "name": "BANK OF AMERICA CORP",
      "industry": "Financial",
      "category": "Banks",
      "eligible": true,
      "score": 74.41,
      "rank": 10,
      "price": 58.73,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 83.5,
        "fundamental": 44.7,
        "riskQuality": 96.7,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 70.8,
        "momentum3MonthPercent": 19.8,
        "annualizedVolatilityPercent": 19.4,
        "averageDollarVolume": 1203318498,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 6.8,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": null,
        "liabilitiesToAssetsPercent": 91.1,
        "fundamentalsFiled": "2026-02-25",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 17,
        "estimatedPositionValue": 998.41,
        "initialStop": 56.32,
        "provisionalTwoRTarget": 63.56,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 6.8%",
        "Liabilities were 91.1% of assets",
        "SEC annual facts were filed 2026-02-25 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "ABBV",
      "name": "ABBVIE INC",
      "industry": "Consumer, Non-cyclical",
      "category": "Pharmaceuticals",
      "eligible": true,
      "score": 73.78,
      "rank": 11,
      "price": 261.07,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 82.4,
        "fundamental": 52.8,
        "riskQuality": 83.6,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 77.2,
        "momentum3MonthPercent": 22.4,
        "annualizedVolatilityPercent": 36.7,
        "averageDollarVolume": 713552376,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 8.6,
        "operatingMarginPercent": 24.6,
        "freeCashFlowMarginPercent": 29.1,
        "liabilitiesToAssetsPercent": 102.4,
        "fundamentalsFiled": "2026-02-20",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 3,
        "estimatedPositionValue": 783.21,
        "initialStop": 246.57,
        "provisionalTwoRTarget": 290.07,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 8.6%",
        "Free-cash-flow margin was 29.1%",
        "Liabilities were 102.4% of assets",
        "SEC annual facts were filed 2026-02-20 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "AMD",
      "name": "ADVANCED MICRO DEVICES",
      "industry": "Technology",
      "category": "Semiconductors",
      "eligible": false,
      "score": 72.89,
      "rank": 12,
      "price": 517.82,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 86.0,
        "fundamental": 68.3,
        "riskQuality": 50.1,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 52.3,
        "momentum3MonthPercent": 146.3,
        "annualizedVolatilityPercent": 89.1,
        "averageDollarVolume": 8198754232,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 34.3,
        "operatingMarginPercent": 10.7,
        "freeCashFlowMarginPercent": 19.4,
        "liabilitiesToAssetsPercent": 18.1,
        "fundamentalsFiled": "2026-02-04",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 0,
        "estimatedPositionValue": 0.0,
        "initialStop": 443.91,
        "provisionalTwoRTarget": 665.63,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Volatility exceeds the configured ceiling",
        "Annual revenue growth was 34.3%",
        "Free-cash-flow margin was 19.4%",
        "Liabilities were 18.1% of assets",
        "SEC annual facts were filed 2026-02-04 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "GS",
      "name": "GOLDMAN SACHS GROUP INC",
      "industry": "Financial",
      "category": "Banks",
      "eligible": false,
      "score": 72.12,
      "rank": 13,
      "price": 1021.0,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL - MARKET FACTORS ONLY",
      "componentScores": {
        "technical": 66.4,
        "fundamental": null,
        "riskQuality": 79.8,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 47.0,
        "momentum3MonthPercent": 19.2,
        "annualizedVolatilityPercent": 37.9,
        "averageDollarVolume": 1085091992,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": null,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": null,
        "liabilitiesToAssetsPercent": null,
        "fundamentalsFiled": null,
        "fiscalYear": null
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 0,
        "estimatedPositionValue": 0.0,
        "initialStop": 958.69,
        "provisionalTwoRTarget": 1145.61,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": false
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Point-in-time SEC fundamentals are unavailable; score uses market factors only",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "NVDA",
      "name": "NVIDIA CORP",
      "industry": "Technology",
      "category": "Semiconductors",
      "eligible": true,
      "score": 70.83,
      "rank": 14,
      "price": 194.83,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 43.3,
        "fundamental": 99.0,
        "riskQuality": 69.3,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 41.2,
        "momentum3MonthPercent": 11.0,
        "annualizedVolatilityPercent": 41.0,
        "averageDollarVolume": 16655636832,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 61.4,
        "operatingMarginPercent": 37.3,
        "freeCashFlowMarginPercent": 33.3,
        "liabilitiesToAssetsPercent": 39.8,
        "fundamentalsFiled": "2022-03-18",
        "fiscalYear": 2022
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 3,
        "estimatedPositionValue": 584.49,
        "initialStop": 182.22,
        "provisionalTwoRTarget": 220.06,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Annual revenue growth was 61.4%",
        "Free-cash-flow margin was 33.3%",
        "Liabilities were 39.8% of assets",
        "SEC annual facts were filed 2022-03-18 for fiscal 2022",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "JPM",
      "name": "JPMORGAN CHASE & CO",
      "industry": "Financial",
      "category": "Banks",
      "eligible": true,
      "score": 70.16,
      "rank": 15,
      "price": 334.47,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 81.0,
        "fundamental": 37.9,
        "riskQuality": 92.0,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 63.6,
        "momentum3MonthPercent": 13.8,
        "annualizedVolatilityPercent": 24.9,
        "averageDollarVolume": 1457912439,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 2.8,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": null,
        "liabilitiesToAssetsPercent": 91.8,
        "fundamentalsFiled": "2026-02-13",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 668.94,
        "initialStop": 318.04,
        "provisionalTwoRTarget": 367.32,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 2.8%",
        "Liabilities were 91.8% of assets",
        "SEC annual facts were filed 2026-02-13 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "TXN",
      "name": "TEXAS INSTRUMENTS INC",
      "industry": "Technology",
      "category": "Semiconductors",
      "eligible": false,
      "score": 70.01,
      "rank": 16,
      "price": 293.08,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 64.0,
        "fundamental": 83.8,
        "riskQuality": 52.4,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 47.8,
        "momentum3MonthPercent": 50.1,
        "annualizedVolatilityPercent": 68.0,
        "averageDollarVolume": 1116640849,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 13.0,
        "operatingMarginPercent": 34.1,
        "freeCashFlowMarginPercent": 14.7,
        "liabilitiesToAssetsPercent": 52.9,
        "fundamentalsFiled": "2026-02-06",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 1,
        "estimatedPositionValue": 293.08,
        "initialStop": 261.39,
        "provisionalTwoRTarget": 356.47,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Volatility exceeds the configured ceiling",
        "Annual revenue growth was 13.0%",
        "Free-cash-flow margin was 14.7%",
        "Liabilities were 52.9% of assets",
        "SEC annual facts were filed 2026-02-06 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "CSCO",
      "name": "CISCO SYSTEMS INC",
      "industry": "Communications",
      "category": "Telecommunications",
      "eligible": true,
      "score": 69.79,
      "rank": 17,
      "price": 112.69,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 69.6,
        "fundamental": 62.6,
        "riskQuality": 73.3,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 43.4,
        "momentum3MonthPercent": 45.4,
        "annualizedVolatilityPercent": 40.8,
        "averageDollarVolume": 1346733205,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 5.3,
        "operatingMarginPercent": 20.8,
        "freeCashFlowMarginPercent": 23.5,
        "liabilitiesToAssetsPercent": 61.7,
        "fundamentalsFiled": "2025-09-03",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 7,
        "estimatedPositionValue": 788.83,
        "initialStop": 105.8,
        "provisionalTwoRTarget": 126.48,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Annual revenue growth was 5.3%",
        "Free-cash-flow margin was 23.5%",
        "Liabilities were 61.7% of assets",
        "SEC annual facts were filed 2025-09-03 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "MU",
      "name": "MICRON TECHNOLOGY INC",
      "industry": "Technology",
      "category": "Semiconductors",
      "eligible": false,
      "score": 69.77,
      "rank": 18,
      "price": 975.56,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 75.3,
        "fundamental": 76.3,
        "riskQuality": 42.8,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 48.5,
        "momentum3MonthPercent": 165.2,
        "annualizedVolatilityPercent": 135.5,
        "averageDollarVolume": 37816738631,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 48.9,
        "operatingMarginPercent": 26.1,
        "freeCashFlowMarginPercent": 4.5,
        "liabilitiesToAssetsPercent": 34.6,
        "fundamentalsFiled": "2025-10-03",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 0,
        "estimatedPositionValue": 0.0,
        "initialStop": 762.2,
        "provisionalTwoRTarget": 1402.28,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Volatility exceeds the configured ceiling",
        "Annual revenue growth was 48.9%",
        "Free-cash-flow margin was 4.5%",
        "Liabilities were 34.6% of assets",
        "SEC annual facts were filed 2025-10-03 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "UNH",
      "name": "UNITEDHEALTH GROUP INC",
      "industry": "Consumer, Non-cyclical",
      "category": "Healthcare-Services",
      "eligible": true,
      "score": 69.77,
      "rank": 19,
      "price": 425.36,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 91.9,
        "fundamental": 25.4,
        "riskQuality": 89.9,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 65.3,
        "momentum3MonthPercent": 56.1,
        "annualizedVolatilityPercent": 28.5,
        "averageDollarVolume": 1485044993,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 11.8,
        "operatingMarginPercent": 4.2,
        "freeCashFlowMarginPercent": 3.6,
        "liabilitiesToAssetsPercent": 67.1,
        "fundamentalsFiled": "2026-03-02",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 850.72,
        "initialStop": 404.91,
        "provisionalTwoRTarget": 466.25,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 11.8%",
        "Free-cash-flow margin was 3.6%",
        "Liabilities were 67.1% of assets",
        "SEC annual facts were filed 2026-03-02 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "MCD",
      "name": "MC DONALD'S-CORP",
      "industry": "Consumer, Cyclical",
      "category": "Retail",
      "eligible": true,
      "score": 69.26,
      "rank": 20,
      "price": 280.63,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 51.2,
        "fundamental": 73.3,
        "riskQuality": 87.1,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 53.9,
        "momentum3MonthPercent": -8.1,
        "annualizedVolatilityPercent": 28.6,
        "averageDollarVolume": 709321790,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 3.7,
        "operatingMarginPercent": 46.1,
        "freeCashFlowMarginPercent": 26.7,
        "liabilitiesToAssetsPercent": 103.0,
        "fundamentalsFiled": "2026-02-24",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 3,
        "estimatedPositionValue": 841.89,
        "initialStop": 268.76,
        "provisionalTwoRTarget": 304.36,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "One-month performance exceeds SPY",
        "Annual revenue growth was 3.7%",
        "Free-cash-flow margin was 26.7%",
        "Liabilities were 103.0% of assets",
        "SEC annual facts were filed 2026-02-24 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "IBM",
      "name": "INTL BUSINESS MACHINES CORP",
      "industry": "Technology",
      "category": "Computers",
      "eligible": true,
      "score": 68.24,
      "rank": 21,
      "price": 289.52,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 73.9,
        "fundamental": 55.4,
        "riskQuality": 69.6,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 61.6,
        "momentum3MonthPercent": 20.0,
        "annualizedVolatilityPercent": 44.2,
        "averageDollarVolume": 1075594858,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 7.6,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": 17.9,
        "liabilitiesToAssetsPercent": 78.4,
        "fundamentalsFiled": "2026-02-24",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 579.04,
        "initialStop": 266.61,
        "provisionalTwoRTarget": 335.34,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Annual revenue growth was 7.6%",
        "Free-cash-flow margin was 17.9%",
        "Liabilities were 78.4% of assets",
        "SEC annual facts were filed 2026-02-24 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "GE",
      "name": "GENERAL ELECTRIC",
      "industry": "Industrial",
      "category": "Aerospace/Defense",
      "eligible": true,
      "score": 68.23,
      "rank": 22,
      "price": 377.52,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 83.4,
        "fundamental": 31.8,
        "riskQuality": 88.3,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 76.0,
        "momentum3MonthPercent": 29.0,
        "annualizedVolatilityPercent": 30.1,
        "averageDollarVolume": 868595910,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 14.4,
        "operatingMarginPercent": 20.2,
        "freeCashFlowMarginPercent": -3.0,
        "liabilitiesToAssetsPercent": 83.2,
        "fundamentalsFiled": "2019-02-26",
        "fiscalYear": 2018
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 755.04,
        "initialStop": 357.94,
        "provisionalTwoRTarget": 416.67,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 14.4%",
        "Free-cash-flow margin was -3.0%",
        "Liabilities were 83.2% of assets",
        "SEC annual facts were filed 2019-02-26 for fiscal 2018",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "META",
      "name": "META PLATFORMS INC-CLASS A",
      "industry": "Communications",
      "category": "Internet",
      "eligible": true,
      "score": 67.56,
      "rank": 23,
      "price": 582.9,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 39.7,
        "fundamental": 98.9,
        "riskQuality": 61.3,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 49.7,
        "momentum3MonthPercent": 0.7,
        "annualizedVolatilityPercent": 53.0,
        "averageDollarVolume": 6195686627,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 22.2,
        "operatingMarginPercent": 41.4,
        "freeCashFlowMarginPercent": 22.9,
        "liabilitiesToAssetsPercent": 40.6,
        "fundamentalsFiled": "2026-01-29",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 1,
        "estimatedPositionValue": 582.9,
        "initialStop": 536.78,
        "provisionalTwoRTarget": 675.14,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was 22.2%",
        "Free-cash-flow margin was 22.9%",
        "Liabilities were 40.6% of assets",
        "SEC annual facts were filed 2026-01-29 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "UBER",
      "name": "UBER TECHNOLOGIES INC",
      "industry": "Communications",
      "category": "Internet",
      "eligible": true,
      "score": 66.86,
      "rank": 24,
      "price": 74.43,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 52.3,
        "fundamental": 73.8,
        "riskQuality": 73.6,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 54.3,
        "momentum3MonthPercent": 3.8,
        "annualizedVolatilityPercent": 46.0,
        "averageDollarVolume": 940775688,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 18.3,
        "operatingMarginPercent": 10.7,
        "freeCashFlowMarginPercent": 18.8,
        "liabilitiesToAssetsPercent": 54.6,
        "fundamentalsFiled": "2026-02-13",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 8,
        "estimatedPositionValue": 595.44,
        "initialStop": 68.59,
        "provisionalTwoRTarget": 86.11,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "One-month performance exceeds SPY",
        "Annual revenue growth was 18.3%",
        "Free-cash-flow margin was 18.8%",
        "Liabilities were 54.6% of assets",
        "SEC annual facts were filed 2026-02-13 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "MSFT",
      "name": "MICROSOFT CORP",
      "industry": "Technology",
      "category": "Software",
      "eligible": true,
      "score": 66.84,
      "rank": 25,
      "price": 390.49,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 36.6,
        "fundamental": 93.0,
        "riskQuality": 72.1,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 49.8,
        "momentum3MonthPercent": 5.9,
        "annualizedVolatilityPercent": 38.7,
        "averageDollarVolume": 9570522864,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 14.9,
        "operatingMarginPercent": 45.6,
        "freeCashFlowMarginPercent": 25.4,
        "liabilitiesToAssetsPercent": 44.5,
        "fundamentalsFiled": "2025-07-30",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 1,
        "estimatedPositionValue": 390.49,
        "initialStop": 364.16,
        "provisionalTwoRTarget": 443.16,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was 14.9%",
        "Free-cash-flow margin was 25.4%",
        "Liabilities were 44.5% of assets",
        "SEC annual facts were filed 2025-07-30 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "CAT",
      "name": "CATERPILLAR INC",
      "industry": "Industrial",
      "category": "Machinery-Constr&Mining",
      "eligible": true,
      "score": 66.09,
      "rank": 26,
      "price": 963.53,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 92.7,
        "fundamental": 34.3,
        "riskQuality": 58.7,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 50.9,
        "momentum3MonthPercent": 32.2,
        "annualizedVolatilityPercent": 61.5,
        "averageDollarVolume": 1735849891,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 4.3,
        "operatingMarginPercent": 16.5,
        "freeCashFlowMarginPercent": 13.2,
        "liabilitiesToAssetsPercent": 78.4,
        "fundamentalsFiled": "2026-02-13",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 0,
        "estimatedPositionValue": 0.0,
        "initialStop": 874.31,
        "provisionalTwoRTarget": 1141.96,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 4.3%",
        "Free-cash-flow margin was 13.2%",
        "Liabilities were 78.4% of assets",
        "SEC annual facts were filed 2026-02-13 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "AMZN",
      "name": "AMAZON.COM INC",
      "industry": "Communications",
      "category": "Internet",
      "eligible": true,
      "score": 66.04,
      "rank": 27,
      "price": 242.67,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 62.0,
        "fundamental": 59.0,
        "riskQuality": 75.2,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 48.7,
        "momentum3MonthPercent": 15.2,
        "annualizedVolatilityPercent": 37.3,
        "averageDollarVolume": 6995344651,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 12.4,
        "operatingMarginPercent": 11.2,
        "freeCashFlowMarginPercent": 18.5,
        "liabilitiesToAssetsPercent": 49.8,
        "fundamentalsFiled": "2026-02-06",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 485.34,
        "initialStop": 225.12,
        "provisionalTwoRTarget": 277.76,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Annual revenue growth was 12.4%",
        "Free-cash-flow margin was 18.5%",
        "Liabilities were 49.8% of assets",
        "SEC annual facts were filed 2026-02-06 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "HD",
      "name": "HOME DEPOT INC",
      "industry": "Consumer, Cyclical",
      "category": "Retail",
      "eligible": true,
      "score": 66.01,
      "rank": 28,
      "price": 357.9,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 75.2,
        "fundamental": 34.7,
        "riskQuality": 88.4,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 70.1,
        "momentum3MonthPercent": 9.4,
        "annualizedVolatilityPercent": 30.5,
        "averageDollarVolume": 885985373,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 3.2,
        "operatingMarginPercent": 12.7,
        "freeCashFlowMarginPercent": 7.7,
        "liabilitiesToAssetsPercent": 87.8,
        "fundamentalsFiled": "2026-03-18",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 715.8,
        "initialStop": 340.14,
        "provisionalTwoRTarget": 393.42,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": true
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 3.2%",
        "Free-cash-flow margin was 7.7%",
        "Liabilities were 87.8% of assets",
        "SEC annual facts were filed 2026-03-18 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "TMO",
      "name": "THERMO FISHER SCIENTIFIC INC",
      "industry": "Consumer, Non-cyclical",
      "category": "Healthcare-Products",
      "eligible": false,
      "score": 64.63,
      "rank": 29,
      "price": 523.44,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 59.5,
        "fundamental": 51.0,
        "riskQuality": 85.2,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 66.8,
        "momentum3MonthPercent": 5.9,
        "annualizedVolatilityPercent": 34.5,
        "averageDollarVolume": 513740146,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 3.9,
        "operatingMarginPercent": 17.4,
        "freeCashFlowMarginPercent": 14.1,
        "liabilitiesToAssetsPercent": 51.6,
        "fundamentalsFiled": "2026-02-26",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 1,
        "estimatedPositionValue": 523.44,
        "initialStop": 495.18,
        "provisionalTwoRTarget": 579.97,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "One-month performance exceeds SPY",
        "Annual revenue growth was 3.9%",
        "Free-cash-flow margin was 14.1%",
        "Liabilities were 51.6% of assets",
        "SEC annual facts were filed 2026-02-26 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "WFC",
      "name": "WELLS FARGO & CO",
      "industry": "Financial",
      "category": "Banks",
      "eligible": false,
      "score": 64.52,
      "rank": 30,
      "price": 85.51,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 74.8,
        "fundamental": 28.4,
        "riskQuality": 91.7,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 61.8,
        "momentum3MonthPercent": 6.7,
        "annualizedVolatilityPercent": 25.7,
        "averageDollarVolume": 652584676,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": -1.6,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": null,
        "liabilitiesToAssetsPercent": 90.2,
        "fundamentalsFiled": "2020-02-27",
        "fiscalYear": 2019
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 11,
        "estimatedPositionValue": 940.61,
        "initialStop": 81.45,
        "provisionalTwoRTarget": 93.63,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "One-month performance exceeds SPY",
        "Annual revenue growth was -1.6%",
        "Liabilities were 90.2% of assets",
        "SEC annual facts were filed 2020-02-27 for fiscal 2019",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "MS",
      "name": "MORGAN STANLEY",
      "industry": "Financial",
      "category": "Banks",
      "eligible": false,
      "score": 62.11,
      "rank": 31,
      "price": 213.93,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 74.5,
        "fundamental": 25.6,
        "riskQuality": 85.7,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 52.5,
        "momentum3MonthPercent": 29.4,
        "annualizedVolatilityPercent": 32.0,
        "averageDollarVolume": 600635823,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 5.5,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": null,
        "liabilitiesToAssetsPercent": 91.0,
        "fundamentalsFiled": "2026-02-19",
        "fiscalYear": 2014
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 4,
        "estimatedPositionValue": 855.72,
        "initialStop": 201.76,
        "provisionalTwoRTarget": 238.27,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "One-month performance exceeds SPY",
        "Annual revenue growth was 5.5%",
        "Liabilities were 91.0% of assets",
        "SEC annual facts were filed 2026-02-19 for fiscal 2014",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "NFLX",
      "name": "NETFLIX INC",
      "industry": "Communications",
      "category": "Internet",
      "eligible": false,
      "score": 59.97,
      "rank": 32,
      "price": 77.65,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 27.6,
        "fundamental": 91.5,
        "riskQuality": 59.2,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 47.3,
        "momentum3MonthPercent": -18.7,
        "annualizedVolatilityPercent": 41.2,
        "averageDollarVolume": 2326730760,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 15.9,
        "operatingMarginPercent": 29.5,
        "freeCashFlowMarginPercent": 20.9,
        "liabilitiesToAssetsPercent": 52.1,
        "fundamentalsFiled": "2026-01-23",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 8,
        "estimatedPositionValue": 621.2,
        "initialStop": 72.01,
        "provisionalTwoRTarget": 88.93,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was 15.9%",
        "Free-cash-flow margin was 20.9%",
        "Liabilities were 52.1% of assets",
        "SEC annual facts were filed 2026-01-23 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "QCOM",
      "name": "QUALCOMM INC",
      "industry": "Technology",
      "category": "Semiconductors",
      "eligible": false,
      "score": 59.45,
      "rank": 33,
      "price": 176.25,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 53.8,
        "fundamental": 75.9,
        "riskQuality": 34.6,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 38.2,
        "momentum3MonthPercent": 39.0,
        "annualizedVolatilityPercent": 78.4,
        "averageDollarVolume": 2162149035,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 13.7,
        "operatingMarginPercent": 27.9,
        "freeCashFlowMarginPercent": 28.9,
        "liabilitiesToAssetsPercent": 57.7,
        "fundamentalsFiled": "2025-11-05",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 1,
        "estimatedPositionValue": 176.25,
        "initialStop": 145.47,
        "provisionalTwoRTarget": 237.8,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Volatility exceeds the configured ceiling",
        "Annual revenue growth was 13.7%",
        "Free-cash-flow margin was 28.9%",
        "Liabilities were 57.7% of assets",
        "SEC annual facts were filed 2025-11-05 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "AVGO",
      "name": "BROADCOM INC",
      "industry": "Technology",
      "category": "Semiconductors",
      "eligible": false,
      "score": 58.66,
      "rank": 34,
      "price": 360.45,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 45.2,
        "fundamental": 76.9,
        "riskQuality": 44.5,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 39.7,
        "momentum3MonthPercent": 15.2,
        "annualizedVolatilityPercent": 71.9,
        "averageDollarVolume": 7041056995,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 23.9,
        "operatingMarginPercent": 39.9,
        "freeCashFlowMarginPercent": 42.1,
        "liabilitiesToAssetsPercent": 52.5,
        "fundamentalsFiled": "2025-12-18",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 1,
        "estimatedPositionValue": 360.45,
        "initialStop": 329.48,
        "provisionalTwoRTarget": 422.39,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Three-month momentum exceeds 10%",
        "Volatility exceeds the configured ceiling",
        "Annual revenue growth was 23.9%",
        "Free-cash-flow margin was 42.1%",
        "Liabilities were 52.5% of assets",
        "SEC annual facts were filed 2025-12-18 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "XOM",
      "name": "EXXONMOBIL HOLDINGS CORP",
      "industry": "Energy",
      "category": "Oil&Gas",
      "eligible": false,
      "score": 57.96,
      "rank": 35,
      "price": 137.09,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 29.9,
        "fundamental": 65.9,
        "riskQuality": 84.7,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 36.9,
        "momentum3MonthPercent": -14.2,
        "annualizedVolatilityPercent": 23.1,
        "averageDollarVolume": 1026054819,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 52.4,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": 13.0,
        "liabilitiesToAssetsPercent": 48.2,
        "fundamentalsFiled": "2022-02-23",
        "fiscalYear": 2021
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 7,
        "estimatedPositionValue": 959.63,
        "initialStop": 130.85,
        "provisionalTwoRTarget": 149.56,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Annual revenue growth was 52.4%",
        "Free-cash-flow margin was 13.0%",
        "Liabilities were 48.2% of assets",
        "SEC annual facts were filed 2022-02-23 for fiscal 2021",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "ADBE",
      "name": "ADOBE INC",
      "industry": "Technology",
      "category": "Software",
      "eligible": false,
      "score": 57.65,
      "rank": 36,
      "price": 219.72,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 27.2,
        "fundamental": 85.4,
        "riskQuality": 58.7,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 50.7,
        "momentum3MonthPercent": -9.0,
        "annualizedVolatilityPercent": 50.6,
        "averageDollarVolume": 1108935533,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 10.5,
        "operatingMarginPercent": 36.6,
        "freeCashFlowMarginPercent": 41.4,
        "liabilitiesToAssetsPercent": 60.6,
        "fundamentalsFiled": "2026-01-15",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 439.44,
        "initialStop": 201.7,
        "provisionalTwoRTarget": 255.75,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was 10.5%",
        "Free-cash-flow margin was 41.4%",
        "Liabilities were 60.6% of assets",
        "SEC annual facts were filed 2026-01-15 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "DIS",
      "name": "WALT DISNEY CO/THE",
      "industry": "Communications",
      "category": "Media",
      "eligible": false,
      "score": 57.37,
      "rank": 37,
      "price": 99.5,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 41.3,
        "fundamental": 48.2,
        "riskQuality": 88.6,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 49.3,
        "momentum3MonthPercent": 3.8,
        "annualizedVolatilityPercent": 26.6,
        "averageDollarVolume": 572276967,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 3.4,
        "operatingMarginPercent": 18.6,
        "freeCashFlowMarginPercent": 10.7,
        "liabilitiesToAssetsPercent": 44.4,
        "fundamentalsFiled": "2025-11-13",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 10,
        "estimatedPositionValue": 995.0,
        "initialStop": 94.55,
        "provisionalTwoRTarget": 109.4,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "One-month performance exceeds SPY",
        "Annual revenue growth was 3.4%",
        "Free-cash-flow margin was 10.7%",
        "Liabilities were 44.4% of assets",
        "SEC annual facts were filed 2025-11-13 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "NOW",
      "name": "SERVICENOW INC",
      "industry": "Technology",
      "category": "Software",
      "eligible": false,
      "score": 56.05,
      "rank": 38,
      "price": 106.32,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 43.8,
        "fundamental": 69.5,
        "riskQuality": 46.3,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 54.9,
        "momentum3MonthPercent": 2.2,
        "annualizedVolatilityPercent": 63.8,
        "averageDollarVolume": 1579288509,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 20.9,
        "operatingMarginPercent": 13.7,
        "freeCashFlowMarginPercent": 34.5,
        "liabilitiesToAssetsPercent": 50.2,
        "fundamentalsFiled": "2026-01-29",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 4,
        "estimatedPositionValue": 425.28,
        "initialStop": 95.88,
        "provisionalTwoRTarget": 127.21,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was 20.9%",
        "Free-cash-flow margin was 34.5%",
        "Liabilities were 50.2% of assets",
        "SEC annual facts were filed 2026-01-29 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "BA",
      "name": "BOEING CO/THE",
      "industry": "Industrial",
      "category": "Aerospace/Defense",
      "eligible": false,
      "score": 55.03,
      "rank": 39,
      "price": 226.49,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 79.7,
        "fundamental": 0.0,
        "riskQuality": 83.2,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 56.1,
        "momentum3MonthPercent": 9.2,
        "annualizedVolatilityPercent": 35.9,
        "averageDollarVolume": 624821063,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": -24.3,
        "operatingMarginPercent": -2.6,
        "freeCashFlowMarginPercent": -5.6,
        "liabilitiesToAssetsPercent": 106.4,
        "fundamentalsFiled": "2020-01-31",
        "fiscalYear": 2019
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 3,
        "estimatedPositionValue": 679.47,
        "initialStop": 213.65,
        "provisionalTwoRTarget": 252.16,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "One-month performance exceeds SPY",
        "Annual revenue growth was -24.3%",
        "Free-cash-flow margin was -5.6%",
        "Liabilities were 106.4% of assets",
        "SEC annual facts were filed 2020-01-31 for fiscal 2019",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "COP",
      "name": "CONOCOPHILLIPS",
      "industry": "Energy",
      "category": "Oil&Gas",
      "eligible": false,
      "score": 52.99,
      "rank": 40,
      "price": 104.73,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 27.4,
        "fundamental": 60.0,
        "riskQuality": 75.5,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 34.7,
        "momentum3MonthPercent": -17.8,
        "annualizedVolatilityPercent": 30.3,
        "averageDollarVolume": 390861958,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 4.9,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": 18.6,
        "liabilitiesToAssetsPercent": 47.1,
        "fundamentalsFiled": "2026-02-17",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 8,
        "estimatedPositionValue": 837.84,
        "initialStop": 99.12,
        "provisionalTwoRTarget": 115.95,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Price is above its 200-day moving average",
        "Annual revenue growth was 4.9%",
        "Free-cash-flow margin was 18.6%",
        "Liabilities were 47.1% of assets",
        "SEC annual facts were filed 2026-02-17 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "CRM",
      "name": "SALESFORCE INC",
      "industry": "Technology",
      "category": "Software",
      "eligible": false,
      "score": 52.3,
      "rank": 41,
      "price": 166.11,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 23.5,
        "fundamental": 67.9,
        "riskQuality": 67.3,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 50.0,
        "momentum3MonthPercent": -10.4,
        "annualizedVolatilityPercent": 38.2,
        "averageDollarVolume": 1271605770,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 9.6,
        "operatingMarginPercent": 20.1,
        "freeCashFlowMarginPercent": 34.7,
        "liabilitiesToAssetsPercent": 47.3,
        "fundamentalsFiled": "2026-03-02",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 4,
        "estimatedPositionValue": 664.44,
        "initialStop": 154.04,
        "provisionalTwoRTarget": 190.24,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was 9.6%",
        "Free-cash-flow margin was 34.7%",
        "Liabilities were 47.3% of assets",
        "SEC annual facts were filed 2026-03-02 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "NKE",
      "name": "NIKE INC -CL B",
      "industry": "Consumer, Cyclical",
      "category": "Apparel",
      "eligible": false,
      "score": 51.81,
      "rank": 42,
      "price": 44.09,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 52.8,
        "fundamental": 24.0,
        "riskQuality": 79.7,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 53.3,
        "momentum3MonthPercent": -0.3,
        "annualizedVolatilityPercent": 38.8,
        "averageDollarVolume": 752674951,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": -9.8,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": 7.1,
        "liabilitiesToAssetsPercent": 63.9,
        "fundamentalsFiled": "2025-07-17",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 16,
        "estimatedPositionValue": 705.44,
        "initialStop": 41.14,
        "provisionalTwoRTarget": 50.0,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "One-month performance exceeds SPY",
        "Annual revenue growth was -9.8%",
        "Free-cash-flow margin was 7.1%",
        "Liabilities were 63.9% of assets",
        "SEC annual facts were filed 2025-07-17 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "INTU",
      "name": "INTUIT INC",
      "industry": "Technology",
      "category": "Software",
      "eligible": false,
      "score": 51.23,
      "rank": 43,
      "price": 275.35,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 16.5,
        "fundamental": 83.7,
        "riskQuality": 51.1,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 42.7,
        "momentum3MonthPercent": -35.1,
        "annualizedVolatilityPercent": 42.2,
        "averageDollarVolume": 927386301,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 15.6,
        "operatingMarginPercent": 26.1,
        "freeCashFlowMarginPercent": 32.5,
        "liabilitiesToAssetsPercent": 46.7,
        "fundamentalsFiled": "2025-09-03",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 2,
        "estimatedPositionValue": 550.7,
        "initialStop": 251.77,
        "provisionalTwoRTarget": 322.52,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was 15.6%",
        "Free-cash-flow margin was 32.5%",
        "Liabilities were 46.7% of assets",
        "SEC annual facts were filed 2025-09-03 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "PEP",
      "name": "PEPSICO INC",
      "industry": "Consumer, Non-cyclical",
      "category": "Beverages",
      "eligible": false,
      "score": 50.67,
      "rank": 44,
      "price": 144.22,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 39.5,
        "fundamental": 30.3,
        "riskQuality": 88.4,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 52.4,
        "momentum3MonthPercent": -5.8,
        "annualizedVolatilityPercent": 27.2,
        "averageDollarVolume": 574098151,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 2.3,
        "operatingMarginPercent": 12.2,
        "freeCashFlowMarginPercent": 8.2,
        "liabilitiesToAssetsPercent": 80.9,
        "fundamentalsFiled": "2026-02-03",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 6,
        "estimatedPositionValue": 865.32,
        "initialStop": 137.45,
        "provisionalTwoRTarget": 157.75,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "One-month performance exceeds SPY",
        "Annual revenue growth was 2.3%",
        "Free-cash-flow margin was 8.2%",
        "Liabilities were 80.9% of assets",
        "SEC annual facts were filed 2026-02-03 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "COST",
      "name": "COSTCO WHOLESALE CORP",
      "industry": "Consumer, Cyclical",
      "category": "Retail",
      "eligible": false,
      "score": 43.34,
      "rank": 45,
      "price": 951.67,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 22.6,
        "fundamental": 27.1,
        "riskQuality": 89.8,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 44.8,
        "momentum3MonthPercent": -4.4,
        "annualizedVolatilityPercent": 19.8,
        "averageDollarVolume": 938598262,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 8.2,
        "operatingMarginPercent": 3.8,
        "freeCashFlowMarginPercent": 2.8,
        "liabilitiesToAssetsPercent": 62.2,
        "fundamentalsFiled": "2025-10-08",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 1,
        "estimatedPositionValue": 951.67,
        "initialStop": 913.1,
        "provisionalTwoRTarget": 1028.8,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "One-month performance exceeds SPY",
        "Annual revenue growth was 8.2%",
        "Free-cash-flow margin was 2.8%",
        "Liabilities were 62.2% of assets",
        "SEC annual facts were filed 2025-10-08 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "ORCL",
      "name": "ORACLE CORP",
      "industry": "Technology",
      "category": "Software",
      "eligible": false,
      "score": 40.43,
      "rank": 46,
      "price": 140.27,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 15.3,
        "fundamental": 61.1,
        "riskQuality": 38.6,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 26.7,
        "momentum3MonthPercent": -3.1,
        "annualizedVolatilityPercent": 54.3,
        "averageDollarVolume": 3146086261,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 17.3,
        "operatingMarginPercent": 30.6,
        "freeCashFlowMarginPercent": -35.2,
        "liabilitiesToAssetsPercent": 83.8,
        "fundamentalsFiled": "2026-06-22",
        "fiscalYear": 2026
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 3,
        "estimatedPositionValue": 420.81,
        "initialStop": 123.81,
        "provisionalTwoRTarget": 173.19,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was 17.3%",
        "Free-cash-flow margin was -35.2%",
        "Liabilities were 83.8% of assets",
        "SEC annual facts were filed 2026-06-22 for fiscal 2026",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "CVX",
      "name": "CHEVRON CORP",
      "industry": "Energy",
      "category": "Oil&Gas",
      "eligible": false,
      "score": 38.19,
      "rank": 47,
      "price": 169.2,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 11.9,
        "fundamental": 27.6,
        "riskQuality": 84.5,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 35.8,
        "momentum3MonthPercent": -13.5,
        "annualizedVolatilityPercent": 24.0,
        "averageDollarVolume": 735477610,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": -4.6,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": 9.0,
        "liabilitiesToAssetsPercent": 40.7,
        "fundamentalsFiled": "2026-02-24",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 5,
        "estimatedPositionValue": 846.0,
        "initialStop": 161.46,
        "provisionalTwoRTarget": 184.69,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was -4.6%",
        "Free-cash-flow margin was 9.0%",
        "Liabilities were 40.7% of assets",
        "SEC annual facts were filed 2026-02-24 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "WMT",
      "name": "WALMART INC",
      "industry": "Consumer, Cyclical",
      "category": "Retail",
      "eligible": false,
      "score": 37.85,
      "rank": 48,
      "price": 111.84,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 18.9,
        "fundamental": 20.3,
        "riskQuality": 81.8,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 35.6,
        "momentum3MonthPercent": -10.2,
        "annualizedVolatilityPercent": 25.1,
        "averageDollarVolume": 1427202132,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": 4.7,
        "operatingMarginPercent": 4.2,
        "freeCashFlowMarginPercent": 2.1,
        "liabilitiesToAssetsPercent": 65.0,
        "fundamentalsFiled": "2026-03-13",
        "fiscalYear": 2026
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 8,
        "estimatedPositionValue": 894.72,
        "initialStop": 106.06,
        "provisionalTwoRTarget": 123.41,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "One-month performance exceeds SPY",
        "Annual revenue growth was 4.7%",
        "Free-cash-flow margin was 2.1%",
        "Liabilities were 65.0% of assets",
        "SEC annual facts were filed 2026-03-13 for fiscal 2026",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "PFE",
      "name": "PFIZER INC",
      "industry": "Consumer, Non-cyclical",
      "category": "Pharmaceuticals",
      "eligible": false,
      "score": 36.79,
      "rank": 49,
      "price": 24.32,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 14.9,
        "fundamental": 18.9,
        "riskQuality": 86.2,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 40.0,
        "momentum3MonthPercent": -13.4,
        "annualizedVolatilityPercent": 24.2,
        "averageDollarVolume": 827986911,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": -49.7,
        "operatingMarginPercent": null,
        "freeCashFlowMarginPercent": 9.4,
        "liabilitiesToAssetsPercent": 60.6,
        "fundamentalsFiled": "2024-02-22",
        "fiscalYear": 2023
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 41,
        "estimatedPositionValue": 997.12,
        "initialStop": 23.14,
        "provisionalTwoRTarget": 26.69,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": true
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was -49.7%",
        "Free-cash-flow margin was 9.4%",
        "Liabilities were 60.6% of assets",
        "SEC annual facts were filed 2024-02-22 for fiscal 2023",
        "News sentiment is not included in this scan"
      ]
    },
    {
      "symbol": "TSLA",
      "name": "TESLA INC",
      "industry": "Consumer, Cyclical",
      "category": "Auto Manufacturers",
      "eligible": false,
      "score": 36.37,
      "rank": 50,
      "price": 393.45,
      "asOf": "2026-07-02",
      "dataSource": "IBKR PAPER HISTORICAL + SEC EDGAR",
      "componentScores": {
        "technical": 31.2,
        "fundamental": 18.9,
        "riskQuality": 55.7,
        "sentiment": null,
        "marketRegime": 100.0
      },
      "metrics": {
        "rsi14": 46.8,
        "momentum3MonthPercent": 3.2,
        "annualizedVolatilityPercent": 62.6,
        "averageDollarVolume": 14084824621,
        "dataAgeHours": 56.6,
        "revenueGrowthPercent": -2.9,
        "operatingMarginPercent": 4.6,
        "freeCashFlowMarginPercent": 6.6,
        "liabilitiesToAssetsPercent": 39.9,
        "fundamentalsFiled": "2026-01-29",
        "fiscalYear": 2025
      },
      "riskPlan": {
        "direction": "LONG",
        "suggestedShares": 1,
        "estimatedPositionValue": 393.45,
        "initialStop": 355.36,
        "provisionalTwoRTarget": 469.64,
        "riskBudget": 50.0
      },
      "tradeAction": "NO TRADE",
      "tradeReadiness": {
        "automaticPassed": false,
        "automaticChecks": [
          {
            "id": "eligible",
            "label": "Basic market-data screening passed",
            "passed": false
          },
          {
            "id": "risk_on",
            "label": "Market regime is RISK-ON",
            "passed": true
          },
          {
            "id": "score_75",
            "label": "Composite score is at least 75",
            "passed": false
          },
          {
            "id": "fundamentals",
            "label": "Point-in-time fundamental score is available",
            "passed": true
          },
          {
            "id": "risk_quality",
            "label": "Risk-quality score is at least 60",
            "passed": false
          },
          {
            "id": "fresh_data",
            "label": "Market data passes the freshness limit",
            "passed": true
          },
          {
            "id": "completed_bar",
            "label": "Signal uses a completed US daily session",
            "passed": true
          },
          {
            "id": "earnings_clear",
            "label": "No earnings announcement within two trading days",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          },
          {
            "id": "news_clear",
            "label": "No serious adverse post-session news was flagged",
            "passed": false,
            "detail": "Automated evidence has not been fetched"
          }
        ],
        "manualChecks": [],
        "paperTradeReady": false,
        "meaning": "One or more automated paper-trade checks failed or lacked evidence."
      },
      "marketEvidence": {
        "fresh": false,
        "checkedAt": null,
        "earnings": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        },
        "news": {
          "available": false,
          "passed": false,
          "reason": "Automated evidence has not been fetched"
        }
      },
      "reasons": [
        "Annual revenue growth was -2.9%",
        "Free-cash-flow margin was 6.6%",
        "Liabilities were 39.9% of assets",
        "SEC annual facts were filed 2026-01-29 for fiscal 2025",
        "News sentiment is not included in this scan"
      ]
    }
  ]
};
