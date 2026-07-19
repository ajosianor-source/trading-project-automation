import asyncio
from collections.abc import AsyncIterator
from urllib.parse import urljoin

import requests
import structlog

from app.models.envelope import IngestionResult
from app.services.fhir_security import safe_next_url
from app.services.normalization import Normalizer
from app.services.retry import with_retry
from app.services.routing import EventRouter

log = structlog.get_logger()


class FhirStreamer:
    def __init__(
        self,
        normalizer: Normalizer,
        router: EventRouter,
        base_url: str,
        token: str = "",
    ) -> None:
        self.normalizer = normalizer
        self.router = router
        self.base_url = base_url.rstrip("/") + "/"
        self.headers = {"Accept": "application/fhir+json"}
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    async def ingest_bundle(self, tenant_id: str, bundle: dict) -> IngestionResult:
        resources = _bundle_resources(bundle)
        counts = await self.router.route_many(
            self.normalizer.fhir(tenant_id, resource) for resource in resources
        )
        return IngestionResult(accepted=len(resources), routed_topics=dict(counts))

    async def publish_bundle(self, bundle: dict) -> dict:
        """Publish synthetic data only to the configured private HAPI endpoint."""
        if bundle.get("resourceType") != "Bundle":
            raise ValueError("FHIR publication requires a Bundle")
        response = await with_retry(
            lambda: asyncio.to_thread(
                requests.post,
                self.base_url,
                json=bundle,
                headers={**self.headers, "Content-Type": "application/fhir+json"},
                timeout=(3.05, 60),
            )
        )
        response.raise_for_status()
        return response.json()

    async def stream_search(
        self,
        tenant_id: str,
        resource_type: str,
        *,
        since: str | None = None,
        limit: int | None = None,
    ) -> IngestionResult:
        if not resource_type.isalpha():
            raise ValueError("FHIR resource type contains invalid characters")
        params = {"_count": "200"}
        if since:
            params["_lastUpdated"] = f"gt{since}"
        accepted = 0
        routed: dict[str, int] = {}
        async for resource in self._search(resource_type, params):
            topic = await self.router.route(self.normalizer.fhir(tenant_id, resource))
            routed[topic] = routed.get(topic, 0) + 1
            accepted += 1
            if limit and accepted >= limit:
                break
        return IngestionResult(accepted=accepted, routed_topics=routed)

    async def _search(self, resource_type: str, params: dict[str, str]) -> AsyncIterator[dict]:
        url: str | None = urljoin(self.base_url, resource_type)
        while url:
            response = await with_retry(
                lambda current_url=url, current_params=params: asyncio.to_thread(
                    requests.get,
                    current_url,
                    params=current_params,
                    headers=self.headers,
                    timeout=(3.05, 30),
                )
            )
            response.raise_for_status()
            bundle = response.json()
            for resource in _bundle_resources(bundle):
                yield resource
            url = safe_next_url(self.base_url, bundle)
            params = {}


def _bundle_resources(bundle: dict) -> list[dict]:
    if bundle.get("resourceType") != "Bundle":
        raise ValueError("FHIR response must be a Bundle")
    return [
        entry["resource"]
        for entry in bundle.get("entry", [])
        if isinstance(entry, dict) and isinstance(entry.get("resource"), dict)
    ]
