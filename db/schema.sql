-- Spectra AI SOC — PostgreSQL schema (PostgreSQL 16+)
-- Core columns are relational (filter/sort/join); vendor-specific and AI output stays in JSONB.

SET client_min_messages = warning;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Reference data ----------
CREATE TABLE IF NOT EXISTS clients (
  id                TEXT PRIMARY KEY,               -- e.g. c1
  name              TEXT NOT NULL UNIQUE,
  code              TEXT NOT NULL UNIQUE,           -- e.g. APX-FIN
  industry          TEXT,
  criticality       TEXT NOT NULL CHECK (criticality IN ('Critical','High','Medium')),
  logo_color        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analysts (
  id                    TEXT PRIMARY KEY,           -- e.g. a2, fusionai
  name                  TEXT NOT NULL,
  email                 TEXT UNIQUE,
  tier                  TEXT NOT NULL,
  shift                 TEXT,
  status                TEXT NOT NULL DEFAULT 'Active',
  skills                TEXT[] NOT NULL DEFAULT '{}',
  is_ai_investigator    BOOLEAN NOT NULL DEFAULT false,
  avatar_url            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analyst_clients (
  analyst_id  TEXT REFERENCES analysts(id) ON DELETE CASCADE,
  client_id   TEXT REFERENCES clients(id)  ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (analyst_id, client_id)
);

-- ---------- Normalized telemetry (Common Event Model) ----------
-- High volume. For >50M rows consider TimescaleDB hypertable or native monthly partitions.
CREATE TABLE IF NOT EXISTS security_events (
  event_id          TEXT PRIMARY KEY,
  ts                TIMESTAMPTZ NOT NULL,
  client_id         TEXT NOT NULL REFERENCES clients(id),
  source_platform   TEXT NOT NULL,                  -- Google SecOps, CrowdStrike, Defender, Zscaler...
  event_type        TEXT,
  severity          TEXT,
  user_name         TEXT,
  user_email        TEXT,
  hostname          TEXT,
  source_ip         INET,
  destination_ip    INET,
  domain            TEXT,
  file_hash         TEXT,
  application       TEXT,
  action            TEXT,
  asset_criticality TEXT,
  raw_event         JSONB                           -- original vendor payload
);
CREATE INDEX IF NOT EXISTS ix_events_ts        ON security_events USING BRIN (ts);
CREATE INDEX IF NOT EXISTS ix_events_client_ts ON security_events (client_id, ts DESC);
CREATE INDEX IF NOT EXISTS ix_events_user      ON security_events (user_email);
CREATE INDEX IF NOT EXISTS ix_events_host      ON security_events (hostname);
CREATE INDEX IF NOT EXISTS ix_events_srcip     ON security_events (source_ip);
CREATE INDEX IF NOT EXISTS ix_events_hash      ON security_events (file_hash);

-- ---------- Alerts / cases ----------
CREATE TABLE IF NOT EXISTS alerts (
  id                    TEXT PRIMARY KEY,           -- vendor alert id or ALT-xxxx
  external_id           TEXT,                       -- id in the source platform (detection id, incident id)
  ticket_number         TEXT,
  case_number           TEXT,
  title                 TEXT NOT NULL,
  description           TEXT,
  severity              TEXT NOT NULL CHECK (severity IN ('Critical','High','Medium','Low','Informational')),
  status                TEXT NOT NULL,
  client_id             TEXT NOT NULL REFERENCES clients(id),
  source_platform       TEXT NOT NULL,
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  routed_to             TEXT NOT NULL CHECK (routed_to IN ('FusionAI','Human Analyst')),
  assigned_to_id        TEXT REFERENCES analysts(id),
  initial_ack_by        TEXT,
  initial_ack_at        TIMESTAMPTZ,
  claimed_by_id         TEXT REFERENCES analysts(id),
  claimed_at            TIMESTAMPTZ,
  sla_deadline          TIMESTAMPTZ,
  sla_risk              BOOLEAN NOT NULL DEFAULT false,
  mitre_tactic          TEXT,
  entity_user           TEXT,
  entity_host           TEXT,
  entity_ip             TEXT,
  correlated_incident_id TEXT,
  tuning_flagged        BOOLEAN NOT NULL DEFAULT false,
  tuning_reason         TEXT,
  closure_reason        TEXT,
  resolution_notes      TEXT,
  escalation            JSONB,                      -- escalatedTo / target / urgency / reason
  handover              JSONB,                      -- shift handover notes
  ui_extra              JSONB,                      -- display-only fields kept for the current UI (e.g. relative timestamps)
  closed_at             TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_platform, external_id)
);
CREATE INDEX IF NOT EXISTS ix_alerts_client_status ON alerts (client_id, status);
CREATE INDEX IF NOT EXISTS ix_alerts_assignee      ON alerts (assigned_to_id) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_alerts_sla           ON alerts (sla_deadline)   WHERE closed_at IS NULL;

CREATE TABLE IF NOT EXISTS alert_events (
  alert_id  TEXT REFERENCES alerts(id) ON DELETE CASCADE,
  event_id  TEXT REFERENCES security_events(event_id) ON DELETE CASCADE,
  PRIMARY KEY (alert_id, event_id)
);

-- AI triage output — one row per model run (keeps history, model + prompt version for audit)
CREATE TABLE IF NOT EXISTS ai_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id        TEXT REFERENCES alerts(id) ON DELETE CASCADE,
  incident_id     TEXT,
  model           TEXT NOT NULL,                    -- e.g. gemini-3.8-flash or fusionai-expert-rules
  prompt_version  TEXT,
  risk_score      SMALLINT CHECK (risk_score BETWEEN 0 AND 100),
  confidence      SMALLINT CHECK (confidence BETWEEN 0 AND 100),
  report          JSONB NOT NULL,                   -- full AiAnalysisReport / triage report
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ai_reports_alert ON ai_reports (alert_id, created_at DESC);

-- ---------- Incidents (correlated alerts) ----------
CREATE TABLE IF NOT EXISTS incidents (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  client_id           TEXT NOT NULL REFERENCES clients(id),
  severity            TEXT NOT NULL,
  status              TEXT NOT NULL,
  risk_score          SMALLINT,
  confidence          SMALLINT,
  assigned_analyst_id TEXT REFERENCES analysts(id),
  servicenow_case_id  TEXT,
  details             JSONB,                        -- attack story, MITRE chain, affected entities, similar incidents
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incident_alerts (
  incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  alert_id    TEXT REFERENCES alerts(id)    ON DELETE CASCADE,
  PRIMARY KEY (incident_id, alert_id)
);

-- ---------- Detection tuning ----------
CREATE TABLE IF NOT EXISTS detection_rules (
  id               TEXT PRIMARY KEY,
  rule_id          TEXT NOT NULL,                   -- vendor rule id (YARA-L rule id, Falcon IOA id, KQL rule id)
  rule_name        TEXT NOT NULL,
  platform         TEXT NOT NULL,
  tuning_applied   BOOLEAN NOT NULL DEFAULT false,
  suggested_tuning TEXT,
  stats            JSONB,                           -- 24h/7d counts, benign/duplicate/TP ratios
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Response actions & ITSM ----------
CREATE TABLE IF NOT EXISTS soar_actions (
  id             TEXT PRIMARY KEY,
  incident_id    TEXT REFERENCES incidents(id),
  action_name    TEXT NOT NULL,
  playbook_name  TEXT,
  target_entity  TEXT NOT NULL,
  target_type    TEXT,
  impact_level   TEXT,
  status         TEXT NOT NULL DEFAULT 'Awaiting Approval',
  approved_by    TEXT REFERENCES analysts(id),
  approved_at    TIMESTAMPTZ,
  execution_id   TEXT,
  execution_log  JSONB,
  executed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS itsm_tickets (
  ticket_number  TEXT PRIMARY KEY,                  -- ServiceNow INC number
  sys_id         TEXT UNIQUE,
  incident_id    TEXT REFERENCES incidents(id),
  alert_id       TEXT REFERENCES alerts(id),
  status         TEXT,
  payload        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Audit trail (who / what / when — required for AI + SOAR decisions) ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    TEXT,                                  -- analyst id or 'fusionai'
  action      TEXT NOT NULL,                         -- claim, close, escalate, soar_approve, ai_report...
  object_type TEXT NOT NULL,
  object_id   TEXT NOT NULL,
  details     JSONB
);
CREATE INDEX IF NOT EXISTS ix_audit_object ON audit_log (object_type, object_id, at DESC);

-- ---------- Ingestion state (one row per connector per client tenant) ----------
CREATE TABLE IF NOT EXISTS ingest_cursors (
  connector     TEXT NOT NULL,                       -- secops, falcon, defender, zscaler...
  client_id     TEXT NOT NULL REFERENCES clients(id),
  last_cursor   TEXT,                                -- vendor page token / offset / last event time
  last_run_at   TIMESTAMPTZ,
  last_status   TEXT,
  PRIMARY KEY (connector, client_id)
);

-- ---------- Handy view: live analyst workload (replaces hard-coded wip/sla numbers) ----------
CREATE OR REPLACE VIEW v_analyst_workload AS
SELECT an.id AS analyst_id,
       an.name,
       count(al.id) FILTER (WHERE al.closed_at IS NULL)                                   AS wip,
       count(al.id) FILTER (WHERE al.closed_at IS NULL AND al.sla_risk)                   AS sla_risk,
       count(al.id) FILTER (WHERE al.closed_at IS NULL AND al.severity = 'Critical')      AS critical,
       count(al.id) FILTER (WHERE al.closed_at IS NULL AND al.severity = 'High')          AS high,
       count(al.id) FILTER (WHERE al.status = 'Escalated')                                AS escalated,
       count(al.id) FILTER (WHERE al.closed_at IS NULL AND now() - al.detected_at <  interval '2 hours') AS aging_lt_2h,
       count(al.id) FILTER (WHERE al.closed_at IS NULL AND now() - al.detected_at >= interval '8 hours') AS aging_gt_8h
FROM analysts an
LEFT JOIN alerts al ON al.assigned_to_id = an.id
GROUP BY an.id, an.name;
