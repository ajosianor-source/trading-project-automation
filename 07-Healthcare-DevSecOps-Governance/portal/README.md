# HealthGov Enterprise Dashboard

## 1. Frontend architecture diagram

```text
 Browser
   |
 Next.js App Router
   +-- route groups: dashboard / authentication / BFF APIs
   +-- responsive AppShell: sidebar + command search + header
   +-- server pages: secure initial composition
   `-- client islands: charts, filters, modal, theme, events
          |
          +-- TanStack Query ---- Axios API client ---- HealthGov gateway
          |                            | JWT / tenant / purpose / request ID
          +-- Zustand ---------- UI + ephemeral session state
          +-- Recharts --------- line / bar / donut / heatmap
          +-- Framer Motion ---- restrained transitions
          `-- Tailwind + ShadCN-style accessible primitives

Authentication: OIDC/SMART Authorization Code + PKCE -> BFF exchange ->
opaque HttpOnly Secure SameSite session cookie. Access/refresh tokens stay server-side.
```

## 2. Full folder structure

```text
portal/
|-- app/
|   |-- (dashboard)/
|   |   |-- page.tsx                 # executive overview
|   |   |-- compliance/page.tsx
|   |   |-- security/page.tsx
|   |   |-- phi-access/page.tsx
|   |   |-- iomt/page.tsx
|   |   |-- ai-security/page.tsx
|   |   `-- developer/page.tsx
|   |-- api/auth/                    # BFF session exchange/logout
|   |-- auth/callback/
|   |-- login/
|   |-- layout.tsx
|   `-- styles.css
|-- components/
|   |-- auth/                        # permission-aware rendering
|   |-- charts/                      # Recharts and heatmap
|   |-- dashboard/                   # metrics, events, filters, tables
|   |-- layout/                      # responsive application shell
|   |-- providers/                   # React Query and theme
|   `-- ui/                          # ShadCN-style primitives
|-- hooks/
|-- lib/
|   |-- api/                         # Axios client and errors
|   |-- auth/                        # role/permission mapping
|   `-- data/                        # typed demo fixtures
|-- store/                           # Zustand stores
|-- types/
|-- components.json
|-- tailwind.config.ts
|-- postcss.config.mjs
`-- package.json
```

## 3. Design system

The theme is clinical, precise, and calm rather than decorative. Teal denotes verified/healthy posture;
red is reserved for immediate risk, amber for review, and blue/violet for information and AI.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| Background | Slate 50 | Slate 950 | Application canvas |
| Card | White | Deep slate | Primary surface |
| Primary | Teal 600 | Teal 400 | Verified actions and focus |
| Danger | Red 600 | Red 500 | Critical findings only |
| Warning | Amber 500 | Amber 500 | Review or degraded posture |
| Border | Slate 200 | Slate 800 | Quiet hierarchy |

Typography uses Inter/system sans with tight display tracking and JetBrains Mono/system mono for IDs.
Spacing follows a 4px scale; card radius is 12.8px; shadows use low-opacity multi-layer elevation.
CSS variables provide light/dark themes. Reduced-motion preferences disable nonessential animation.

Primitives include buttons, cards, badges, inputs, progress, skeletons, modal, tabs, accordion, filter bars,
searchable tables, charts, event streams and responsive navigation.

## 4. Page layouts

- Executive: four top KPIs, posture trend, risk donut, framework readiness and live event stream.
- Compliance: control/evidence KPIs, framework progress, evidence table and signed audit-pack modal.
- Security: scanner KPIs, risk distribution and searchable multi-scanner findings.
- PHI access: access KPIs, allowed/denied chart, live privacy events and behavior heatmap.
- IoMT: fleet KPIs and searchable identity/firmware/trust inventory.
- AI/ML: governed-model KPIs, assurance inventory and federated-round privacy/attestation status.
- Developer: searchable API catalog, executable request preview and documentation cards.

All layouts collapse from a 12-column desktop grid to stacked mobile cards. Tables retain horizontal
scroll instead of shrinking clinical/security identifiers beyond legibility.

## 5. Component library

Components are local, typed, and composable. They follow ShadCN conventions without making runtime
behavior dependent on a component registry. Focus rings, labels, ARIA roles, keyboard-accessible buttons,
reduced motion and semantic tables are standard.

## 6. API integration layer

`lib/api/client.ts` provides a 15-second Axios client, request IDs, tenant and purpose headers, normalized
errors and 401 session clearing. TanStack Query owns caching, retries, loading/error boundaries and
refetch behavior. Replace demo fixtures with query hooks as backend endpoints become available.

## 7. State management setup

Zustand persists only harmless UI preferences such as theme and sidebar width. Access tokens remain
ephemeral; refresh credentials never enter JavaScript. TanStack Query owns server state so domain data is
not duplicated in global stores.

## 8. Authentication UI

The login flow uses OIDC/SMART-compatible Authorization Code with PKCE S256 and state verification.
The callback sends the code/verifier to the BFF. The BFF returns an opaque, host-only, HttpOnly, Secure,
SameSite cookie. `Can` provides role-aware UI for Admin, Security, Compliance and Developer roles;
backend authorization remains authoritative.

Required environment:

```env
NEXT_PUBLIC_API_URL=https://api.healthgov.example
NEXT_PUBLIC_OIDC_ISSUER=https://auth.example.health
NEXT_PUBLIC_OIDC_CLIENT_ID=healthgov-portal
AUTH_BFF_URL=http://auth-bff.healthgov.svc.cluster.local:8000
```

## 9. Example pages fully coded

The compliance, security, IoMT and executive pages are production-oriented source implementations under
`app/(dashboard)`. PHI and AI/ML dashboards are also complete.

## 10. Developer portal UI

`/developer` provides searchable API contracts, authentication/purpose headers, cURL previews, event
schema entry points and SDK documentation. Production API execution should use a server-side proxy that
applies per-role scopes, CSRF protection, rate limiting and audit events.

## 11. Build and operations

```bash
npm install
npm run typecheck
npm run build
npm start
```

Run Lighthouse, axe, Playwright desktop/tablet/mobile visual checks and bundle analysis in CI. Send CSP
violation reports and frontend errors to the security telemetry pipeline without PHI or tokens.

Recommended visual breakpoints are 1440×1000, 1024×768, 768×1024 and 390×844. Verify sidebar collapse,
mobile navigation, theme switching, chart tooltips, keyboard focus, modal dismissal, table overflow,
reduced motion, 200% zoom and WCAG 2.2 AA contrast.
