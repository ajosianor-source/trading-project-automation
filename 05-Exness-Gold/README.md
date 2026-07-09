# Exness Gold Guard: Project 05

A separate standalone project for a small Exness live account design.

This project contains a dedicated `mt5` preset set and a new micro-account live
preset for a $300 account, without modifying `01`–`04`.

## Purpose

- Keep Project 05 independent from the existing `03-Exness-XAUUSD` codebase.
- Provide a new live-account preset that is intended for small deposits and
  uses the same EA engine with separate configuration.
- Preserve the original research and validation workflows in project `03`.

## Files

- `mt5/ExnessGoldGuard.mq5` — copied source from the original Exness Gold Guard.
- `mt5/ExnessGoldGuard_LIVE_MICRO_300.set` — new high-risk $300 live preset.

## Usage

1. In Exness MT5, copy `mt5/ExnessGoldGuard.mq5` into `MQL5/Experts`.
2. Compile with MetaEditor.
3. Attach `ExnessGoldGuard` to the XAUUSDm H1 chart.
4. Load `mt5/ExnessGoldGuard_LIVE_MICRO_300.set`.
5. Set `InpAuthorizedAccount` to the exact Exness live login.
6. Keep `InpLiveConfirmation = I_ACCEPT_LIVE_RISK`.

## Important

This preset is higher-risk by design. It is for a separate project with its own
validation and trading assumptions; it does not affect the original project
`03-Exness-XAUUSD`.
