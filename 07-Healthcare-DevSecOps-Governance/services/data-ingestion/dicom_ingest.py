from app.pipelines.dicom_ingest import DicomIngester

__all__ = ["DicomIngester"]

if __name__ == "__main__":
    from app.cli_checks import run_source_check

    run_source_check("dicom")
