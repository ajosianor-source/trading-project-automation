"""CLI entry point for running selected ingestion pipelines concurrently."""

import argparse
import asyncio

from app.config import get_settings
from app.services.container import ServiceContainer
from app.services.ingestion_orchestrator import IngestionOrchestrator


async def main(tenant_id: str, pipelines: list[str]) -> None:
    services = ServiceContainer(get_settings())
    orchestrator = IngestionOrchestrator(services)
    await services.start()
    try:
        results = await orchestrator.run(tenant_id, pipelines)
        for name, result in results.items():
            print(name, result.model_dump_json())  # noqa: T201
        if any(result.rejected > 0 for result in results.values()):
            raise SystemExit(1)
    finally:
        await orchestrator.stop()
        await services.stop()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", required=True)
    parser.add_argument(
        "--pipelines",
        nargs="+",
        default=["synthea", "fhir", "iomt"],
        choices=["synthea", "fhir", "hl7", "dicom", "iomt", "mimic"],
    )
    args = parser.parse_args()
    asyncio.run(main(args.tenant, args.pipelines))
