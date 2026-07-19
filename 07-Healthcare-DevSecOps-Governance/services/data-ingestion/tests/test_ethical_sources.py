from pathlib import Path

import pandas as pd
import pytest

from app.models.envelope import DataClassification
from app.pipelines.bidmc_ingest import BidmcIngester
from app.services.ledger import NullLedger
from app.services.normalization import Normalizer
from app.services.routing import EventRouter, MemorySink
from app.services.source_governance import SourceGovernance


def test_public_and_synthetic_sources_are_enabled():
    governance = SourceGovernance()
    assert governance.assess("synthea").allowed
    assert governance.assess("tcia").allowed
    assert governance.assess("physionet-bidmc").allowed


def test_mimic_is_blocked_without_approval_and_allowed_with_reference():
    governance = SourceGovernance()
    assert not governance.assess("mimic-iv").allowed
    assert not governance.assess("mimic-iv", "DUA:2026-001").allowed
    assert governance.assess(
        "mimic-iv", "DUA:2026-001;CREDENTIAL:PHYSIONET-123;GOVERNANCE:CAB-42"
    ).allowed


def test_tcia_catalogue_is_pinned_to_approved_collection():
    source = SourceGovernance().require("tcia")
    assert source.name == "TCIA TCGA-LUAD Version 4"
    assert any("10.7937/K9/TCIA.2016.JGNIHEP5" in item for item in source.restrictions)


@pytest.mark.asyncio
async def test_bidmc_replay_is_public_deidentified(tmp_path: Path):
    directory = tmp_path / "bidmc_csv"
    directory.mkdir()
    pd.DataFrame([{"HR": 72, "SpO2": 98, "RR": 15}]).to_csv(
        directory / "bidmc_01_Numerics.csv", index=False
    )
    sink = MemorySink()
    ingester = BidmcIngester(
        Normalizer("x" * 32), EventRouter(sink, NullLedger())
    )
    result = await ingester.ingest("hospital-a", tmp_path, limit=1)
    assert result.accepted == 1
    envelope = sink.events[0][1]
    assert envelope.classification == DataClassification.public_deidentified
    assert envelope.provenance["license"] == "ODC-By-1.0"
