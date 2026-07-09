from __future__ import annotations

import csv
import json
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


class IbkrDependencyError(RuntimeError):
    pass


class IbkrConnectionError(RuntimeError):
    pass


@dataclass(frozen=True)
class IbkrConnectionConfig:
    host: str = "127.0.0.1"
    port: int = 7497
    client_id: int = 41
    timeout_seconds: float = 12.0
    environment: str = "paper"

    def __post_init__(self) -> None:
        if self.host not in {"127.0.0.1", "localhost"}:
            raise ValueError("StockForge permits only a local IBKR API host.")
        if self.environment != "paper":
            raise ValueError("The IBKR adapter currently permits paper mode only.")
        if self.port not in {7497, 4002}:
            raise ValueError("Expected TWS paper port 7497 or Gateway paper port 4002.")
        if not 1 <= self.client_id <= 2_147_483_647:
            raise ValueError("IBKR client_id must be a positive 32-bit integer.")


@dataclass
class IbkrDiagnosticResult:
    connected: bool = False
    server_time: str | None = None
    next_valid_order_id_seen: bool = False
    managed_accounts: list[str] = field(default_factory=list)
    account_summary: dict[str, dict[str, str]] = field(default_factory=dict)
    messages: list[str] = field(default_factory=list)
    environment: str = "paper"
    orders_enabled_by_stockforge: bool = False


def _import_ibapi():
    try:
        from ibapi.client import EClient
        from ibapi.contract import Contract
        from ibapi.wrapper import EWrapper
    except ImportError as error:
        raise IbkrDependencyError(
            "The official IBKR Python API is not installed in the StockForge "
            "environment. Install TWS API, then run tools/Install-IbkrPythonApi.ps1."
        ) from error
    return EClient, EWrapper, Contract


def diagnose(config: IbkrConnectionConfig) -> IbkrDiagnosticResult:
    EClient, EWrapper, _ = _import_ibapi()
    ready = threading.Event()
    summary_done = threading.Event()
    result = IbkrDiagnosticResult(environment=config.environment)

    class DiagnosticApp(EWrapper, EClient):
        def __init__(self):
            EClient.__init__(self, self)

        def nextValidId(self, order_id: int):  # noqa: N802 - IBKR callback name
            result.next_valid_order_id_seen = True
            result.connected = True
            ready.set()

        def currentTime(self, epoch: int):  # noqa: N802
            result.server_time = datetime.fromtimestamp(
                epoch, tz=timezone.utc
            ).isoformat()

        def managedAccounts(self, accounts: str):  # noqa: N802
            result.managed_accounts = [
                value.strip() for value in accounts.split(",") if value.strip()
            ]

        def accountSummary(  # noqa: N802
            self, req_id: int, account: str, tag: str, value: str, currency: str
        ):
            result.account_summary.setdefault(account, {})[tag] = (
                f"{value} {currency}".strip()
            )

        def accountSummaryEnd(self, req_id: int):  # noqa: N802
            summary_done.set()

        def error(
            self,
            req_id: int,
            error_time: int,
            error_code: int,
            error_string: str,
            *args,
        ):
            informational = {2104, 2106, 2107, 2108, 2158}
            prefix = "INFO" if error_code in informational else "ERROR"
            result.messages.append(
                f"{prefix} {error_code} req={req_id}: {error_string}"
            )

    app = DiagnosticApp()
    try:
        app.connect(config.host, config.port, config.client_id)
        if not app.isConnected():
            raise IbkrConnectionError("IBKR socket connection was not accepted.")
        network_thread = threading.Thread(target=app.run, daemon=True)
        network_thread.start()
        if not ready.wait(config.timeout_seconds):
            raise IbkrConnectionError(
                "No IBKR API handshake. Confirm TWS/IB Gateway is running, logged "
                "into PAPER, socket clients are enabled, and the paper port matches."
            )
        app.reqCurrentTime()
        app.reqManagedAccts()
        app.reqAccountSummary(
            9001,
            "All",
            "AccountType,NetLiquidation,TotalCashValue,BuyingPower,Currency",
        )
        summary_done.wait(min(config.timeout_seconds, 8))
        time.sleep(0.25)
        return result
    finally:
        if app.isConnected():
            app.disconnect()


def fetch_daily_bars(
    config: IbkrConnectionConfig,
    symbols: Iterable[str],
    output_path: Path,
    duration: str = "2 Y",
    timeout_per_symbol: float = 30.0,
) -> dict[str, Any]:
    EClient, EWrapper, Contract = _import_ibapi()
    ready = threading.Event()
    request_events: dict[int, threading.Event] = {}
    rows: list[dict[str, Any]] = []
    errors: list[str] = []

    class HistoricalApp(EWrapper, EClient):
        def __init__(self):
            EClient.__init__(self, self)

        def nextValidId(self, order_id: int):  # noqa: N802
            ready.set()

        def historicalData(self, req_id: int, bar):  # noqa: N802
            bar_date = str(bar.date)
            if len(bar_date) == 8 and bar_date.isdigit():
                bar_date = datetime.strptime(bar_date, "%Y%m%d").date().isoformat()
            rows.append(
                {
                    "timestamp": bar_date,
                    "symbol": request_symbols[req_id],
                    "open": bar.open,
                    "high": bar.high,
                    "low": bar.low,
                    "close": bar.close,
                    "volume": bar.volume,
                }
            )

        def historicalDataEnd(self, req_id: int, start: str, end: str):  # noqa: N802
            request_events[req_id].set()

        def error(
            self,
            req_id: int,
            error_time: int,
            error_code: int,
            error_string: str,
            *args,
        ):
            informational = {2104, 2106, 2107, 2108, 2158}
            if error_code not in informational:
                errors.append(f"{error_code} req={req_id}: {error_string}")
                if req_id in request_events:
                    request_events[req_id].set()

    clean_symbols = []
    for raw_symbol in symbols:
        symbol = str(raw_symbol).strip().upper()
        if symbol and symbol.replace(".", "").replace("-", "").isalnum():
            clean_symbols.append(symbol)
        else:
            raise ValueError(f"Invalid stock symbol: {raw_symbol!r}")
    clean_symbols = list(dict.fromkeys(clean_symbols))
    if not clean_symbols:
        raise ValueError("At least one stock symbol is required.")

    request_symbols = {index + 1000: symbol for index, symbol in enumerate(clean_symbols)}
    app = HistoricalApp()
    try:
        app.connect(config.host, config.port, config.client_id)
        if not app.isConnected():
            raise IbkrConnectionError("IBKR socket connection was not accepted.")
        threading.Thread(target=app.run, daemon=True).start()
        if not ready.wait(config.timeout_seconds):
            raise IbkrConnectionError("No IBKR API handshake for market data.")

        for request_id, symbol in request_symbols.items():
            event = threading.Event()
            request_events[request_id] = event
            contract = Contract()
            contract.symbol = symbol
            contract.secType = "STK"
            contract.exchange = "SMART"
            contract.currency = "USD"
            app.reqHistoricalData(
                request_id,
                contract,
                "",
                duration,
                "1 day",
                "ADJUSTED_LAST",
                1,
                1,
                False,
                [],
            )
            if not event.wait(timeout_per_symbol):
                errors.append(f"Timeout requesting {symbol}")
                app.cancelHistoricalData(request_id)
            time.sleep(0.15)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=[
                    "timestamp",
                    "symbol",
                    "open",
                    "high",
                    "low",
                    "close",
                    "volume",
                ],
            )
            writer.writeheader()
            writer.writerows(sorted(rows, key=lambda item: (item["timestamp"], item["symbol"])))
        return {
            "symbols_requested": len(clean_symbols),
            "rows_written": len(rows),
            "output": str(output_path),
            "errors": errors,
            "orders_enabled_by_stockforge": False,
        }
    finally:
        if app.isConnected():
            app.disconnect()


def fetch_contract_metadata(
    config: IbkrConnectionConfig,
    symbols: Iterable[str],
    output_path: Path,
    timeout_per_symbol: float = 15.0,
) -> dict[str, Any]:
    EClient, EWrapper, Contract = _import_ibapi()
    ready = threading.Event()
    request_events: dict[int, threading.Event] = {}
    metadata: dict[str, dict[str, Any]] = {}
    errors: list[str] = []

    class MetadataApp(EWrapper, EClient):
        def __init__(self):
            EClient.__init__(self, self)

        def nextValidId(self, order_id: int):  # noqa: N802
            ready.set()

        def contractDetails(self, req_id: int, details):  # noqa: N802
            symbol = request_symbols[req_id]
            contract = details.contract
            existing = metadata.get(symbol)
            candidate = {
                "symbol": symbol,
                "name": details.longName or contract.localSymbol or symbol,
                "conId": contract.conId,
                "securityType": contract.secType,
                "currency": contract.currency,
                "exchange": contract.exchange,
                "primaryExchange": contract.primaryExchange,
                "industry": details.industry,
                "category": details.category,
                "subcategory": details.subcategory,
                "stockType": getattr(details, "stockType", ""),
                "timeZoneId": details.timeZoneId,
                "tradingHours": details.tradingHours,
                "liquidHours": details.liquidHours,
            }
            if existing is None or contract.exchange == "SMART":
                metadata[symbol] = candidate

        def contractDetailsEnd(self, req_id: int):  # noqa: N802
            request_events[req_id].set()

        def error(
            self,
            req_id: int,
            error_time: int,
            error_code: int,
            error_string: str,
            *args,
        ):
            informational = {2104, 2106, 2107, 2108, 2158}
            if error_code not in informational:
                errors.append(f"{error_code} req={req_id}: {error_string}")
                if req_id in request_events:
                    request_events[req_id].set()

    clean_symbols = []
    for raw_symbol in symbols:
        symbol = str(raw_symbol).strip().upper()
        if symbol and symbol.replace(".", "").replace("-", "").isalnum():
            clean_symbols.append(symbol)
        else:
            raise ValueError(f"Invalid stock symbol: {raw_symbol!r}")
    clean_symbols = list(dict.fromkeys(clean_symbols))
    if not clean_symbols:
        raise ValueError("At least one stock symbol is required.")

    request_symbols = {index + 2000: symbol for index, symbol in enumerate(clean_symbols)}
    app = MetadataApp()
    try:
        app.connect(config.host, config.port, config.client_id)
        if not app.isConnected():
            raise IbkrConnectionError("IBKR socket connection was not accepted.")
        threading.Thread(target=app.run, daemon=True).start()
        if not ready.wait(config.timeout_seconds):
            raise IbkrConnectionError("No IBKR API handshake for contract metadata.")

        for request_id, symbol in request_symbols.items():
            event = threading.Event()
            request_events[request_id] = event
            contract = Contract()
            contract.symbol = symbol
            contract.secType = "STK"
            contract.exchange = "SMART"
            contract.currency = "USD"
            app.reqContractDetails(request_id, contract)
            if not event.wait(timeout_per_symbol):
                errors.append(f"Timeout requesting metadata for {symbol}")
            time.sleep(0.08)

        payload = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "source": "IBKR Contract Details",
            "instruments": [
                metadata[symbol]
                for symbol in clean_symbols
                if symbol in metadata
            ],
            "errors": errors,
            "orders_enabled_by_stockforge": False,
        }
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )
        return {
            "symbols_requested": len(clean_symbols),
            "instruments_written": len(payload["instruments"]),
            "output": str(output_path),
            "errors": errors,
            "orders_enabled_by_stockforge": False,
        }
    finally:
        if app.isConnected():
            app.disconnect()


def sync_paper_executions(
    config: IbkrConnectionConfig,
    output_path: Path,
    timeout_seconds: float = 15.0,
) -> dict[str, Any]:
    """Append currently available IBKR paper executions to a local journal."""
    from stockforge_ml.trading_history import merge_executions

    EClient, EWrapper, _ = _import_ibapi()
    try:
        from ibapi.execution import ExecutionFilter
    except ImportError as error:
        raise IbkrDependencyError("IBKR ExecutionFilter is unavailable.") from error

    ready = threading.Event()
    complete = threading.Event()
    accounts_seen = threading.Event()
    managed_accounts: list[str] = []
    fresh: dict[str, dict[str, Any]] = {}
    commissions: dict[str, float] = {}
    errors: list[str] = []

    class ExecutionApp(EWrapper, EClient):
        def __init__(self):
            EClient.__init__(self, self)

        def nextValidId(self, order_id: int):  # noqa: N802
            ready.set()

        def managedAccounts(self, accounts: str):  # noqa: N802
            managed_accounts.extend(
                item.strip() for item in accounts.split(",") if item.strip()
            )
            accounts_seen.set()

        def execDetails(self, req_id: int, contract, execution):  # noqa: N802
            if contract.secType != "STK":
                return
            fresh[execution.execId] = {
                "executionId": execution.execId,
                "time": execution.time,
                "account": execution.acctNumber,
                "symbol": contract.symbol,
                "currency": contract.currency,
                "side": execution.side,
                "shares": float(execution.shares),
                "price": float(execution.price),
                "exchange": execution.exchange,
                "orderId": execution.orderId,
                "permId": execution.permId,
                "clientId": execution.clientId,
                "commission": None,
            }

        def commissionReport(self, report):  # noqa: N802
            commissions[report.execId] = float(report.commission)

        def execDetailsEnd(self, req_id: int):  # noqa: N802
            complete.set()

        def error(
            self,
            req_id: int,
            error_time: int,
            error_code: int,
            error_string: str,
            *args,
        ):
            informational = {2104, 2106, 2107, 2108, 2158}
            if error_code not in informational:
                errors.append(f"{error_code} req={req_id}: {error_string}")
                if req_id == 7101:
                    complete.set()

    app = ExecutionApp()
    try:
        app.connect(config.host, config.port, config.client_id)
        if not app.isConnected():
            raise IbkrConnectionError("IBKR socket connection was not accepted.")
        threading.Thread(target=app.run, daemon=True).start()
        if not ready.wait(config.timeout_seconds):
            raise IbkrConnectionError("No IBKR API handshake for executions.")
        app.reqManagedAccts()
        accounts_seen.wait(min(5, timeout_seconds))
        if not managed_accounts or any(
            not account.upper().startswith("DU") for account in managed_accounts
        ):
            raise IbkrConnectionError(
                "Execution history is restricted to IBKR paper accounts (DU...)."
            )
        app.reqExecutions(7101, ExecutionFilter())
        if not complete.wait(timeout_seconds):
            raise IbkrConnectionError("Timed out waiting for IBKR executions.")
        time.sleep(0.4)
    finally:
        if app.isConnected():
            app.disconnect()

    for execution_id, commission in commissions.items():
        if execution_id in fresh:
            fresh[execution_id]["commission"] = commission
    existing: list[dict[str, Any]] = []
    if output_path.exists():
        payload = json.loads(output_path.read_text(encoding="utf-8-sig"))
        existing = payload.get("executions", [])
    merged = merge_executions(existing, list(fresh.values()))
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "IBKR paper executions",
        "accounts": managed_accounts,
        "appendOnly": True,
        "executions": merged,
        "errors": errors,
        "orders_enabled_by_stockforge": False,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return {
        "new_executions": len(fresh),
        "total_executions": len(merged),
        "accounts": managed_accounts,
        "errors": errors,
        "output": str(output_path),
        "orders_enabled_by_stockforge": False,
    }
