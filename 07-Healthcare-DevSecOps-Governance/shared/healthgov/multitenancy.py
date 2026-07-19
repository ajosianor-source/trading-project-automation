import re
from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from healthgov.config import get_settings

TENANT_ID = re.compile(r"^[a-z0-9][a-z0-9-]{2,62}$")
engine = create_async_engine(
    get_settings().database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)
session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def tenant_session(tenant_id: str) -> AsyncIterator[AsyncSession]:
    """Set transaction-local tenant context consumed by PostgreSQL row-level security."""
    if not TENANT_ID.fullmatch(tenant_id):
        raise ValueError("Invalid tenant identifier")
    async with session_factory() as session, session.begin():
        # set_config with a bound parameter avoids identifier/value interpolation.
        await session.execute(
            text("SELECT set_config('app.current_tenant', :tenant_id, true)"),
            {"tenant_id": tenant_id},
        )
        yield session
