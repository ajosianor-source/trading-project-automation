# Security model

## Enforced controls

- Dashboard binds only to `127.0.0.1`, validates `Host` and `Origin`, is
  read-only, uses an asset allowlist, removes wildcard CORS, limits JSON sizes,
  suppresses internal errors, and sends CSP and browser hardening headers.
- Journal-derived dashboard strings are HTML-escaped and journal processing has
  file-size, row-count, string-length, and numeric-parse limits.
- External messaging is disabled in the EA. The optional relay is loopback-only,
  requires a 32+ character bearer token, limits request bodies, accepts only
  `text/plain`, and contains no shell/PowerShell execution path.
- Live execution remains locked to the configured Exness server, exact account,
  confirmation phrase, magic number, symbol, risk limits, news availability,
  current ticks, spreads, margin, daily trade count and protected SL/TP.
- Runtime feeds, logs and local credentials are excluded from Git.

## Local file protection

Run this once, and again after moving the project or terminal data:

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\tools\Protect-ExnessGuardFiles.ps1
```

It restricts the Common Files feed, relay configuration and runtime directory
to the current Windows account and `SYSTEM`.

## Remaining trust boundary

These controls do not protect against malware already running as the same
Windows user, an Administrator, a compromised broker/MT5 installation, or a
stolen unlocked session. Use Windows Update, Defender, disk encryption, a
non-administrator daily account, MT5 account protection, and never expose ports
3030 or 8787 through firewall forwarding, tunnels or router port forwarding.
