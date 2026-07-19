from datetime import UTC, datetime

import asyncpg

from app.models.envelope import ClinicalEnvelope


class EventLedger:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        self._pool: asyncpg.Pool | None = None

    async def start(self) -> None:
        self._pool = await asyncpg.create_pool(
            self.database_url,
            min_size=1,
            max_size=10,
            command_timeout=10,
        )

    async def stop(self) -> None:
        if self._pool:
            await self._pool.close()

    async def ready(self) -> bool:
        if self._pool is None:
            return False
        try:
            async with self._pool.acquire() as connection:
                return await connection.fetchval("SELECT 1") == 1
        except (asyncpg.PostgresError, OSError):
            return False

    async def reserve(self, envelope: ClinicalEnvelope) -> bool:
        if self._pool is None:
            raise RuntimeError("Ledger is not started")
        async with self._pool.acquire() as connection, connection.transaction():
            await connection.execute(
                "SELECT set_config('app.current_tenant', $1, true)",
                envelope.tenant_id,
            )
            result = await connection.fetchval(
                """
                INSERT INTO ingestion_event_ledger
                    (event_id, tenant_id, source, source_id, integrity_sha256, status, ingested_at)
                VALUES ($1, $2, $3, $4, $5, 'accepted', $6)
                ON CONFLICT (tenant_id, source, source_id, integrity_sha256) DO UPDATE
                SET event_id = EXCLUDED.event_id,
                    status = 'accepted',
                    ingested_at = EXCLUDED.ingested_at
                WHERE ingestion_event_ledger.status <> 'routed'
                RETURNING event_id
                """,
                envelope.event_id,
                envelope.tenant_id,
                envelope.source.value,
                envelope.source_id,
                envelope.integrity_sha256,
                envelope.ingested_at,
            )
            return result is not None

    async def mark_routed(self, envelope: ClinicalEnvelope, topic: str) -> None:
        if self._pool is None:
            raise RuntimeError("Ledger is not started")
        async with self._pool.acquire() as connection, connection.transaction():
            await connection.execute(
                "SELECT set_config('app.current_tenant', $1, true)",
                envelope.tenant_id,
            )
            await connection.execute(
                """
                UPDATE ingestion_event_ledger
                SET status = 'routed', topic = $2, routed_at = $3
                WHERE event_id = $1
                """,
                envelope.event_id,
                topic,
                datetime.now(UTC),
            )


class NullLedger:
    async def start(self) -> None: ...
    async def stop(self) -> None: ...
    async def ready(self) -> bool:
        return True

    async def reserve(self, envelope: ClinicalEnvelope) -> bool:
        return True

    async def mark_routed(self, envelope: ClinicalEnvelope, topic: str) -> None: ...
