from datetime import UTC, datetime, timedelta

from healthgov.control_catalogs import DSP_CONTROLS, ISO27001_CONTROLS, SOC2_CONTROLS
from healthgov.frameworks import score_controls


def test_framework_catalog_coverage():
    assert len(ISO27001_CONTROLS) == 93
    assert len(DSP_CONTROLS) >= 10
    assert len(SOC2_CONTROLS) == 61
    assert len({control.control_id for control in ISO27001_CONTROLS}) == 93


def test_weighted_score_requires_all_control_evidence():
    control = ISO27001_CONTROLS[0]
    evidence = [
        {
            "control_id": control.control_id,
            "status": "effective",
            "observed_at": datetime.now(UTC),
            "expires_at": datetime.now(UTC) + timedelta(days=1),
        }
    ]
    result = score_controls((control,), evidence)
    assert result["score"] == 100
    assert result["ready"] is True


def test_expired_evidence_is_not_counted():
    control = DSP_CONTROLS[0]
    result = score_controls(
        (control,),
        [
            {
                "control_id": control.control_id,
                "status": "effective",
                "observed_at": datetime.now(UTC) - timedelta(days=2),
                "expires_at": datetime.now(UTC) - timedelta(days=1),
            }
        ],
    )
    assert result["score"] == 0
    assert result["stale_controls"] == [control.control_id]
