# Real-time dashboard architecture

## Runtime data flow

```text
Next.js App Router
  ├─ AppProviders
  │   ├─ React Query (snapshots, cache, retries, mutations)
  │   └─ RealtimeProvider
  │       └─ channel subscription
  │           ├─ WebSocket /v1/realtime/{channel}
  │           ├─ SSE /v1/realtime/{channel}/events
  │           └─ bounded REST polling fallback
  ├─ Zustand
  │   ├─ ephemeral auth/session state
  │   └─ persisted widget order and width
  └─ dashboards
      ├─ PHI access
      ├─ FHIR R4
      ├─ HL7 v2
      ├─ DICOM metadata
      ├─ IoMT telemetry
      └─ ICU vitals
```

Streams deliver invalidation signals and recent events. React Query remains the
authoritative snapshot/recovery path, preventing a dropped socket frame from leaving the
screen permanently inconsistent.

## Folder structure

```text
portal/
├── app/
│   └── (dashboard)/
├── components/
│   ├── dashboard/interactive-grid.tsx
│   ├── realtime/
│   ├── providers/realtime-provider.tsx
│   └── ui/
├── dashboards/
│   ├── fhir/
│   ├── hl7/
│   ├── dicom/
│   ├── iomt/
│   └── icu/
├── hooks/
│   ├── useRealtime.ts
│   ├── usePHIAccess.ts
│   ├── useFHIR.ts
│   ├── useHL7.ts
│   ├── useDICOM.ts
│   ├── useIoMT.ts
│   └── useICU.ts
├── lib/
│   ├── api/
│   └── realtime/
├── store/
│   └── dashboard-layout-store.ts
└── app/styles.css
```

## Backend stream contract

Channels are `phi-access`, `fhir`, `hl7`, `dicom`, `iomt`, and `icu`.

WebSocket:

```text
GET wss://api.example.com/v1/realtime/{channel}
Sec-WebSocket-Protocol: healthgov.v1
Cookie: secure same-site session
```

SSE:

```text
GET https://api.example.com/v1/realtime/{channel}/events
Accept: text/event-stream
Cookie: secure same-site session
```

Both transports emit:

```json
{
  "channel": "iomt",
  "type": "telemetry.received",
  "sequence": 48211,
  "occurredAt": "2026-07-17T09:30:00Z",
  "data": {}
}
```

Use heartbeats every 15–25 seconds. Authorize the initial upgrade from the secure session
cookie, bind the connection to its verified tenant, and never accept tenant identity from
query parameters. Do not place JWTs or PHI in URLs. Enforce per-tenant connection and
event-rate limits at the gateway.

When WebSocket fails, the client tries credentialed `EventSource`. If SSE fails, it polls
the corresponding dashboard summary. WebSocket reconnects use capped exponential backoff
with jitter.

## Add a real-time widget

1. Add a typed snapshot API under `lib/api`.
2. Create or extend a React Query hook.
3. Call `useRealtime` with a channel, the query key to invalidate, and a safe snapshot
   poller.
4. Render the widget as a `DashboardWidget`.
5. Add it to `InteractiveGrid`; order and width persist in browser storage.

```tsx
const realtime = useRealtime({
  channel: "new-source",
  queryKey: ["new-source"],
  poll: sourceApi.summary,
  pollInterval: 5000,
});

<InteractiveGrid
  dashboard="new-source"
  widgets={[{ id: "trend", title: "Live trend", content: <Trend />, defaultSpan: 8 }]}
/>
```

Keep widget identifiers stable between releases so saved layouts remain valid. Stream
buffers should be bounded, charts should display a rolling window, and large tables must
use server-side pagination or virtualization.

## Interaction and accessibility

- Widgets support native drag-and-drop, width selection, expansion, and layout reset.
- Filters update React Query keys without page reloads.
- Live event containers use `aria-live="polite"`.
- Motion is limited to transforms and opacity; browser reduced-motion preferences are
  respected by Framer Motion.
- Mobile uses a single column; tablet and desktop progressively expose the 12-column grid.
- DICOM thumbnails are modality placeholders. Diagnostic pixel data stays outside the
  browser and requires a separately governed clinical viewer.

## Local configuration

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8014
NEXT_PUBLIC_REALTIME_URL=http://127.0.0.1:8014
```

The current data-store supplies REST snapshot endpoints. Until a stream gateway implements
the WebSocket/SSE contract above, dashboards automatically remain functional through
polling. Validate all three modes in deployment tests by deliberately blocking each
preferred transport.
