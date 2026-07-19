from app.pipelines.fhir_stream import FhirStreamer

__all__ = ["FhirStreamer"]

if __name__ == "__main__":
    from app.cli_checks import run_source_check

    run_source_check("fhir")
