from datetime import date

import pytest

from stockforge_ml.sec import extract_fundamental_snapshot, validate_user_agent


def fact(val, start, end, filed, fy, accn="0001"):
    return {
        "val": val,
        "start": start,
        "end": end,
        "filed": filed,
        "fy": fy,
        "fp": "FY",
        "form": "10-K",
        "accn": accn,
    }


def instant(val, end, filed, fy):
    return {
        "val": val,
        "end": end,
        "filed": filed,
        "fy": fy,
        "fp": "FY",
        "form": "10-K",
        "accn": "0001",
    }


def test_snapshot_is_point_in_time_and_calculates_quality_metrics():
    facts = {
        "entityName": "Example Corp",
        "facts": {
            "us-gaap": {
                "Revenues": {"units": {"USD": [
                    fact(100, "2022-01-01", "2022-12-31", "2023-02-10", 2022),
                    fact(120, "2023-01-01", "2023-12-31", "2024-02-10", 2023),
                    fact(999, "2024-01-01", "2024-12-31", "2025-02-10", 2024),
                ]}},
                "OperatingIncomeLoss": {"units": {"USD": [
                    fact(24, "2023-01-01", "2023-12-31", "2024-02-10", 2023)
                ]}},
                "NetIncomeLoss": {"units": {"USD": [
                    fact(18, "2023-01-01", "2023-12-31", "2024-02-10", 2023)
                ]}},
                "NetCashProvidedByUsedInOperatingActivities": {"units": {"USD": [
                    fact(30, "2023-01-01", "2023-12-31", "2024-02-10", 2023)
                ]}},
                "PaymentsToAcquirePropertyPlantAndEquipment": {"units": {"USD": [
                    fact(6, "2023-01-01", "2023-12-31", "2024-02-10", 2023)
                ]}},
                "Assets": {"units": {"USD": [
                    instant(200, "2023-12-31", "2024-02-10", 2023)
                ]}},
                "Liabilities": {"units": {"USD": [
                    instant(80, "2023-12-31", "2024-02-10", 2023)
                ]}},
            }
        },
    }
    snapshot = extract_fundamental_snapshot(
        "EXM", "123", facts, date(2024, 12, 31)
    )
    assert snapshot is not None
    assert snapshot.fiscal_year == 2023
    assert snapshot.revenue == 120
    assert snapshot.revenue_growth == pytest.approx(0.20)
    assert snapshot.operating_margin == pytest.approx(0.20)
    assert snapshot.net_margin == pytest.approx(0.15)
    assert snapshot.free_cash_flow_margin == pytest.approx(0.20)
    assert snapshot.liabilities_to_assets == pytest.approx(0.40)
    assert snapshot.return_on_assets == pytest.approx(0.09)
    assert snapshot.coverage == 6


def test_user_agent_requires_contact_email():
    with pytest.raises(ValueError):
        validate_user_agent("StockForge")
    assert validate_user_agent("StockForge owner@example.com")


def test_alternate_capex_and_derived_liabilities_are_supported():
    facts = {
        "entityName": "Alternate Tags Corp",
        "facts": {
            "us-gaap": {
                "Revenues": {"units": {"USD": [
                    fact(100, "2022-01-01", "2022-12-31", "2023-02-10", 2022),
                    fact(125, "2023-01-01", "2023-12-31", "2024-02-10", 2023),
                ]}},
                "NetIncomeLoss": {"units": {"USD": [
                    fact(20, "2023-01-01", "2023-12-31", "2024-02-10", 2023)
                ]}},
                "NetCashProvidedByUsedInOperatingActivities": {"units": {"USD": [
                    fact(30, "2023-01-01", "2023-12-31", "2024-02-10", 2023)
                ]}},
                "PaymentsToAcquireOtherPropertyPlantAndEquipment": {"units": {"USD": [
                    fact(5, "2023-01-01", "2023-12-31", "2024-02-10", 2023)
                ]}},
                "Assets": {"units": {"USD": [
                    instant(200, "2023-12-31", "2024-02-10", 2023)
                ]}},
                "StockholdersEquity": {"units": {"USD": [
                    instant(80, "2023-12-31", "2024-02-10", 2023)
                ]}},
            }
        },
    }
    snapshot = extract_fundamental_snapshot(
        "ALT", "321", facts, date(2024, 12, 31)
    )
    assert snapshot is not None
    assert snapshot.free_cash_flow_margin == pytest.approx(0.20)
    assert snapshot.liabilities_to_assets == pytest.approx(0.60)
    assert snapshot.coverage == 5
