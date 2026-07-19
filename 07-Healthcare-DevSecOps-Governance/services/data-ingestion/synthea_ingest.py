from app.pipelines.synthea_ingest import SyntheaIngester

__all__ = ["SyntheaIngester"]

if __name__ == "__main__":
    from app.cli_checks import run_source_check

    run_source_check("synthea")
