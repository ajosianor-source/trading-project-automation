# Exness Guard Watchdog

The watchdog is independent of MT5. It checks the shared `live.json` heartbeat
every 10 seconds and checks the local WhatsApp relay health endpoint. A feed
older than 20 seconds is stale.

Start it after the Exness MT5 terminal and WhatsApp relay:

`Start-ExnessGuard-Watchdog.cmd`

It writes:

- `runtime/watchdog.log`: timestamped health checks and alert outcomes.
- `runtime/watchdog-state.json`: the last feed and relay states, used to avoid
  repeating the same warning every ten seconds.

When the feed changes to stale, missing, or invalid, the watchdog sends one
warning through the local relay if the relay is available. It sends one
recovery message when the feed becomes healthy again. It never places,
modifies, or closes a trade.

For a one-time diagnostic:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Watch-ExnessGuard.ps1 -Once
```

Keep the watchdog window open during forward observation. If it reports a
stale feed, check only the separate Exness terminal, its XAUUSDm H1 chart, and
the ExnessGoldGuard EA. The FTMO terminal is unrelated.

