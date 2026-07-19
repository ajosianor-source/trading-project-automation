from datetime import date

from healthgov.deidentify import deterministic_date_shift, safe_harbor


def test_safe_harbor_removes_direct_identifiers():
    result = safe_harbor(
        {
            "name": "Example Patient",
            "email": "patient@example.org",
            "patient_id": "123",
            "zip": "SW1A 1AA",
            "diagnosis": "example",
        },
        b"test-salt",
    )
    assert result["name"] is None
    assert result["email"] is None
    assert result["patient_id"] != "123"
    assert result["zip"] == "SW100"
    assert result["diagnosis"] == "example"


def test_date_shift_is_stable_per_subject():
    original = date(2025, 1, 1)
    assert deterministic_date_shift(original, "subject-token") == deterministic_date_shift(
        original, "subject-token"
    )
