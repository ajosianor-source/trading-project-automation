from app.pipelines.iomt_simulator import IomtSimulator

__all__ = ["IomtSimulator"]

if __name__ == "__main__":
    from app.cli_checks import run_source_check

    run_source_check("iomt")
