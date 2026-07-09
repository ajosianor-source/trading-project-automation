# Operations

## Modes

- `demo`: deterministic synthetic data for software testing only
- `research`: real provider data, ranking, and risk plans; no orders
- `paper`: paper orders can be enabled after all explicit gates are satisfied
- `live`: unsupported

## Daily research checklist

1. Confirm provider status, timestamp, and benchmark regime.
2. Reject any scan labelled synthetic, stale, incomplete, or rate-limited.
3. Inspect component scores rather than relying on total rank.
4. Read recent 10-K, 10-Q, 8-K, ownership, and insider filings.
5. Check earnings date, corporate actions, trading halts, and material news.
6. Verify spread, liquidity, and price using the broker's current quote.
7. Recalculate position size from actual account equity and current ATR.
8. Use a limit order in paper trading and review the simulated fill.
9. Record the thesis, invalidation condition, and maximum loss.

## Enabling Alpaca paper routing

Copy the example configuration:

```powershell
Copy-Item .\config\stocks.example.json .\config\stocks.local.json
```

In the local file, set:

```json
"mode": "paper",
"orderRoutingEnabled": true
```

Set paper credentials only in the environment:

```powershell
$env:APCA_API_KEY_ID = "paper-key"
$env:APCA_API_SECRET_KEY = "paper-secret"
```

First run without `-Submit`. Only after checking the printed payload, use:

```powershell
.\tools\Submit-AlpacaPaperOrder.ps1 `
  -Symbol MSFT -Side buy -Quantity 1 -LimitPrice 100 `
  -Submit -Confirmation "SUBMIT PAPER ORDER"
```

## Failure policy

Do not rank or trade through:

- missing or stale data
- provider errors or throttling
- an unknown market regime
- prices that disagree materially between providers
- an unreviewed earnings release or material filing
- a broker/session state that cannot be confirmed

There is no automatic failover from paper to live trading.
