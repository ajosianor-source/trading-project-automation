import sys
from pathlib import Path

# The deployable service is intentionally self-contained and launched from this directory.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
