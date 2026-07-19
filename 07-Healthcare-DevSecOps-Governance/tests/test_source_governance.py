import importlib.util
import os
import sys
from pathlib import Path
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


def test_source_governance_synthetic_auto_allowed():
    module = load_module("source_governance", "services/data-ingestion/app/services/source_governance.py")
    gov = module.SourceGovernance()
    
    # Synthea should be auto-allowed
    assessment = gov.assess("synthea")
    assert assessment.allowed is True

    # NHS Synthetic should be auto-allowed
    assessment_nhs = gov.assess("nhs-synthetic")
    assert assessment_nhs.allowed is True


def test_source_governance_deidentified_requires_license_and_doi():
    module = load_module("source_governance", "services/data-ingestion/app/services/source_governance.py")
    gov = module.SourceGovernance()
    
    # TCIA should be blocked without license and DOI
    assessment = gov.assess("tcia")
    assert assessment.allowed is False
    assert "License acceptance is required" in assessment.reasons[0]

    # TCIA should be allowed with license and DOI
    assessment_allowed = gov.assess("tcia", license_accepted=True, doi="10.7937/K9/TCIA.2016.JGNIHEP5")
    assert assessment_allowed.allowed is True


def test_source_governance_mimic_iv_blocked_by_default():
    module = load_module("source_governance", "services/data-ingestion/app/services/source_governance.py")
    gov = module.SourceGovernance()
    
    # MIMIC-IV should be strictly blocked by default
    assessment = gov.assess("mimic-iv")
    assert assessment.allowed is False
    assert "MIMIC-IV ingestion is strictly blocked" in assessment.reasons[0]

    # MIMIC-IV should be allowed only with full DUA + credentialing + governance reference
    assessment_allowed = gov.assess("mimic-iv", approval_reference="DUA:123,CREDENTIAL:456,GOVERNANCE:789")
    assert assessment_allowed.allowed is True
