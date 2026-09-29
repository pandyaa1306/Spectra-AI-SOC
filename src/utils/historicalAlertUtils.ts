import { Alert, HistoricalAlertMatch, HistoricalAlertCorrelationSection, ExecutiveTriageReport } from '../types/soc';
import { INITIAL_ALERTS } from '../data/mockSocData';

/**
 * Historical SOC Alert Archive
 * Real-world historical incident log containing closed alerts categorized
 * as True Positive or Benign (False Positive/Authorized).
 */
export const HISTORICAL_CLOSED_ALERTS_DATABASE: HistoricalAlertMatch[] = [
  // User: s.jenkins@apexfin.com (Apex Financial Group)
  {
    alertId: 'ALT-HIST-8812',
    incidentId: 'INC-2025-4109',
    title: 'OAuth Consent Grant & Mailbox Scraping (FIN7 Campaign)',
    timestamp: '2025-11-14 14:18 UTC',
    relativeTime: '4 months ago',
    severity: 'Critical',
    client: 'Apex Financial Group',
    source_platform: 'Microsoft Defender',
    isHistoricalClosed: true,
    status: 'Closed (True Positive)',
    closureResult: 'True Positive',
    closureCategory: 'Account Takeover & Malicious Mail Exfiltration',
    closedBy: 'David Sterling (Tier 2 Incident Responder)',
    closureTimestamp: '2025-11-14 15:42 UTC',
    resolutionNotes:
      'CONFIRMED TRUE POSITIVE: Threat actor utilized stolen session tokens to grant unauthorized OAuth permissions to an external malicious app (eDiscovery Extractor). Revoked Azure OAuth application consent, terminated all active cloud sessions, purged malicious forwarding rules, and enforced hardware FIDO2 key re-registration.',
    matchedBy: [
      { type: 'Same User', value: 's.jenkins@apexfin.com', details: 'Target user identity compromised via stolen session' },
      { type: 'Key Indicator (IP)', value: '185.220.101.45', details: 'Tor Exit Node / Hosting Provider M247 Europe B.V.' },
      { type: 'Key Indicator (Domain)', value: 'temp-vault-drop.cc', details: 'Adversary dropzone host registered for mail harvesting' },
      { type: 'Key Indicator (Host)', value: 'CORP-LAPTOP-882', details: 'Executive device targeted in persistence campaign' },
    ],
    actionsTaken: [
      'Revoked Azure OAuth Tokens',
      'Terminated Active Cloud Sessions',
      'Purged Mailbox Forwarding Rules',
      'Hard Reset User Credential & MFA',
    ],
  },
  {
    alertId: 'ALT-HIST-8104',
    incidentId: 'INC-2025-1994',
    title: 'Legitimate Admin eDiscovery PowerShell Activity',
    timestamp: '2025-05-19 11:22 UTC',
    relativeTime: '10 months ago',
    severity: 'Low',
    client: 'Apex Financial Group',
    source_platform: 'Splunk',
    isHistoricalClosed: true,
    status: 'Closed (Benign / False Positive)',
    closureResult: 'Benign',
    closureCategory: 'Approved Administrative Task / Regulatory Compliance Audit',
    closedBy: 'Maya Lin (Tier 1 SOC Analyst)',
    closureTimestamp: '2025-05-19 11:47 UTC',
    resolutionNotes:
      'CLOSED AS BENIGN (FALSE POSITIVE): Correlated with approved ServiceNow Change Request CR-994112 for annual regulatory compliance eDiscovery archive test. Verified with Apex IT operations department lead. No malicious intent; activity was pre-scheduled and authorized.',
    matchedBy: [
      { type: 'Same User', value: 's.jenkins@apexfin.com', details: 'Designated executive custodian for compliance test' },
      { type: 'Key Indicator (Host)', value: 'CORP-LAPTOP-882', details: 'Source host used during authorized compliance audit' },
    ],
    actionsTaken: [
      'Verified Change Request CR-994112',
      'Confirmed with Apex IT Operations Manager',
      'Added 24h Telemetry Suppression for Audit Run',
    ],
  },
  {
    alertId: 'ALT-HIST-7940',
    title: 'Unusual Egress Spike to External Cloud Storage',
    timestamp: '2025-08-12 09:14 UTC',
    relativeTime: '7 months ago',
    severity: 'Medium',
    client: 'Apex Financial Group',
    source_platform: 'Zscaler',
    isHistoricalClosed: true,
    status: 'Closed (Benign / False Positive)',
    closureResult: 'Benign',
    closureCategory: 'Authorized Cloud Backup Sync',
    closedBy: 'Sarah Chen (Tier 1 SOC Analyst)',
    closureTimestamp: '2025-08-12 09:55 UTC',
    resolutionNotes:
      'CLOSED AS BENIGN: Telemetry spike correlated with corporate OneDrive quarterly sync of quantitative trading documentation. Endpoint integrity verified clean with no anomalous processes or network redirects.',
    matchedBy: [
      { type: 'Key Indicator (Host)', value: 'CORP-LAPTOP-882', details: 'Device performing scheduled backup sync' },
    ],
    actionsTaken: ['Validated corporate OneDrive destination endpoint', 'Confirmed host hash integrity'],
  },

  // User: r.vaughn@aerotech.com (AeroTech Defense Corp)
  {
    alertId: 'ALT-HIST-9011',
    incidentId: 'INC-2026-0312',
    title: 'High-Volume Data Export to External Cloud Repository',
    timestamp: '2026-01-18 16:30 UTC',
    relativeTime: '2 months ago',
    severity: 'Critical',
    client: 'AeroTech Defense Corp',
    source_platform: 'Splunk',
    isHistoricalClosed: true,
    status: 'Closed (True Positive)',
    closureResult: 'True Positive',
    closureCategory: 'Insider Threat / Unauthorized Defense Data Exfiltration',
    closedBy: "James O'Connor (Tier 2 Incident Responder)",
    closureTimestamp: '2026-01-18 17:55 UTC',
    resolutionNotes:
      'CONFIRMED TRUE POSITIVE: Senior engineering identity transferred 14GB of proprietary CAD aerospace schematics to an unapproved AWS S3 bucket. Workstation was quarantined, IAM access revoked, and incident escalated to Defense Security Service (DSS) compliance board.',
    matchedBy: [
      { type: 'Same User', value: 'r.vaughn@aerotech.com', details: 'User identity involved in unauthorized CAD repository transfer' },
      { type: 'Key Indicator (Host)', value: 'DEV-CAD-WRK09', details: 'CAD workstation utilized for data staging' },
      { type: 'Key Indicator (IP)', value: '54.210.88.19', details: 'Target egress gateway for external bucket' },
    ],
    actionsTaken: [
      'Host Isolated via EDR',
      'Active Directory Account Locked',
      'Revoked AWS IAM Engineering Credentials',
      'Notified Defense Security Service (DSS)',
    ],
  },
  {
    alertId: 'ALT-HIST-7731',
    title: 'Multiple Failed SSH Authentication Bursts to CAD Bastion',
    timestamp: '2025-10-04 08:20 UTC',
    relativeTime: '5 months ago',
    severity: 'Low',
    client: 'AeroTech Defense Corp',
    source_platform: 'Google SecOps',
    isHistoricalClosed: true,
    status: 'Closed (Benign / False Positive)',
    closureResult: 'Benign',
    closureCategory: 'User Credential Expired / Human Error',
    closedBy: 'Marcus Vance (Tier 1 SOC Analyst)',
    closureTimestamp: '2025-10-04 08:45 UTC',
    resolutionNotes:
      'CLOSED AS BENIGN (FALSE POSITIVE): User entered expired password multiple times following quarterly domain password rotation policy. Contacted user via secure phone verification; password updated and SSH key re-enrolled.',
    matchedBy: [
      { type: 'Same User', value: 'r.vaughn@aerotech.com', details: 'User experiencing domain password sync delay' },
    ],
    actionsTaken: ['Verified user identity via out-of-band callback', 'Assisted in domain credential refresh'],
  },

  // User: svc_radiology@nexushealth.org (Nexus Health Systems)
  {
    alertId: 'ALT-HIST-9120',
    title: 'Kerberos TGS Ticket Storm on Service Principal',
    timestamp: '2025-12-09 22:15 UTC',
    relativeTime: '3 months ago',
    severity: 'Medium',
    client: 'Nexus Health Systems',
    source_platform: 'Microsoft Defender',
    isHistoricalClosed: true,
    status: 'Closed (Benign / False Positive)',
    closureResult: 'Benign',
    closureCategory: 'PACS Routine Failover Query / Vulnerability Scan',
    closedBy: 'Priya Patel (Tier 2 Incident Responder)',
    closureTimestamp: '2025-12-09 23:05 UTC',
    resolutionNotes:
      'CLOSED AS BENIGN: Nexus PACS clinical medical imaging cluster executed scheduled failover test querying MSSQL endpoints on DC01-NEXUS-CORP. Validated ticket requests matched approved PACS maintenance window CR-88319.',
    matchedBy: [
      { type: 'Same User', value: 'svc_radiology@nexushealth.org', details: 'Service account queried during hospital PACS cluster sync' },
      { type: 'Key Indicator (Host)', value: 'DC01-NEXUS-CORP', details: 'Target Domain Controller' },
    ],
    actionsTaken: ['Verified PACS maintenance window ticket', 'Tuned SIEM detection threshold for PACS cluster'],
  },
  {
    alertId: 'ALT-HIST-8430',
    incidentId: 'INC-2025-3882',
    title: 'Privileged Service Account Interactive Logon from Workstation',
    timestamp: '2025-09-02 03:40 UTC',
    relativeTime: '6 months ago',
    severity: 'High',
    client: 'Nexus Health Systems',
    source_platform: 'CrowdStrike',
    isHistoricalClosed: true,
    status: 'Closed (True Positive)',
    closureResult: 'True Positive',
    closureCategory: 'Credential Abuse / Lateral Movement',
    closedBy: 'Elena Rostova (Tier 2 Incident Responder)',
    closureTimestamp: '2025-09-02 05:10 UTC',
    resolutionNotes:
      'CONFIRMED TRUE POSITIVE: Hardcoded radiology service account credentials were stolen from a compromised nursing station and sprayed against internal endpoints. SPN credentials rotated to 32-character AES-256 and Kerberos delegation restricted.',
    matchedBy: [
      { type: 'Same User', value: 'svc_radiology@nexushealth.org', details: 'Compromised service account utilized for unauthorized access' },
      { type: 'Key Indicator (Host)', value: 'DC01-NEXUS-CORP', details: 'Authentication target' },
    ],
    actionsTaken: [
      'Rotated svc_radiology Kerberos Password',
      'Enforced AES-256 Encryption Requirement',
      'Terminated unauthorized interactive sessions',
    ],
  },

  // Host: SUB04-PLC-GATEWAY (AeroTech Defense Corp)
  {
    alertId: 'ALT-HIST-8874',
    incidentId: 'INC-2026-0202',
    title: 'Modbus Function Code 16 (Write Multiple Registers) Burst',
    timestamp: '2026-02-02 04:12 UTC',
    relativeTime: '1 month ago',
    severity: 'Critical',
    client: 'AeroTech Defense Corp',
    source_platform: 'Google SecOps',
    isHistoricalClosed: true,
    status: 'Closed (True Positive)',
    closureResult: 'True Positive',
    closureCategory: 'Industrial Control System (ICS) Injection Attempt',
    closedBy: 'Henrik Lindqvist (Tier 2 Incident Responder)',
    closureTimestamp: '2026-02-02 05:40 UTC',
    resolutionNotes:
      'CONFIRMED TRUE POSITIVE: Unauthorized rogue engineering laptop injected malformed Modbus function code 16 packets aiming to manipulate substation frequency relays. OT firewall severed gateway connection and firmware backup was re-flashed.',
    matchedBy: [
      { type: 'Key Indicator (Host)', value: 'SUB04-PLC-GATEWAY', details: 'Target Modbus Gateway device' },
      { type: 'Key Indicator (IP)', value: '10.240.12.8', details: 'Substation internal control subnet IP' },
    ],
    actionsTaken: [
      'Isolated Substation-04 Gateway VLAN',
      'Re-flashed PLC digest firmware baseline',
      'Revoked rogue engineering certificate',
    ],
  },
  {
    alertId: 'ALT-HIST-7419',
    title: 'Substation Telemetry Heartbeat Jitter',
    timestamp: '2025-07-11 14:02 UTC',
    relativeTime: '8 months ago',
    severity: 'Low',
    client: 'AeroTech Defense Corp',
    source_platform: 'Google SecOps',
    isHistoricalClosed: true,
    status: 'Closed (Benign / False Positive)',
    closureResult: 'Benign',
    closureCategory: 'Scheduled Telemetry Firmware Sync',
    closedBy: 'Rachel Brooks (Tier 1 SOC Analyst)',
    closureTimestamp: '2025-07-11 14:30 UTC',
    resolutionNotes:
      'CLOSED AS BENIGN: Telemetry latency caused by utility WAN cellular failover test during storm simulation exercise. Verified by AeroTech OT operations dispatch.',
    matchedBy: [
      { type: 'Key Indicator (Host)', value: 'SUB04-PLC-GATEWAY', details: 'Gateway involved in failover test' },
    ],
    actionsTaken: ['Logged OT maintenance notification', 'Verified packet recovery rate'],
  },

  // User: deploy-bot@nexushealth.org (Nexus Health Systems)
  {
    alertId: 'ALT-HIST-9442',
    title: 'Kubernetes HostPath Mount in Staging Namespace',
    timestamp: '2026-02-20 18:22 UTC',
    relativeTime: '1 month ago',
    severity: 'High',
    client: 'Nexus Health Systems',
    source_platform: 'Google SecOps',
    isHistoricalClosed: true,
    status: 'Closed (Benign / False Positive)',
    closureResult: 'Benign',
    closureCategory: 'Developer Debugging Misconfiguration / Policy Blocked',
    closedBy: 'Sophia Kim (Tier 2 Incident Responder)',
    closureTimestamp: '2026-02-20 18:55 UTC',
    resolutionNotes:
      'CLOSED AS BENIGN (FALSE POSITIVE): DevOps engineer accidentally configured hostPath mount for container log collection in Helm chart template. Pod admission controller blocked the deployment before runtime; no host compromise occurred. PR corrected and merged.',
    matchedBy: [
      { type: 'Same User', value: 'deploy-bot@nexushealth.org', details: 'CI/CD service account deploying Helm template' },
      { type: 'Key Indicator (Host)', value: 'k8s-prod-worker-04', details: 'Target cluster worker node' },
    ],
    actionsTaken: [
      'Verified admission webhook blocked container execution',
      'Assisted DevOps team in updating Helm security context',
    ],
  },
  {
    alertId: 'ALT-HIST-8319',
    incidentId: 'INC-2025-3108',
    title: 'Compromised CI/CD Deploy Token Executing Crypto Miner',
    timestamp: '2025-09-28 20:10 UTC',
    relativeTime: '6 months ago',
    severity: 'Critical',
    client: 'Nexus Health Systems',
    source_platform: 'Google SecOps',
    isHistoricalClosed: true,
    status: 'Closed (True Positive)',
    closureResult: 'True Positive',
    closureCategory: 'Compromised Token & Cryptojacking Container Deployment',
    closedBy: 'Liam Murphy (Tier 2 Incident Responder)',
    closureTimestamp: '2025-09-28 21:30 UTC',
    resolutionNotes:
      'CONFIRMED TRUE POSITIVE: Leaked GitHub Actions deployment token was used by external threat actor to launch unauthorized container executing XMRig miner. Container terminated, deploy token revoked, and secret rotated.',
    matchedBy: [
      { type: 'Same User', value: 'deploy-bot@nexushealth.org', details: 'Target automated deployment identity' },
      { type: 'Key Indicator (Host)', value: 'k8s-prod-worker-04', details: 'Cluster host where malicious pod scheduled' },
    ],
    actionsTaken: [
      'Terminated Rogue Pod via kubectl delete',
      'Rotated GitHub Actions Deploy Secrets',
      'Added Static Secret Scanning in Pre-Commit Hooks',
    ],
  },

  // IP: 194.26.29.11 (AeroTech Defense Corp)
  {
    alertId: 'ALT-HIST-9331',
    title: 'External TCP SYN Port Sweep on Perimeter DMZ',
    timestamp: '2026-01-29 11:05 UTC',
    relativeTime: '2 months ago',
    severity: 'Low',
    client: 'AeroTech Defense Corp',
    source_platform: 'Zscaler',
    isHistoricalClosed: true,
    status: 'Closed (Benign / False Positive)',
    closureResult: 'Benign',
    closureCategory: 'Routine Internet Scanning Noise / Blocked at Edge',
    closedBy: 'FusionAI Auto-Triage',
    closureTimestamp: '2026-01-29 11:06 UTC',
    resolutionNotes:
      'CLOSED AS BENIGN: Standard automated internet port scan from low-reputation cloud VPS. All SYN packets dropped at edge perimeter with zero internal session establishment. Added to temporary edge drop list.',
    matchedBy: [
      { type: 'Key Indicator (IP)', value: '194.26.29.11', details: 'Source scanner IP' },
    ],
    actionsTaken: ['Confirmed 100% firewall drop rate', 'Added IP to 24h transient blocklist'],
  },
];

/**
 * Searches and synthesizes all previous closed alerts and concurrent related alerts
 * for the given alert by matching:
 * 1. Same user identity (email, username, principal)
 * 2. Key indicators (IP, Hostname, Domain, Hash)
 * 3. Associated attack chain / incident correlation
 */
export function getCorrelatedAndHistoricalAlerts(
  alert: Alert,
  allActiveAlerts: Alert[] = INITIAL_ALERTS,
  triageReport?: ExecutiveTriageReport
): HistoricalAlertCorrelationSection {
  const matches: HistoricalAlertMatch[] = [];

  // Extract user identifiers from alert and report
  const userIdentities = new Set<string>();
  if (alert.entityUser) userIdentities.add(alert.entityUser.toLowerCase().trim());
  if (triageReport?.when.affectedUsers) {
    triageReport.when.affectedUsers.forEach((u) => {
      const emailMatch = u.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) userIdentities.add(emailMatch[0].toLowerCase().trim());
      userIdentities.add(u.toLowerCase().trim());
    });
  }

  // Extract key indicators (IPs, Hosts, Domains, Hashes)
  const ips = new Set<string>();
  if (alert.entityIp) ips.add(alert.entityIp.trim());
  if (triageReport?.analysisResult.ipAnalysis.ip) {
    ips.add(triageReport.analysisResult.ipAnalysis.ip.trim());
  }

  const hosts = new Set<string>();
  if (alert.entityHost) hosts.add(alert.entityHost.toLowerCase().trim());
  if (triageReport?.when.affectedAssets) {
    triageReport.when.affectedAssets.forEach((a) => {
      const hostClean = a.split(' ')[0].toLowerCase().trim();
      hosts.add(hostClean);
    });
  }

  const domains = new Set<string>();
  if (triageReport?.analysisResult.domainReputation.domain) {
    domains.add(triageReport.analysisResult.domainReputation.domain.toLowerCase().trim());
  }
  if (triageReport?.analysisResult.symantecSiteReview.targetUrlOrDomain) {
    domains.add(triageReport.analysisResult.symantecSiteReview.targetUrlOrDomain.toLowerCase().trim());
  }

  const hashes = new Set<string>();
  if (triageReport?.analysisResult.hashAnalysis.sha256) {
    hashes.add(triageReport.analysisResult.hashAnalysis.sha256.toLowerCase().trim());
  }

  // Check additional indicators list
  if (triageReport?.keyIndicators.indicators) {
    triageReport.keyIndicators.indicators.forEach((ind) => {
      if (ind.type === 'IP') ips.add(ind.value.trim());
      if (ind.type === 'Domain') domains.add(ind.value.toLowerCase().trim());
      if (ind.type === 'Hash') hashes.add(ind.value.toLowerCase().trim());
      if (ind.type === 'Identity') {
        const em = ind.value.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (em) userIdentities.add(em[0].toLowerCase().trim());
        userIdentities.add(ind.value.toLowerCase().trim());
      }
    });
  }

  // 1. MATCH AGAINST HISTORICAL CLOSED ALERTS DATABASE
  HISTORICAL_CLOSED_ALERTS_DATABASE.forEach((histAlert) => {
    const matchedCriteria: HistoricalAlertMatch['matchedBy'] = [];

    // Check if same user matched
    histAlert.matchedBy.forEach((m) => {
      if (m.type === 'Same User') {
        const valLower = m.value.toLowerCase().trim();
        for (const u of userIdentities) {
          if (u.includes(valLower) || valLower.includes(u)) {
            matchedCriteria.push({
              type: 'Same User',
              value: m.value,
              details: m.details || `Prior alert recorded under user identity "${m.value}"`,
            });
            break;
          }
        }
      } else if (m.type === 'Key Indicator (IP)') {
        if (ips.has(m.value.trim())) {
          matchedCriteria.push({
            type: 'Key Indicator (IP)',
            value: m.value,
            details: m.details || `Source/destination IP "${m.value}" matches prior closed alert`,
          });
        }
      } else if (m.type === 'Key Indicator (Host)') {
        const valLower = m.value.toLowerCase().trim();
        for (const h of hosts) {
          if (h.includes(valLower) || valLower.includes(h)) {
            matchedCriteria.push({
              type: 'Key Indicator (Host)',
              value: m.value,
              details: m.details || `Host asset "${m.value}" matches prior closed alert`,
            });
            break;
          }
        }
      } else if (m.type === 'Key Indicator (Domain)') {
        const valLower = m.value.toLowerCase().trim();
        for (const d of domains) {
          if (d.includes(valLower) || valLower.includes(d)) {
            matchedCriteria.push({
              type: 'Key Indicator (Domain)',
              value: m.value,
              details: m.details || `Domain "${m.value}" matches prior closed alert`,
            });
            break;
          }
        }
      } else if (m.type === 'Key Indicator (Hash)') {
        if (hashes.has(m.value.toLowerCase().trim())) {
          matchedCriteria.push({
            type: 'Key Indicator (Hash)',
            value: m.value,
            details: m.details || `Payload SHA256 matches prior closed alert`,
          });
        }
      }
    });

    if (matchedCriteria.length > 0) {
      // Deduplicate matched criteria by value
      const uniqueCriteria = matchedCriteria.filter(
        (c, idx, self) => self.findIndex((s) => s.value === c.value && s.type === c.type) === idx
      );

      matches.push({
        ...histAlert,
        matchedBy: uniqueCriteria,
      });
    }
  });

  // 2. MATCH AGAINST OTHER ACTIVE / CONCURRENT ALERTS IN THE QUEUE
  allActiveAlerts.forEach((activeAlert) => {
    if (activeAlert.id === alert.id) return; // Skip self

    const matchedCriteria: HistoricalAlertMatch['matchedBy'] = [];

    // Check user match
    if (activeAlert.entityUser) {
      const activeUserLower = activeAlert.entityUser.toLowerCase().trim();
      for (const u of userIdentities) {
        if (u.includes(activeUserLower) || activeUserLower.includes(u)) {
          matchedCriteria.push({
            type: 'Same User',
            value: activeAlert.entityUser,
            details: `Active concurrent alert assigned to same user identity: ${activeAlert.entityUser}`,
          });
          break;
        }
      }
    }

    // Check IP match
    if (activeAlert.entityIp && ips.has(activeAlert.entityIp.trim())) {
      matchedCriteria.push({
        type: 'Key Indicator (IP)',
        value: activeAlert.entityIp,
        details: `Active concurrent alert sharing IP: ${activeAlert.entityIp}`,
      });
    }

    // Check Host match
    if (activeAlert.entityHost) {
      const activeHostLower = activeAlert.entityHost.toLowerCase().trim();
      for (const h of hosts) {
        if (h.includes(activeHostLower) || activeHostLower.includes(h)) {
          matchedCriteria.push({
            type: 'Key Indicator (Host)',
            value: activeAlert.entityHost,
            details: `Active concurrent alert sharing host asset: ${activeAlert.entityHost}`,
          });
          break;
        }
      }
    }

    // Check Incident ID match
    if (alert.correlatedIncidentId && activeAlert.correlatedIncidentId === alert.correlatedIncidentId) {
      matchedCriteria.push({
        type: 'Correlated Incident',
        value: alert.correlatedIncidentId,
        details: `Both alerts are grouped under Master Incident ${alert.correlatedIncidentId}`,
      });
    }

    if (matchedCriteria.length > 0) {
      const uniqueCriteria = matchedCriteria.filter(
        (c, idx, self) => self.findIndex((s) => s.value === c.value && s.type === c.type) === idx
      );

      matches.push({
        alertId: activeAlert.id,
        title: activeAlert.title,
        timestamp: activeAlert.timestamp,
        relativeTime: `${activeAlert.agingHours ? `${activeAlert.agingHours}h ago` : 'Active'}`,
        severity: activeAlert.severity,
        client: activeAlert.client,
        source_platform: activeAlert.source_platform,
        isHistoricalClosed: false,
        status: `Active (${activeAlert.status})`,
        closureResult: 'Open / In-Progress',
        closureCategory: 'Concurrent Active Threat Investigation',
        closedBy: activeAlert.assignedTo ? `${activeAlert.assignedTo} (Active Assignee)` : 'Pending Claim',
        resolutionNotes:
          `Active alert currently under triage by ${activeAlert.assignedTo}. Telemetry correlated across ${activeAlert.source_platform} with MITRE tactic: ${activeAlert.mitreTactic}. Correlated Incident ID: ${activeAlert.correlatedIncidentId || 'N/A'}.`,
        matchedBy: uniqueCriteria,
        incidentId: activeAlert.correlatedIncidentId,
        actionsTaken: ['Alert Triaged by FusionAI', 'Correlated with Active Campaign', 'Assigned to Analyst Queue'],
      });
    }
  });

  // Calculate breakdown counts
  const truePositiveMatches = matches.filter((m) => m.closureResult === 'True Positive');
  const benignMatches = matches.filter((m) => m.closureResult === 'Benign' || m.closureResult === 'False Positive');
  const activeMatches = matches.filter((m) => !m.isHistoricalClosed);

  // Generate actionable summary verdict
  let summaryVerdict = '';
  if (truePositiveMatches.length > 0) {
    const tpDates = truePositiveMatches.map((m) => m.relativeTime || m.timestamp).join(', ');
    summaryVerdict = `⚠️ HIGH RISK — REPETITIVE TRUE POSITIVE PRECEDENT: This entity/indicator was involved in ${truePositiveMatches.length} confirmed True Positive malicious incident(s) (${tpDates}). Prior investigations required active containment (session revocation, host isolation, or C2 drop). High probability of active adversarial campaign or re-compromise.`;
  } else if (benignMatches.length > 0 && activeMatches.length === 0) {
    summaryVerdict = `ℹ️ LOW/MODERATE RISK — HISTORICAL BENIGN BASELINE: Correlated with ${benignMatches.length} historical alert(s) previously investigated and closed as BENIGN (False Positive / Authorized Activity). Previous analysts verified activities as scheduled maintenance or routine administration. Verify against current change tickets.`;
  } else if (benignMatches.length > 0 && activeMatches.length > 0) {
    summaryVerdict = `⚠️ CONCURRENT THREAT WITH BENIGN PRECEDENT: Correlated with ${activeMatches.length} active in-progress alert(s) across sensors, alongside ${benignMatches.length} historical Benign alert(s). Scrutinize current activity against authorized change requests.`;
  } else if (activeMatches.length > 0) {
    summaryVerdict = `⚡ ACTIVE MULTI-STAGE CAMPAIGN DETECTED: Correlated with ${activeMatches.length} other active in-progress alert(s) sharing identical user identity or IoCs in real time. Converges into coordinated incident response.`;
  } else {
    summaryVerdict = `✅ CLEAN HISTORICAL BASELINE: No prior alerts or historical incidents recorded for this user identity or key indicators across the 365-day SOC enterprise archive. Represents a first-time baseline observation.`;
  }

  return {
    hasMatches: matches.length > 0,
    totalMatches: matches.length,
    truePositiveCount: truePositiveMatches.length,
    benignCount: benignMatches.length,
    activeCount: activeMatches.length,
    summaryVerdict,
    matchedAlerts: matches,
  };
}
