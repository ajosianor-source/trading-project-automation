from app.pipelines.hl7_ingest import Hl7Ingester

__all__ = ["Hl7Ingester"]

if __name__ == "__main__":
    from app.cli_checks import run_source_check

    run_source_check("hl7")
