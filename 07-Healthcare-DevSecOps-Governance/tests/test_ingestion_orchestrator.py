import asyncio
import importlib.util
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock
import pytest

ROOT = Path(__file__).resolve().parents[1]

# Add services/data-ingestion to sys.path so that imports like 'from app.models.sources' work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "data-ingestion")))


def load_module(name: str, relative: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_orchestrator_synthetic_auto_allowed():
    module = load_module("ingestion_orchestrator", "services/data-ingestion/app/services/ingestion_orchestrator.py")
    
    # Mock ServiceContainer
    mock_services = MagicMock()
    mock_services.settings.synthea_output_dir = "/tmp"
    mock_services.synthea.ingest_directory = MagicMock(return_value=asyncio.Future())
    mock_services.synthea.ingest_directory.return_value.set_result(MagicMock(accepted=100, rejected=0, routed_topics={"fhir.normalized": 100}))

    orchestrator = module.IngestionOrchestrator(mock_services)
    
    # Run Synthea ingestion (should be allowed)
    results = await orchestrator.run("tenant-1", ["synthea"])
    assert "synthea" in results
    assert results["synthea"].accepted == 100


@pytest.mark.asyncio
async def test_orchestrator_deidentified_blocked_without_license():
    module = load_module("ingestion_orchestrator", "services/data-ingestion/app/services/ingestion_orchestrator.py")
    
    mock_services = MagicMock()
    orchestrator = module.IngestionOrchestrator(mock_services)
    
    # Run BIDMC ingestion (should be blocked because license is pending)
    results = await orchestrator.run("tenant-1", ["physionet-bidmc"])
    assert "physionet-bidmc" in results
    assert "License acceptance pending" in results["physionet-bidmc"].errors[0]


@pytest.mark.asyncio
async def test_orchestrator_mimic_iv_strictly_blocked():
    module = load_module("ingestion_orchestrator", "services/data-ingestion/app/services/ingestion_orchestrator.py")
    
    mock_services = MagicMock()
    orchestrator = module.IngestionOrchestrator(mock_services)
    
    # Run MIMIC-IV ingestion (should be strictly blocked by governance gate)
    results = await orchestrator.run("tenant-1", ["mimic-iv"])
    assert "mimic-iv" in results
    assert "Ingestion blocked by governance gate" in results["mimic-iv"].errors[0]
