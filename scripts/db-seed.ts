/**
 * Loads schema.sql and seeds PostgreSQL with the bundled demo data.
 * Usage:  DATABASE_URL=postgres://spectra:spectra@localhost:5432/spectra npm run db:seed
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { INITIAL_CLIENTS, INITIAL_ANALYSTS, INITIAL_ALERTS, MASTER_INCIDENT } from '../src/data/mockSocData';

dotenv.config();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

// Demo data stores times as "14:37:12 UTC" — pin them to today's date.
const today = new Date().toISOString().slice(0, 10);
const toTs = (s?: string) => {
  const m = s?.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  return m ? `${today}T${m[1]}:${m[2]}:${m[3] ?? '00'}Z` : null;
};

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(fs.readFileSync(path.resolve('db/schema.sql'), 'utf8'));
    await client.query('BEGIN');

    for (const c of INITIAL_CLIENTS) {
      await client.query(
        `INSERT INTO clients (id,name,code,industry,criticality,logo_color) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, code=EXCLUDED.code, industry=EXCLUDED.industry,
           criticality=EXCLUDED.criticality, logo_color=EXCLUDED.logo_color`,
        [c.id, c.name, c.code, c.industry, c.criticality, c.logoColor]
      );
    }

    for (const a of INITIAL_ANALYSTS) {
      await client.query(
        `INSERT INTO analysts (id,name,email,tier,shift,status,skills,is_ai_investigator,avatar_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, tier=EXCLUDED.tier,
           shift=EXCLUDED.shift, status=EXCLUDED.status, skills=EXCLUDED.skills`,
        [a.id, a.name, a.email, a.tier, a.shift, a.status, a.skills ?? [], !!a.isAiInvestigator, a.avatar]
      );
      const ids = (a.clientIds ?? [a.clientId]).filter((id) => id && id !== 'all');
      for (const [i, cid] of ids.entries()) {
        await client.query(
          `INSERT INTO analyst_clients (analyst_id, client_id, is_primary) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [a.id, cid, i === 0]
        );
      }
    }

    for (const al of INITIAL_ALERTS) {
      const { aiReport } = al;
      await client.query(
        `INSERT INTO alerts (id,ticket_number,case_number,title,description,severity,status,client_id,source_platform,
           detected_at,routed_to,assigned_to_id,initial_ack_by,initial_ack_at,claimed_by_id,sla_deadline,sla_risk,
           mitre_tactic,entity_user,entity_host,entity_ip,correlated_incident_id,ui_extra)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, assigned_to_id=EXCLUDED.assigned_to_id,
           sla_risk=EXCLUDED.sla_risk, ui_extra=EXCLUDED.ui_extra, updated_at=now()`,
        [
          al.id, al.ticketNumber ?? null, al.caseNumber ?? null, al.title, al.description, al.severity, al.status,
          al.clientId, al.source_platform, toTs(al.timestamp) ?? new Date().toISOString(), al.routedTo,
          al.assignedToId || null, al.initialAckBy, toTs(al.initialAckTimestamp), al.claimedByAnalystId ?? null,
          toTs(al.slaDeadline), al.slaRisk, al.mitreTactic, al.entityUser ?? null, al.entityHost ?? null,
          al.entityIp ?? null, al.correlatedIncidentId ?? null,
          JSON.stringify({
            timestamp: al.timestamp,
            initialAckTimestamp: al.initialAckTimestamp,
            slaDeadline: al.slaDeadline,
            agingHours: al.agingHours,
          }),
        ]
      );
      if (aiReport && Object.keys(aiReport).length) {
        await client.query(`DELETE FROM ai_reports WHERE alert_id=$1 AND model='seed'`, [al.id]);
        await client.query(
          `INSERT INTO ai_reports (alert_id, model, risk_score, confidence, report) VALUES ($1,'seed',$2,$3,$4)`,
          [al.id, aiReport.riskScore ?? null, aiReport.confidence ?? null, JSON.stringify(aiReport)]
        );
      }
    }

    const inc = MASTER_INCIDENT;
    const { id, title, clientId, severity, status, riskScore, confidence, servicenowCaseId, ...details } = inc;
    await client.query(
      `INSERT INTO incidents (id,title,client_id,severity,status,risk_score,confidence,assigned_analyst_id,servicenow_case_id,details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'a2',$8,$9)
       ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, details=EXCLUDED.details, updated_at=now()`,
      [id, title, clientId, severity, status, riskScore, confidence, servicenowCaseId ?? null, JSON.stringify(details)]
    );

    await client.query('COMMIT');
    console.log(
      `Seeded ${INITIAL_CLIENTS.length} clients, ${INITIAL_ANALYSTS.length} analysts, ${INITIAL_ALERTS.length} alerts, 1 incident.`
    );
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
