/**
 * Splunk → Spectra ingestion (tested shape: Splunk BOTS v3).
 *
 *   npm run ingest:splunk -- --client c1                  # run all detections, write to Postgres
 *   npm run ingest:splunk -- --client c1 --dry-run        # show hits per detection, write nothing
 *   npm run ingest:splunk -- --only dns-cryptominer,sysmon-encoded-powershell
 *
 * Options:
 *   --client <id>       Spectra client that owns the data (default c1). BOTS data belongs to fictional "Frothly".
 *   --index <name>      Splunk index (default botsv3)
 *   --max <n>           max events pulled per detection (default 2000)
 *   --no-rebase         keep original event times (BOTSv3 is from Aug 2018). By default times are shifted so the
 *                       newest event = now, which keeps SLA/aging views meaningful. The original time stays in raw_event.
 *   --dry-run           query Splunk and print results only
 *
 * Needs SPLUNK_URL + SPLUNK_TOKEN (or SPLUNK_USERNAME/SPLUNK_PASSWORD) and DATABASE_URL (unless --dry-run).
 */
import crypto from 'crypto';
import net from 'net';
import dotenv from 'dotenv';
import pg from 'pg';
import { exportSearch, splunkConfigFromEnv, ping, SplunkRow } from '../connectors/splunk/splunkClient';
import { BOTSV3_DETECTIONS, SplunkDetection } from '../connectors/splunk/botsv3Detections';
import type { AiAnalysisReport, SeverityLevel } from '../src/types/soc';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

// ---------- args ----------
const argv = process.argv.slice(2);
const arg = (name: string, def?: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const flag = (name: string) => argv.includes(`--${name}`);

const CLIENT_ID = arg('client', 'c1')!;
const INDEX = arg('index', 'botsv3')!;
const MAX = Number(arg('max', '2000'));
const DRY_RUN = flag('dry-run');
const REBASE = !flag('no-rebase');
const ONLY = arg('only')?.split(',').map((s) => s.trim());

const OUTPUT_FIELDS =
  '_time sourcetype host hostname user src_ip dest_ip domain file_hash process cmdline object action spectra_severity spectra_title _raw';

// ---------- helpers ----------
const first = (v: SplunkRow[string]): string | undefined => {
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s === null || s === '' ? undefined : String(s);
};
const sha = (s: string, n = 32) => crypto.createHash('sha1').update(s).digest('hex').slice(0, n);
const ipOrNull = (s?: string) => (s && net.isIP(s) ? s : null);
const SEV_RANK: Record<SeverityLevel, number> = { Informational: 0, Low: 1, Medium: 2, High: 3, Critical: 4 };
const SLA_MIN: Record<SeverityLevel, number> = { Critical: 30, High: 60, Medium: 240, Low: 480, Informational: 1440 };
const isSeverity = (s?: string): s is SeverityLevel => !!s && s in SEV_RANK;
// entity values too generic to correlate on
const NOISE = /^(aws(:.*)?|unknown|n\/a|-|none|null|system|nt authority\\system|localhost|127\.0\.0\.1|::1)$/i;

interface Ev {
  eventId: string;
  detection: SplunkDetection;
  originalTime: Date;
  sourcetype: string;
  hostname?: string;
  user?: string;
  src_ip?: string;
  dest_ip?: string;
  domain?: string;
  file_hash?: string;
  process?: string;
  cmdline?: string;
  object?: string;
  action?: string;
  severity: SeverityLevel;
  title: string;
  raw: string;
}

interface AlertGroup {
  id: string;
  detection: SplunkDetection;
  key: string;
  events: Ev[];
  severity: SeverityLevel;
  title: string;
  incidentId?: string;
}

function toEvent(det: SplunkDetection, r: SplunkRow): Ev | null {
  const t = first(r._time);
  const raw = first(r._raw) ?? '';
  if (!t) return null;
  const time = new Date(t);
  if (isNaN(time.getTime())) return null;
  const sourcetype = first(r.sourcetype) ?? 'unknown';
  const sev = first(r.spectra_severity);
  return {
    eventId: `SPL-${sha(`${sourcetype}|${t}|${raw}`)}`,
    detection: det,
    originalTime: time,
    sourcetype,
    hostname: first(r.hostname), // not Splunk "host" metadata: for stream/cloud feeds that is the collector, not the endpoint
    user: first(r.user),
    src_ip: first(r.src_ip),
    dest_ip: first(r.dest_ip),
    domain: first(r.domain),
    file_hash: first(r.file_hash),
    process: first(r.process),
    cmdline: first(r.cmdline),
    object: first(r.object),
    action: first(r.action),
    severity: isSeverity(sev) ? sev : det.severity,
    title: first(r.spectra_title) ?? det.title,
    raw,
  };
}

function groupAlerts(events: Ev[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>();
  for (const e of events) {
    const det = e.detection;
    const key = det.groupBy.map((f) => (e as any)[f] ?? '').join('|') || 'all';
    const id = `SPL-${det.id}-${sha(`${CLIENT_ID}|${key}`, 10)}`;
    let g = groups.get(id);
    if (!g) {
      g = { id, detection: det, key, events: [], severity: e.severity, title: e.title };
      groups.set(id, g);
    }
    g.events.push(e);
    if (SEV_RANK[e.severity] > SEV_RANK[g.severity]) g.severity = e.severity;
  }
  return [...groups.values()].filter((g) => g.events.length >= (g.detection.minEvents ?? 1));
}

/** Union alerts from different detections that share a user, host or IP → candidate incidents. */
function correlate(alerts: AlertGroup[]) {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  alerts.forEach((a) => parent.set(a.id, a.id));

  const byEntity = new Map<string, string>();
  for (const a of alerts) {
    for (const e of a.events) {
      for (const [type, v] of [
        ['user', e.user],
        ['host', e.hostname],
        ['ip', e.src_ip],
      ] as const) {
        if (!v || NOISE.test(v)) continue;
        // identity normalization: "CORP\\alice", "alice@corp.com" and "alice" correlate as one user
        const norm = type === 'user' ? v.toLowerCase().replace(/^.*\\/, '').replace(/@.*$/, '') : v.toLowerCase();
        const k = `${type}:${norm}`;
        const other = byEntity.get(k);
        if (other) union(a.id, other);
        else byEntity.set(k, a.id);
      }
    }
  }

  const clusters = new Map<string, AlertGroup[]>();
  for (const a of alerts) {
    const r = find(a.id);
    clusters.set(r, [...(clusters.get(r) ?? []), a]);
  }
  return [...clusters.values()].filter((c) => new Set(c.map((a) => a.detection.id)).size >= 2);
}

function sharedEntities(cluster: AlertGroup[]) {
  const pick = (f: keyof Ev) =>
    [...new Set(cluster.flatMap((a) => a.events.map((e) => e[f] as string | undefined)))].filter(
      (v): v is string => !!v && !NOISE.test(v)
    );
  return { users: pick('user'), hosts: pick('hostname'), ips: pick('src_ip'), domains: pick('domain') };
}

const PLAYBOOKS: Record<string, string[]> = {
  'aws-s3-public-acl': ['Revert bucket ACL / enable S3 Block Public Access', 'Review S3 access logs for downloads', 'Rotate keys of the actor'],
  'aws-create-access-key': ['Validate key creation with the IAM owner', 'Deactivate the key if unapproved', 'Review CloudTrail for key usage'],
  'aws-access-denied-burst': ['Deactivate the access key', 'Search code repos for the leaked key', 'Review successful calls from the same IP'],
  'guardduty-finding': ['Review the GuardDuty finding in the console', 'Isolate the affected instance security group if confirmed'],
  'dns-cryptominer': ['Block mining domains at DNS/proxy (Zscaler)', 'Identify browser tab / process on the host', 'Check for persistence'],
  'o365-macro-file-upload': ['Detonate file in sandbox', 'Check who downloaded/shared the file', 'Quarantine if malicious'],
  'sysmon-local-account-created': ['Disable the new account', 'Isolate host via EDR', 'Hunt for other hosts with the same account'],
  'sysmon-encoded-powershell': ['Decode the command', 'Isolate host via EDR', 'Pull process tree and network connections'],
};

function buildReport(g: AlertGroup, generatedAt: Date): AiAnalysisReport {
  const ev = g.events;
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean))] as string[];
  const hosts = uniq(ev.map((e) => e.hostname));
  const users = uniq(ev.map((e) => e.user));
  const ips = uniq(ev.map((e) => e.src_ip));
  const m = g.detection.mitre.match(/^(.*?)\s*\((T[\d.]+)\)/);
  const base = { Critical: 90, High: 78, Medium: 55, Low: 30, Informational: 10 }[g.severity];
  const factors = [
    { label: `Detection: ${g.detection.title}`, points: base - 20 },
    { label: `${ev.length} matching event(s) across ${uniq(ev.map((e) => e.sourcetype)).length} sourcetype(s)`, points: Math.min(10, ev.length) },
  ];
  if (g.incidentId) factors.push({ label: `Correlated with other detections (${g.incidentId})`, points: 10 });
  const sample = ev.find((e) => e.cmdline || e.object || e.domain);
  return {
    summary:
      `${g.detection.description} Entities: ` +
      [hosts.length && `host ${hosts.slice(0, 3).join(', ')}`, users.length && `user ${users.slice(0, 3).join(', ')}`, ips.length && `IP ${ips.slice(0, 3).join(', ')}`]
        .filter(Boolean)
        .join('; ') +
      (sample ? `. Evidence: ${sample.cmdline ?? sample.object ?? sample.domain}` : '.'),
    riskScore: Math.min(100, factors.reduce((s, f) => s + f.points, 20)),
    confidence: ev.length >= 3 ? 85 : 70,
    correlatedPlatforms: ['Splunk'],
    contributingFactors: factors,
    correlationReason: g.incidentId
      ? `Shares user/host/IP with alerts from other detections; grouped into ${g.incidentId}.`
      : `Events grouped by ${g.detection.groupBy.join(' + ')} = ${g.key}.`,
    attackTechniques: m ? [{ id: m[2], name: g.detection.title, tactic: m[1] }] : [],
    suggestedPlaybooks: PLAYBOOKS[g.detection.id] ?? [],
    isClaimableByAnalyst: true,
    generatedAt: generatedAt.toISOString().slice(11, 19) + ' UTC',
  };
}

// ---------- main ----------
async function main() {
  const cfg = splunkConfigFromEnv();
  console.log(`Splunk: ${cfg.url}  index=${INDEX}  client=${CLIENT_ID}${DRY_RUN ? '  (dry run)' : ''}`);
  await ping(cfg);

  const detections = BOTSV3_DETECTIONS.filter((d) => !ONLY || ONLY.includes(d.id));
  const events: Ev[] = [];
  for (const det of detections) {
    const spl = `${det.spl.replace(/\{index\}/g, INDEX)}\n| head ${MAX}\n| table ${OUTPUT_FIELDS}`;
    let n = 0;
    try {
      for await (const row of exportSearch(cfg, spl)) {
        const e = toEvent(det, row);
        if (e) {
          events.push(e);
          n++;
        }
      }
      console.log(`  ${det.id.padEnd(30)} ${String(n).padStart(5)} events`);
    } catch (err: any) {
      console.log(`  ${det.id.padEnd(30)} ERROR ${err.message}`);
    }
  }

  // de-duplicate events hit by more than one detection (keep one row per detection+event)
  const seen = new Set<string>();
  const uniqueEvents = events.filter((e) => {
    const k = `${e.detection.id}|${e.eventId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const alerts = groupAlerts(uniqueEvents);
  const clusters = correlate(alerts);
  for (const c of clusters) {
    const incId = `SPL-INC-${sha(c.map((a) => a.id).sort().join('|'), 8).toUpperCase()}`;
    c.forEach((a) => (a.incidentId = incId));
  }

  const maxTime = Math.max(0, ...uniqueEvents.map((e) => e.originalTime.getTime()));
  const offsetMs = REBASE && maxTime && Date.now() - maxTime > 864e5 ? Date.now() - maxTime : 0;
  const shifted = (d: Date) => new Date(d.getTime() + offsetMs);

  console.log(`\n${uniqueEvents.length} events → ${alerts.length} alerts → ${clusters.length} correlated incident(s)`);
  for (const a of alerts) {
    console.log(`  [${a.severity.padEnd(8)}] ${a.title}  (${a.events.length} ev, key=${a.key})${a.incidentId ? '  → ' + a.incidentId : ''}`);
  }
  if (offsetMs) console.log(`Time rebase: +${Math.round(offsetMs / 864e5)} days (original time kept in raw_event)`);
  if (DRY_RUN || !alerts.length) return;

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('BEGIN');
    const { rowCount } = await db.query('SELECT 1 FROM clients WHERE id=$1', [CLIENT_ID]);
    if (!rowCount) throw new Error(`Client ${CLIENT_ID} not found — run npm run db:seed first`);

    // events (only those that ended up in an alert)
    const linked = new Map<string, Ev>();
    alerts.forEach((a) => a.events.forEach((e) => linked.set(e.eventId, e)));
    for (const e of linked.values()) {
      await db.query(
        `INSERT INTO security_events (event_id, ts, client_id, source_platform, event_type, severity, user_name, user_email,
           hostname, source_ip, destination_ip, domain, file_hash, application, action, raw_event)
         VALUES ($1,$2,$3,'Splunk',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (event_id) DO UPDATE SET ts=EXCLUDED.ts, severity=EXCLUDED.severity`,
        [
          e.eventId, shifted(e.originalTime), CLIENT_ID, e.sourcetype, e.severity, e.user ?? null,
          e.user?.includes('@') ? e.user : null, e.hostname ?? null, ipOrNull(e.src_ip), ipOrNull(e.dest_ip),
          e.domain ?? null, e.file_hash ?? null, e.process ?? null, e.action ?? null,
          JSON.stringify({ original_time: e.originalTime.toISOString(), splunk_index: INDEX, cmdline: e.cmdline, object: e.object, _raw: e.raw.slice(0, 20000) }),
        ]
      );
    }

    // incidents
    for (const c of clusters) {
      const incId = c[0].incidentId!;
      const sev = c.reduce<SeverityLevel>((s, a) => (SEV_RANK[a.severity] > SEV_RANK[s] ? a.severity : s), 'Low');
      const ents = sharedEntities(c);
      const timeline = c
        .flatMap((a) => a.events.map((e) => ({ t: shifted(e.originalTime).toISOString(), detection: a.detection.id, title: a.title, host: e.hostname, user: e.user })))
        .sort((x, y) => x.t.localeCompare(y.t))
        .slice(0, 200);
      await db.query(
        `INSERT INTO incidents (id, title, client_id, severity, status, risk_score, confidence, details)
         VALUES ($1,$2,$3,$4,'Open',$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET severity=EXCLUDED.severity, risk_score=EXCLUDED.risk_score, details=EXCLUDED.details, updated_at=now()`,
        [
          incId,
          `Correlated activity: ${[...new Set(c.map((a) => a.title))].slice(0, 3).join(' + ')}`,
          CLIENT_ID, sev, Math.min(100, 40 + c.length * 12), 80,
          JSON.stringify({ source: 'splunk', index: INDEX, detections: [...new Set(c.map((a) => a.detection.id))], affectedEntities: ents, timeline }),
        ]
      );
    }

    // alerts
    let created = 0;
    for (const a of alerts) {
      const times = a.events.map((e) => e.originalTime.getTime());
      const detectedAt = shifted(new Date(Math.min(...times)));
      const lastSeen = shifted(new Date(Math.max(...times)));
      const slaDeadline = new Date(detectedAt.getTime() + SLA_MIN[a.severity] * 60000);
      const toAi = SEV_RANK[a.severity] <= SEV_RANK.Medium;
      const assignee = toAi
        ? 'fusionai'
        : (
            await db.query(
              `SELECT an.id FROM analysts an
                 JOIN analyst_clients ac ON ac.analyst_id = an.id AND ac.client_id = $1
                 LEFT JOIN v_analyst_workload w ON w.analyst_id = an.id
               WHERE NOT an.is_ai_investigator
               ORDER BY w.wip ASC NULLS FIRST, an.id LIMIT 1`,
              [CLIENT_ID]
            )
          ).rows[0]?.id ?? null;
      const e0 = a.events.find((e) => e.user || e.hostname || e.src_ip) ?? a.events[0];
      const sample = a.events.find((e) => e.cmdline || e.object || e.domain);
      const description =
        `${a.detection.description} ${a.events.length} event(s) in Splunk index=${INDEX} ` +
        `(${[...new Set(a.events.map((e) => e.sourcetype))].join(', ')}).` +
        (sample ? ` Sample: ${(sample.cmdline ?? sample.object ?? sample.domain)!.slice(0, 300)}` : '');

      const res = await db.query(
        `INSERT INTO alerts (id, external_id, title, description, severity, status, client_id, source_platform, detected_at,
           routed_to, assigned_to_id, initial_ack_by, initial_ack_at, sla_deadline, sla_risk, mitre_tactic,
           entity_user, entity_host, entity_ip, correlated_incident_id, ticket_number, case_number)
         VALUES ($1,$1,$2,$3,$4,$5,$6,'Splunk',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)
         ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, severity=EXCLUDED.severity,
           detected_at=EXCLUDED.detected_at, sla_deadline=EXCLUDED.sla_deadline, mitre_tactic=EXCLUDED.mitre_tactic,
           correlated_incident_id=EXCLUDED.correlated_incident_id, updated_at=now()
         RETURNING (xmax = 0) AS inserted`,
        [
          a.id, a.title, description, a.severity,
          toAi ? 'In Progress (FusionAI Investigating)' : 'New',
          CLIENT_ID, detectedAt, toAi ? 'FusionAI' : 'Human Analyst', assignee,
          toAi ? 'FusionAI' : 'Unacknowledged', toAi ? new Date(lastSeen.getTime() + 2000) : null,
          slaDeadline, slaDeadline.getTime() - Date.now() < 30 * 60000, a.detection.mitre,
          e0.user ?? null, e0.hostname ?? null, e0.src_ip ?? null, a.incidentId ?? null,
          `CASE-SPL-${sha(a.id, 6).toUpperCase()}`,
        ]
      );
      if (res.rows[0]?.inserted) created++;

      for (const e of a.events.slice(0, 200)) {
        await db.query('INSERT INTO alert_events (alert_id, event_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [a.id, e.eventId]);
      }
      if (a.incidentId) {
        await db.query('INSERT INTO incident_alerts (incident_id, alert_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [a.incidentId, a.id]);
      }
      if (toAi) {
        await db.query(`DELETE FROM ai_reports WHERE alert_id=$1 AND model='spectra-rules'`, [a.id]);
        const report = buildReport(a, new Date(lastSeen.getTime() + 2000));
        await db.query(
          `INSERT INTO ai_reports (alert_id, incident_id, model, prompt_version, risk_score, confidence, report)
           VALUES ($1,$2,'spectra-rules','splunk-v1',$3,$4,$5)`,
          [a.id, a.incidentId ?? null, report.riskScore, report.confidence, JSON.stringify(report)]
        );
      }
    }

    await db.query(
      `INSERT INTO ingest_cursors (connector, client_id, last_cursor, last_run_at, last_status)
       VALUES ('splunk:' || $2, $1, $3, now(), $4)
       ON CONFLICT (connector, client_id) DO UPDATE SET last_cursor=EXCLUDED.last_cursor, last_run_at=now(), last_status=EXCLUDED.last_status`,
      [CLIENT_ID, INDEX, maxTime ? new Date(maxTime).toISOString() : null, `ok: ${alerts.length} alerts`]
    );
    await db.query(`INSERT INTO audit_log (actor_id, action, object_type, object_id, details) VALUES ('ingest-splunk','ingest','client',$1,$2)`, [
      CLIENT_ID,
      JSON.stringify({ index: INDEX, events: linked.size, alerts: alerts.length, created, incidents: clusters.length, offsetMs }),
    ]);
    await db.query('COMMIT');
    console.log(`\nWrote ${linked.size} events, ${alerts.length} alerts (${created} new), ${clusters.length} incident(s) to Postgres.`);
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
