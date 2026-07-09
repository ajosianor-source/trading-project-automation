# Data

Document dataset source, license, timezone, bar construction, contract mapping,
roll adjustment, missing intervals, and quality checks here.

Do not commit licensed or large raw futures datasets to the project.

## Dashboard CSV format

`mes-sample.csv` is a small synthetic fixture demonstrating the dashboard's
accepted schema:

```text
timestamp,open,high,low,close,volume
```

- Timestamps must be ISO 8601 values with `Z` or an explicit UTC offset.
- OHLC prices must be numeric and should align with the MES 0.25 tick.
- Volume must be numeric and non-negative.
- Rows may arrive unsorted; the importer sorts them and reports duplicates,
  malformed rows, tick errors, and likely interval gaps.

The sample is illustrative and is not historical CME market data.
