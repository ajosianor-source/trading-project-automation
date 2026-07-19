from urllib.parse import urljoin, urlparse


def safe_next_url(base_url: str, bundle: dict) -> str | None:
    next_url = next(
        (link.get("url") for link in bundle.get("link", []) if link.get("relation") == "next"),
        None,
    )
    if not next_url:
        return None
    resolved = urljoin(base_url, next_url)
    base = urlparse(base_url)
    candidate = urlparse(resolved)
    if (
        candidate.scheme != base.scheme
        or candidate.hostname != base.hostname
        or candidate.port != base.port
    ):
        raise ValueError("FHIR pagination attempted to change origin")
    return resolved
