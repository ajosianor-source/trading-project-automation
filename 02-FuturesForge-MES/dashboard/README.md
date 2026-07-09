# Dashboard

Standalone, dependency-free FuturesForge MES research console.

Open `index.html` directly in a browser. It currently provides:

- simulated session and VWAP context;
- local candle CSV import with schema and data-quality checks;
- a tick-aware MES risk-sizing calculator;
- daily risk-limit and deployment-gate visibility;
- the frozen strategy research queue; and
- explicit platform, feed, and paper-account connection status.

All market figures are illustrative. The dashboard is read-only and has no
order-routing code. A selected platform, genuine CME feed, rollover map,
exchange calendar, and paper-validation period remain required.

Use `../data/mes-sample.csv` to exercise the import flow.
