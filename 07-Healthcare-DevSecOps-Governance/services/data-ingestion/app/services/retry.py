import asyncio
import random
from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")


async def with_retry(
    operation: Callable[[], Awaitable[T]],
    *,
    attempts: int = 4,
    base_delay: float = 0.25,
) -> T:
    """Bounded exponential retry with jitter for transient sink/source failures."""
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            return await operation()
        except (TimeoutError, ConnectionError, OSError) as exc:
            last_error = exc
            if attempt == attempts - 1:
                break
            delay = base_delay * (2**attempt) + random.SystemRandom().uniform(0, base_delay)
            await asyncio.sleep(delay)
    if last_error is None:
        raise RuntimeError("Retry loop completed without a result")
    raise last_error
