import asyncio
from datetime import UTC, datetime

from hl7apy.parser import parse_message

from app.models.envelope import IngestionResult
from app.services.normalization import Normalizer
from app.services.routing import EventRouter


class Hl7Ingester:
    def __init__(self, normalizer: Normalizer, router: EventRouter) -> None:
        self.normalizer = normalizer
        self.router = router

    async def ingest(self, tenant_id: str, message: str) -> IngestionResult:
        normalized = message.replace("\r\n", "\r").strip("\r\n") + "\r"
        parsed = await asyncio.to_thread(parse_message, normalized, find_groups=False)
        fields = _extract(parsed)
        envelope = self.normalizer.hl7v2(tenant_id, fields)
        topic = await self.router.route(envelope)
        return IngestionResult(accepted=1, routed_topics={topic: 1})


def _extract(message) -> dict:
    msh = message.msh
    message_type = msh.msh_9.to_er7() if msh.msh_9 else "UNKNOWN"
    patient_id = ""
    if hasattr(message, "pid") and message.pid.pid_3:
        patient_id = message.pid.pid_3.to_er7().split("^", 1)[0]
    return {
        "message_type": message_type.replace("^", "_"),
        "message_control_id": msh.msh_10.to_er7(),
        "message_datetime": _hl7_datetime(msh.msh_7.to_er7()),
        "version": msh.msh_12.to_er7(),
        "sending_application": msh.msh_3.to_er7(),
        "sending_facility": msh.msh_4.to_er7(),
        "patient_id": patient_id,
        # Raw message and direct demographic fields are deliberately excluded from the event.
    }


def _hl7_datetime(value: str) -> str:
    for fmt in ("%Y%m%d%H%M%S", "%Y%m%d%H%M", "%Y%m%d"):
        try:
            return (
                datetime.strptime(value.split("+")[0].split("-")[0], fmt)
                .replace(tzinfo=UTC)
                .isoformat()
            )
        except ValueError:
            continue
    return datetime.now(UTC).isoformat()
