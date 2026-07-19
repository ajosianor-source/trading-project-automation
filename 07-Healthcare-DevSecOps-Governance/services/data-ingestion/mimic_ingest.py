from app.pipelines.mimic_ingest import MimicIngester

__all__ = ["MimicIngester"]

if __name__ == "__main__":
    from app.cli_checks import run_source_check

    run_source_check("mimic")
