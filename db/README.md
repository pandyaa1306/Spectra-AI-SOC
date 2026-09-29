# Spectra AI SOC — Database & Real-Data Integration

## 1. Database choice

**PostgreSQL 17**: free and open source (PostgreSQL License), so there's no vendor lock-in.

| Need | PostgreSQL feature |
|---|---|
| Alerts, cases, analysts, SLA, and assignment data | Relational tables with foreign keys and transactions |
| Vendor payloads and AI reports that change shape | `JSONB` columns, indexable |
| IP and IOC lookups | Native `INET` type and B-tree indexes |
| Work queue for AI triage (no Redis needed yet) | `SELECT … FOR UPDATE SKIP LOCKED` |
| Live dashboards | `LISTEN/NOTIFY` pushes changes to the server, which sends them to the UI over SSE or WebSocket |
| Audit of AI and SOAR decisions | Append-only `audit_log` table |

Add-ons for when you need them, all free:

- **TimescaleDB** (Postgres extension) turns `security_events` into a time-partitioned hypertable with compression. Use it when stored evidence grows past tens of millions of rows. Note that the community edition uses the Timescale License, not Apache.
- **ClickHouse** (Apache 2.0) handles raw telemetry at billions of rows. You shouldn't need it, because the SIEMs already store raw logs.
- **OpenSearch** (Apache 2.0) adds full-text search over raw events.

Recommendation: start with **PostgreSQL only**. Google SecOps, Falcon, and Defender already keep the raw telemetry. Spectra only needs to store alerts, the evidence events tied to them, AI reports, actions, and the audit trail.

## 2. Quick start

```bash
cp .env.example .env.local        # set POSTGRES_PASSWORD / DATABASE_URL
npm run db:up                     # starts postgres:17 via Docker, applies schema.sql
DATABASE_URL=postgres://spectra:change-me@localhost:5432/spectra npm run db:seed
DATABASE_URL=postgres://spectra:change-me@localhost:5432/spectra npm run dev
curl localhost:3000/api/health    # {"db":"ok", ...}
```

- With `DATABASE_URL` set, `/api/bootstrap` serves **clients and alerts from Postgres**, and the UI loads them on startup.
- Without it, the endpoint returns `204` and the UI keeps using the bundled demo data.
- The seed script is idempotent, so it's safe to re-run.

Files:

- `schema.sql`: the tables, plus the `v_analyst_workload` view, which computes live WIP, SLA risk, and aging and replaces the hard-coded numbers.
- `docker-compose.yml`: local Postgres, bound to 127.0.0.1 only.
- `../server/db.ts`: connection pool plus the queries that map rows to the UI's `Client` and `Alert` types.
- `../scripts/db-seed.ts`: loads the demo data into Postgres.

## 3. Connecting real security data

```
 Google SecOps ─┐
 CrowdStrike ───┤   connectors (poll 1–5 min,        normalize to        Postgres
 Defender/Graph ┼─► cursor in ingest_cursors) ─────► CEM + Alert  ─────► alerts / security_events
 Zscaler NSS ───┘                                                          │
                                                                           ▼
                              routing worker: Low/Med → FusionAI queue, High/Crit → analyst
                                                                           │
                              AI worker (Gemini) → ai_reports ─────► API ─► UI (SSE for live updates)
                              SOAR/ITSM calls → soar_actions / itsm_tickets / audit_log
```

| Source | API to use | Maps to |
|---|---|---|
| Google SecOps (Chronicle) | SecOps API with a service account: detections/alerts for YARA-L rules, plus UDM search for evidence | `alerts` (rule detections), `security_events` (UDM events in the detection) |
| CrowdStrike Falcon | Alerts API v2 via FalconPy or REST (`/alerts/queries/alerts/v2`, then `/alerts/entities/alerts/v2`). Event Streams for near-real-time | `alerts`; process tree goes to `security_events.raw_event` |
| Microsoft Defender / Sentinel | Microsoft Graph Security API (`/security/alerts_v2`, `/security/incidents`) through an app registration with `SecurityAlert.Read.All` | `alerts`, `incidents` |
| Zscaler ZIA | Cloud NSS streaming to an HTTPS endpoint on this server, or NSS VM to syslog | `security_events`, used only to enrich web/proxy evidence |
| ServiceNow | Table API: `POST /api/now/table/incident` | `itsm_tickets` |
| Swimlane | REST API or webhook to trigger playbooks, with results returned by callback | `soar_actions`, `audit_log` |

Connector rules:

1. **Idempotent upserts.** Alerts are unique on `(source_platform, external_id)`, so polling the same data twice creates no duplicates.
2. **Cursor per connector per client.** Save it in `ingest_cursors` and resume from the last page token or timestamp.
3. **Credentials.** Keep one set per client tenant in a secrets manager (or `.env.local` for development), never in the database or the UI bundle.
4. **Store only the evidence that matters.** Pull the events linked to an alert, not full log streams.
5. **Compute, don't hard-code.** Replace the demo analyst metrics (WIP, aging, SLA) with `v_analyst_workload` and SLA deadlines derived from severity and client SLA.

## 4. Suggested build order

1. Add authentication and role checks (analyst / manager / read-only) on every `/api/*` route before any real data goes in.
2. Build write endpoints: claim, close, and escalate, each writing to `alerts` and `audit_log`. Move the React handlers in `App.tsx` from local state to these calls.
3. Build the first connector against one test client tenant. A Splunk connector with a BOTS v3 test dataset is already included (`connectors/splunk/`). Google SecOps is the natural next one.
4. Build the AI worker: pick up Low/Med alerts with `SKIP LOCKED`, call Gemini with the alert plus linked events, and save the result to `ai_reports` with the model and prompt version.
5. Serve analysts from the database (`/api/analysts` from `analysts` + `analyst_clients` + `v_analyst_workload`).
6. Push live updates to the UI (`LISTEN/NOTIFY` to SSE) in place of the simulated toasts.
