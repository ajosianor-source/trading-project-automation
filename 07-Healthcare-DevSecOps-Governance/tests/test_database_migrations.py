import os

from alembic.config import Config
from alembic.script import ScriptDirectory


def test_alembic_configuration_and_history():
    # Locate alembic.ini
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    ini_path = os.path.join(base_dir, "alembic.ini")
    
    assert os.path.exists(ini_path), "alembic.ini should exist at the project root"

    # Load Alembic config
    config = Config(ini_path)
    script_dir = ScriptDirectory.from_config(config)

    # Verify initial migration exists
    revisions = list(script_dir.walk_revisions())
    assert len(revisions) >= 1, "At least one migration revision should exist"
    
    initial_migration = revisions[-1]
    assert initial_migration.revision == "001_initial_schema"
    assert initial_migration.down_revision is None
