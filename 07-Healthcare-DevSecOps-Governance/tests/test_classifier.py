import importlib.util
from pathlib import Path

ROOT = Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location(
    "classifier", ROOT / "services" / "phi-classifier" / "app" / "main.py"
)
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


def test_phi_patterns_do_not_match_arbitrary_text():
    assert module.PATTERNS["ssn"].match("123-45-6789")
    assert not module.PATTERNS["ssn"].match("not-sensitive")
    assert "diagnosis" in module.PHI_FIELD_NAMES
