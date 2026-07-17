# Exness Guard Watchdog

The watchdog is independent of MT5. It checks the shared `live.json` heartbeat
every 10 seconds. Relay checks and external alerts are disabled by default. A
feed older than 20 seconds is stale.

Start it after the Exness MT5 terminal:

`Start-ExnessGuard-Watchdog.cmd`

It writes:

- `runtime/watchdog.log`: timestamped health checks and alert outcomes.
- `runtime/watchdog-state.json`: the last feed and relay states, used to avoid
  repeating the same warning every ten seconds.

It never places, modifies, or closes a trade. To opt into the hardened relay,
configure a random 32+ character `relay_token` and Telegram credentials in the
ignored `config.json`, then pass `-EnableRelayAlerts`. Authenticated warning and
recovery messages are then enabled.

For a one-time diagnostic:

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\tools\Watch-ExnessGuard.ps1 -Once
```

Keep the watchdog window open during forward observation. If it reports a
stale feed, check only the separate Exness terminal, its XAUUSDm H1 chart, and
the ExnessGoldGuard EA. The FTMO terminal is unrelated.
