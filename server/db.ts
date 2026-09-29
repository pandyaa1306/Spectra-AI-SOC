import pg from 'pg';
import type { Alert, Client } from '../src/types/soc';

// Optional database. When DATABASE_URL is not set the app keeps using the bundled mock data.
export const pool: pg.Pool | null = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
  : null;

const hhmmss = (d: Date | null, withSeconds = true) =>
  d ? `${d.toISOString().slice(11, withSeconds ? 19 : 16)} UTC` : undefined;

export async function getClients(): Promise<Client[]> {
  if (!pool) throw new Error('DATABASE_URL not configured');
  const { rows } = await pool.query(`
    SELECT c.*,
      count(a.id) FILTER (WHERE a.closed_at IS NULL)                                 AS active_alerts,
      count(a.id) FILTER (WHERE a.closed_at IS NULL AND a.assigned_to_id IS NOT NULL) AS active_wip,
      count(a.id) FILTER (WHERE a.closed_at IS NULL AND a.sla_risk)                  AS sla_risk,
      count(DISTINCT a.correlated_incident_id) FILTER (WHERE a.closed_at IS NULL)    AS open_incidents,
      (SELECT count(*) FROM analyst_clients ac JOIN analysts x ON x.id = ac.analyst_id
        WHERE ac.client_id = c.id AND NOT x.is_ai_investigator)                      AS analysts
    FROM clients c LEFT JOIN alerts a ON a.client_id = c.id
    GROUP BY c.id ORDER BY c.id`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    industry: r.industry,
    criticality: r.criticality,
    activeAlerts: Number(r.active_alerts),
    openIncidents: Number(r.open_incidents),
    activeWip: Number(r.active_wip),
    slaBreachRisk: Number(r.sla_risk),
    assignedAnalystsCount: Number(r.analysts),
    logoColor: r.logo_color,
  }));
}

export async function getAlerts(): Promise<Alert[]> {
  if (!pool) throw new Error('DATABASE_URL not configured');
  const { rows } = await pool.query(`
    SELECT a.*, c.name AS client_name, an.name AS assignee_name, cl.name AS claimer_name,
      (SELECT report FROM ai_reports r WHERE r.alert_id = a.id ORDER BY created_at DESC LIMIT 1) AS ai_report
    FROM alerts a
    JOIN clients c ON c.id = a.client_id
    LEFT JOIN analysts an ON an.id = a.assigned_to_id
    LEFT JOIN analysts cl ON cl.id = a.claimed_by_id
    WHERE a.closed_at IS NULL
    ORDER BY a.detected_at DESC`);
  return rows.map((r) => {
    const ui = r.ui_extra || {};
    const agingHours = Math.round(((Date.now() - new Date(r.detected_at).getTime()) / 36e5) * 10) / 10;
    return {
      id: r.id,
      ticketNumber: r.ticket_number ?? undefined,
      caseNumber: r.case_number ?? undefined,
      title: r.title,
      description: r.description ?? '',
      severity: r.severity,
      status: r.status,
      timestamp: ui.timestamp ?? hhmmss(r.detected_at),
      client: r.client_name,
      clientId: r.client_id,
      source_platform: r.source_platform,
      assignedTo: r.assignee_name ?? 'Unassigned',
      assignedToId: r.assigned_to_id ?? '',
      routedTo: r.routed_to,
      initialAckBy: r.initial_ack_by ?? 'Unacknowledged',
      initialAckTimestamp: ui.initialAckTimestamp ?? hhmmss(r.initial_ack_at),
      aiReport: r.ai_report ?? undefined,
      claimedByAnalystId: r.claimed_by_id ?? undefined,
      claimedByAnalystName: r.claimer_name ?? undefined,
      claimedTimestamp: hhmmss(r.claimed_at),
      slaDeadline: ui.slaDeadline ?? hhmmss(r.sla_deadline, false) ?? '',
      slaRisk: r.sla_risk,
      agingHours: ui.agingHours ?? agingHours,
      mitreTactic: r.mitre_tactic ?? '',
      entityUser: r.entity_user ?? undefined,
      entityHost: r.entity_host ?? undefined,
      entityIp: r.entity_ip ?? undefined,
      correlatedIncidentId: r.correlated_incident_id ?? undefined,
      tuningFlagged: r.tuning_flagged,
      tuningReason: r.tuning_reason ?? undefined,
      closureReason: r.closure_reason ?? undefined,
      resolutionNotes: r.resolution_notes ?? undefined,
      ...(r.escalation || {}),
      ...(r.handover || {}),
    } as Alert;
  });
}

export async function audit(actorId: string, action: string, objectType: string, objectId: string, details?: unknown) {
  if (!pool) return;
  await pool.query(
    'INSERT INTO audit_log (actor_id, action, object_type, object_id, details) VALUES ($1,$2,$3,$4,$5)',
    [actorId, action, objectType, objectId, details ? JSON.stringify(details) : null]
  );
}
