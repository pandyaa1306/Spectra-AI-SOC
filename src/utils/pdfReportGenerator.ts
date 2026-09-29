import { jsPDF } from 'jspdf';
import { Alert, Analyst, Client } from '../types/soc';
import { getAlertCaseNumber, getAlertTicketNumber, getCaseCostAndTimeSavings } from './ticketUtils';

export type ReportKind = 'shift-handover' | 'executive-summary' | 'current-view';

export interface PdfReportOptions {
  reportKind: ReportKind;
  reportTitle?: string;
  timeframeLabel: string;
  timeframeKey: string;
  clientScopeName: string;
  clientId: string;
  alerts: Alert[];
  analysts: Analyst[];
  clients: Client[];
  shiftNotes?: string;
  outgoingLead?: string;
  incomingLead?: string;
  currentShiftName?: string;
  nextShiftName?: string;
  currentTabName?: string;
  includeSavings?: boolean;
  includeMitre?: boolean;
  includeRoster?: boolean;
  metrics: {
    totalVolume: number;
    criticalVolume: number;
    highVolume: number;
    autoTriagedCount: number;
    autoTriagedRatio: number;
    hoursSaved: number;
    cumulativeCostSavingsUSD: number;
    mttdMinutes?: number;
    mttrMinutes?: number;
  };
  techData?: Array<{
    technologyName: string;
    closureCount: number;
    closureRatePct: number;
    costSavedUSD: number;
    hoursSaved: number;
  }>;
}

/**
 * Generates and downloads a binary PDF file using jsPDF
 */
export function downloadSocPdfReport(options: PdfReportOptions): void {
  const {
    reportKind,
    reportTitle,
    timeframeLabel,
    timeframeKey,
    clientScopeName,
    alerts,
    analysts,
    clients,
    shiftNotes,
    outgoingLead = 'David Sterling (Senior Lead Tier-3)',
    incomingLead = 'Sarah Chen (Senior Incident Commander)',
    currentShiftName = 'Morning Shift (08:00 - 16:00 UTC)',
    nextShiftName = 'Afternoon Shift (16:00 - 00:00 UTC)',
    metrics,
    techData = [],
    includeSavings = true,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number): void => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage();
      y = margin;
      drawHeaderBanner(false);
    }
  };

  const drawHeaderBanner = (isFirstPage: boolean) => {
    // Header gradient / dark banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, isFirstPage ? 32 : 18, 'F');

    // Accent line
    doc.setFillColor(6, 182, 212); // cyan-500
    doc.rect(0, (isFirstPage ? 32 : 18) - 1.5, pageWidth, 1.5, 'F');

    // Brand title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 14 : 10);
    doc.setTextColor(255, 255, 255);
    doc.text('FUSIONAI SECURITY OPERATIONS CENTER', margin, isFirstPage ? 13 : 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirstPage ? 9 : 7);
    doc.setTextColor(148, 163, 184); // slate-400
    const subtitle =
      reportKind === 'shift-handover'
        ? 'OPERATIONAL SHIFT-HANDOVER DOSSIER • FORMAL DISPATCH'
        : reportKind === 'executive-summary'
        ? 'EXECUTIVE STAKEHOLDER SECURITY REVIEW • CISO BRIEFING'
        : 'SOC CURRENT VIEW OPERATIONAL AUDIT REPORT';
    doc.text(subtitle, margin, isFirstPage ? 20 : 15);

    // Classification & Timestamp on right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(239, 68, 68); // Red / Amber confidentiality
    doc.text('TLP:AMBER+STRICT • CONFIDENTIAL', pageWidth - margin, isFirstPage ? 12 : 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225);
    doc.text(
      `Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC`,
      pageWidth - margin,
      isFirstPage ? 18 : 14,
      { align: 'right' }
    );

    y = (isFirstPage ? 32 : 18) + 6;
  };

  // 1. Initial Page Header
  drawHeaderBanner(true);

  // 2. Metadata Block (Boxed)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const finalTitle =
    reportTitle ||
    (reportKind === 'shift-handover'
      ? 'Tactical Shift Handover & Open Incident Dossier'
      : reportKind === 'executive-summary'
      ? 'Executive Cybersecurity Posture & Platform ROI Digest'
      : 'Current View Telemetry & Operations Snapshot');
  doc.text(finalTitle, margin + 4, y + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const col1X = margin + 4;
  const col2X = margin + 64;
  const col3X = margin + 128;

  doc.text(`Timeframe: ${timeframeLabel}`, col1X, y + 13);
  doc.text(`Client Scope: ${clientScopeName}`, col1X, y + 19);

  if (reportKind === 'shift-handover') {
    doc.text(`Active Shift: ${currentShiftName}`, col2X, y + 13);
    doc.text(`Incoming Shift: ${nextShiftName}`, col2X, y + 19);
    doc.text(`Outgoing Lead: ${outgoingLead}`, col3X, y + 13);
    doc.text(`Incoming Lead: ${incomingLead}`, col3X, y + 19);
  } else {
    doc.text(`Monitored Sensor Fleet: 8 Integrations`, col2X, y + 13);
    doc.text(`Enterprise Tenants: 3 Dedicated Pods`, col2X, y + 19);
    doc.text(`Prepared By: FusionAI SOC Autonomous Engine`, col3X, y + 13);
    doc.text(`SLA Audit Standard: Enterprise Platinum`, col3X, y + 19);
  }

  y += 30;

  // 3. Operational KPI Metric Cards (Row of 4)
  checkPageBreak(26);
  const cardWidth = (contentWidth - 9) / 4;
  const kpis = [
    {
      title: 'TOTAL 24H SIGNALS',
      value: metrics.totalVolume.toLocaleString(),
      sub: `${metrics.criticalVolume} Critical / ${metrics.highVolume} High`,
      color: [14, 116, 144], // cyan-700
      bg: [236, 254, 255], // cyan-50
    },
    {
      title: 'AI AUTONOMOUS TRIAGE',
      value: `${metrics.autoTriagedRatio}%`,
      sub: `${metrics.autoTriagedCount.toLocaleString()} resolved autonomously`,
      color: [21, 128, 61], // emerald-700
      bg: [240, 253, 244], // emerald-50
    },
    {
      title: 'LABOR COST AVOIDED',
      value: `$${metrics.cumulativeCostSavingsUSD.toLocaleString()}`,
      sub: `${metrics.hoursSaved} analyst hours saved`,
      color: [5, 150, 105], // emerald-600
      bg: [236, 253, 245], // emerald-50
    },
    {
      title: reportKind === 'shift-handover' ? 'SLA BREACH RISK' : 'MTTD / MTTR',
      value: reportKind === 'shift-handover' ? '0 Breached / 16 Watched' : '4.2m / 12.8m',
      sub: reportKind === 'shift-handover' ? '100% On-time Containment' : '91% Faster than SLA Baseline',
      color: reportKind === 'shift-handover' ? [180, 83, 9] : [79, 70, 229], // amber or indigo
      bg: [255, 251, 235],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cardX, y, cardWidth, 22, 1.5, 1.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.title, cardX + 3, y + 5);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, cardX + 3, y + 12);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, cardX + 3, y + 18);
  });

  y += 28;

  // 4. Executive Narrative / Shift Handover Summary Section
  checkPageBreak(38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const narrativeHeader =
    reportKind === 'shift-handover'
      ? '1. SHIFT OPERATIONAL SUMMARY & OUTGOING LEAD NOTES'
      : '1. EXECUTIVE POSTURE & STRATEGIC HIGHLIGHTS';
  doc.text(narrativeHeader, margin, y);
  y += 4;

  const defaultShiftNote =
    shiftNotes ||
    (reportKind === 'shift-handover'
      ? `Shift Alpha concluded active monitoring with zero SLA breaches across all 3 client pods. Primary focus was active containment of credential dumping (Mimikatz memory dump) in Apex Financial, successfully isolated by CrowdStrike sensor. 16 monitored at-risk cases are assigned to Tier-2 analysts with under 28 minutes remaining on containment timers. Incoming shift must immediately verify Sentinel RTU packet burst containment at 16:30 UTC.`
      : `During the ${timeframeLabel} operational window, the FusionAI Autonomous SOC Platform maintained a 98.4% SLA adherence rate across 3 enterprise client pods. Autonomous AI triage dispositioned ${metrics.autoTriagedRatio}% of inbound security telemetry in under 3.2 minutes average MTTR, generating quantifiable labor cost avoidance of $${metrics.cumulativeCostSavingsUSD.toLocaleString()} USD (${metrics.hoursSaved} analyst hours saved). High-severity threats were contained without perimeter degradation.`);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const noteLines = doc.splitTextToSize(defaultShiftNote, contentWidth - 8);
  const noteHeight = Math.max(16, noteLines.length * 4.2 + 6);
  doc.roundedRect(margin, y, contentWidth, noteHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(noteLines, margin + 4, y + 5);

  y += noteHeight + 6;

  // 5. Incidents / Escalated Alerts & In-Progress Queues
  if (reportKind === 'shift-handover') {
    const escalatedAlerts = alerts.filter(
      (a) => a.status === 'Escalated' || Boolean(a.escalatedTo)
    );
    const inProgressAlerts = alerts.filter(
      (a) =>
        a.status?.startsWith('In Progress') ||
        a.status === 'Acknowledged' ||
        (a.assignedAnalyst && a.status !== 'Closed')
    );

    // 5A. Escalated Alerts Section
    checkPageBreak(38);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`2. ESCALATED ALERTS REQUIRING INCOMING SHIFT ACTION (${escalatedAlerts.length})`, margin, y);
    y += 4;

    doc.setFillColor(153, 27, 27); // red-800
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    const escCols = [
      { title: 'CASE ID', x: margin + 3 },
      { title: 'SEV', x: margin + 26 },
      { title: 'ESCALATED THREAT & MITRE TACTIC', x: margin + 41 },
      { title: 'CLIENT POD', x: margin + 115 },
      { title: 'ESCALATED TO / TARGET', x: margin + 142 },
    ];
    escCols.forEach((col) => {
      doc.text(col.title, col.x, y + 4.8);
    });
    y += 7;

    if (escalatedAlerts.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('No active escalated alerts pending incoming shift attention.', margin + 4, y + 5);
      y += 8;
    } else {
      escalatedAlerts.forEach((alert, index) => {
        checkPageBreak(12);
        if (index % 2 === 1) {
          doc.setFillColor(254, 242, 242); // red-50
          doc.rect(margin, y, contentWidth, 11, 'F');
        }
        doc.setDrawColor(254, 202, 202); // red-200
        doc.line(margin, y + 11, margin + contentWidth, y + 11);

        const caseNum = getAlertCaseNumber(alert);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(185, 28, 28);
        doc.text(caseNum, margin + 3, y + 4.5);

        doc.setTextColor(220, 38, 38);
        doc.text(alert.severity.toUpperCase(), margin + 26, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        const titleTrunc = alert.title.length > 50 ? alert.title.substring(0, 48) + '...' : alert.title;
        doc.text(titleTrunc, margin + 41, y + 4.5);

        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        const clientTrunc = alert.client.length > 16 ? alert.client.substring(0, 14) + '..' : alert.client;
        doc.text(clientTrunc, margin + 115, y + 4.5);

        const escTarget = alert.escalatedTo || alert.escalationTarget || 'Tier-3 Lead';
        const targetTrunc = escTarget.length > 22 ? escTarget.substring(0, 20) + '..' : escTarget;
        doc.text(targetTrunc, margin + 142, y + 4.5);

        // Subline: Directive for incoming lead
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(185, 28, 28);
        doc.text('DIRECTIVE: ', margin + 41, y + 9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const directive = alert.escalationActionRequired || alert.incomingActionRequired || alert.handoverNotes || 'Maintain active telemetry bridge and confirm host isolation';
        const dirTrunc = directive.length > 88 ? directive.substring(0, 86) + '...' : directive;
        doc.text(dirTrunc, margin + 55, y + 9);

        y += 11;
      });
    }

    y += 5;

    // 5B. Active In-Progress Cases Table
    checkPageBreak(45);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`3. ACTIVE 'IN PROGRESS' CASES TRANSFERRED TO INCOMING SHIFT (${inProgressAlerts.length})`, margin, y);
    y += 4;

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    const inProgCols = [
      { title: 'CASE ID', x: margin + 3 },
      { title: 'SEV', x: margin + 26 },
      { title: 'INCIDENT TITLE & PLATFORM', x: margin + 41 },
      { title: 'CLIENT POD', x: margin + 115 },
      { title: 'ASSIGNEE', x: margin + 142 },
      { title: 'SLA MARGIN', x: margin + 166 },
    ];
    inProgCols.forEach((col) => {
      doc.text(col.title, col.x, y + 4.8);
    });
    y += 7;

    const topInProg = inProgressAlerts.slice(0, 12);
    topInProg.forEach((alert, index) => {
      checkPageBreak(8);
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 7.5, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 7.5, margin + contentWidth, y + 7.5);

      const caseNum = getAlertCaseNumber(alert);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(14, 116, 144);
      doc.text(caseNum, margin + 3, y + 5);

      const sev = alert.severity || 'Medium';
      if (sev === 'Critical') doc.setTextColor(220, 38, 38);
      else if (sev === 'High') doc.setTextColor(234, 88, 12);
      else doc.setTextColor(202, 138, 4);
      doc.text(sev.toUpperCase(), margin + 26, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      const titleTrunc = alert.title.length > 50 ? alert.title.substring(0, 48) + '...' : alert.title;
      doc.text(titleTrunc, margin + 41, y + 5);

      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const clientTrunc = alert.client.length > 16 ? alert.client.substring(0, 14) + '..' : alert.client;
      doc.text(clientTrunc, margin + 115, y + 5);

      const assignee = alert.assignedAnalyst || alert.assignedTo || alert.routedTo || 'FusionAI';
      const assignTrunc = assignee.length > 14 ? assignee.substring(0, 12) + '..' : assignee;
      doc.text(assignTrunc, margin + 142, y + 5);

      // SLA margin
      doc.setFont('helvetica', 'bold');
      if (alert.slaRisk) {
        doc.setTextColor(220, 38, 38);
        doc.text('< 25m', margin + 166, y + 5);
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text('On Track', margin + 166, y + 5);
      }

      y += 7.5;
    });

    y += 6;
  } else {
    // Executive / Current View Table
    checkPageBreak(50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('2. NOTABLE INCIDENTS & AUTONOMOUS ENRICHMENT AUDIT', margin, y);
    y += 4;

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    const tCols = [
      { title: 'CASE ID', x: margin + 3, w: 22 },
      { title: 'SEV', x: margin + 26, w: 14 },
      { title: 'INCIDENT TITLE & MITRE ATT&CK', x: margin + 41, w: 75 },
      { title: 'CLIENT POD', x: margin + 117, w: 26 },
      { title: 'ANALYST / AGENT', x: margin + 144, w: 23 },
      { title: 'LABOR ROI', x: margin + 168, w: 14, align: 'right' },
    ];

    tCols.forEach((col) => {
      doc.text(col.title, col.x, y + 4.8);
    });
    y += 7;

    const topAlerts = alerts.slice(0, 10);
    topAlerts.forEach((alert, index) => {
      checkPageBreak(8);

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 7.5, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 7.5, margin + contentWidth, y + 7.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(14, 116, 144);
      const caseNum = getAlertCaseNumber(alert);
      doc.text(caseNum, margin + 3, y + 5);

      const sev = alert.severity || 'Medium';
      if (sev === 'Critical') {
        doc.setTextColor(220, 38, 38);
      } else if (sev === 'High') {
        doc.setTextColor(234, 88, 12);
      } else {
        doc.setTextColor(202, 138, 4);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(sev.toUpperCase(), margin + 26, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      const truncatedTitle = alert.title.length > 52 ? alert.title.substring(0, 50) + '...' : alert.title;
      doc.text(truncatedTitle, margin + 41, y + 5);

      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const truncatedClient = alert.client.length > 17 ? alert.client.substring(0, 15) + '..' : alert.client;
      doc.text(truncatedClient, margin + 117, y + 5);

      const analystName = alert.assignedAnalyst ? alert.assignedAnalyst.split(' ')[0] : (alert.routedTo || 'FusionAI');
      doc.text(analystName, margin + 144, y + 5);

      if (includeSavings) {
        const savings = getCaseCostAndTimeSavings(alert);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(savings.costSavedFormatted, margin + 180, y + 5, { align: 'right' });
      }

      y += 7.5;
    });

    y += 6;
  }

  // 6. Technology Closure Analytics / Platform Breakdown
  if (techData && techData.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('3. SECURITY PLATFORM & SENSOR FLEET CLOSURE EFFICIENCY', margin, y);
    y += 4;

    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    doc.text('SECURITY PLATFORM / TECHNOLOGY', margin + 3, y + 4.2);
    doc.text('CLOSED ALERTS', margin + 78, y + 4.2);
    doc.text('CLOSURE RATE', margin + 110, y + 4.2);
    doc.text('HOURS SAVED', margin + 142, y + 4.2);
    doc.text('COST AVOIDED', margin + 180, y + 4.2, { align: 'right' });
    y += 6;

    techData.slice(0, 5).forEach((tech, idx) => {
      checkPageBreak(7);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6.5, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text(tech.technologyName, margin + 3, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.text(tech.closureCount.toLocaleString(), margin + 78, y + 4.5);
      doc.setTextColor(16, 185, 129);
      doc.text(`${tech.closureRatePct}%`, margin + 110, y + 4.5);

      doc.setTextColor(51, 65, 85);
      doc.text(`${tech.hoursSaved} hrs`, margin + 142, y + 4.5);

      doc.setTextColor(14, 116, 144);
      doc.text(`$${tech.costSavedUSD.toLocaleString()}`, margin + 180, y + 4.5, { align: 'right' });

      y += 6.5;
    });

    y += 6;
  }

  // 7. Shift Handover Action Items / Formal Signoff (if Shift Handover mode)
  if (reportKind === 'shift-handover') {
    checkPageBreak(36);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('4. FORMAL SHIFT-HANDOVER SIGN-OFF & OPERATIONAL ACTION ITEMS', margin, y);
    y += 4;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 28, 1.5, 1.5, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Action Items for Incoming Shift:', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('• Priority 1: Check Sentinel RTU packet burst triage in Pod 6 at 16:30 UTC.', margin + 4, y + 10);
    doc.text('• Priority 2: Confirm CrowdStrike host isolation unblock for Apex compliance server.', margin + 4, y + 14.5);
    doc.text('• Priority 3: Monitor 16 SLA breach watch cases currently at 22-28 min margin.', margin + 4, y + 19);

    // Signatures
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`Outgoing Lead (${outgoingLead}):  _________________________ [ACCEPTED]`, margin + 4, y + 24);
    doc.text(`Incoming Lead (${incomingLead}):  _________________________ [PENDING ACK]`, margin + 100, y + 24);

    y += 32;
  }

  // Page numbering on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    // Bottom footer line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text('FusionAI Autonomous Security Operations Platform • Confidential Defense Telemetry', margin, pageHeight - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  // Generate file name & trigger direct download
  const dateStr = new Date().toISOString().split('T')[0];
  const filePrefix =
    reportKind === 'shift-handover'
      ? 'FusionAI_SOC_Shift_Handover_Report'
      : reportKind === 'executive-summary'
      ? 'FusionAI_SOC_Executive_Summary'
      : 'FusionAI_SOC_Current_View_Report';
  const fileName = `${filePrefix}_${timeframeKey}_${dateStr}.pdf`;

  doc.save(fileName);
}

/**
 * Triggers browser Print to PDF using a clean styled hidden printable iframe
 */
export function printSocReportViaBrowser(options: PdfReportOptions): void {
  const {
    reportKind,
    reportTitle,
    timeframeLabel,
    clientScopeName,
    alerts,
    analysts,
    shiftNotes,
    outgoingLead = 'David Sterling (Senior Lead Tier-3)',
    incomingLead = 'Sarah Chen (Senior Incident Commander)',
    currentShiftName = 'Morning Shift (08:00 - 16:00 UTC)',
    nextShiftName = 'Afternoon Shift (16:00 - 00:00 UTC)',
    metrics,
    techData = [],
  } = options;

  const finalTitle =
    reportTitle ||
    (reportKind === 'shift-handover'
      ? 'Tactical Shift Handover & Open Incident Dossier'
      : reportKind === 'executive-summary'
      ? 'Executive Cybersecurity Posture & Platform ROI Digest'
      : 'Current View Telemetry & Operations Snapshot');

  const topAlerts = alerts.slice(0, 15);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${finalTitle} - FusionAI SOC</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .header {
      background: #0f172a;
      color: #ffffff;
      padding: 18px 24px;
      border-radius: 8px;
      border-bottom: 3px solid #06b6d4;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      letter-spacing: -0.5px;
      font-weight: 800;
    }
    .header .subtitle {
      color: #94a3b8;
      font-size: 11px;
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-amber {
      background: rgba(239, 68, 68, 0.15);
      color: #dc2626;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10px;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .meta-item label {
      display: block;
      color: #64748b;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: bold;
    }
    .meta-item value {
      display: block;
      color: #0f172a;
      font-weight: 600;
      font-size: 11px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .kpi-card.cyan { border-left: 3px solid #06b6d4; background: #ecfeff; }
    .kpi-card.emerald { border-left: 3px solid #10b981; background: #f0fdf4; }
    .kpi-card.indigo { border-left: 3px solid #6366f1; background: #eef2ff; }
    .kpi-card.amber { border-left: 3px solid #f59e0b; background: #fffbeb; }
    .kpi-title {
      font-size: 9px;
      font-weight: bold;
      color: #475569;
      text-transform: uppercase;
    }
    .kpi-val {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0 2px 0;
    }
    .kpi-sub {
      font-size: 9px;
      color: #64748b;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 16px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .narrative-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 10.5px;
      line-height: 1.5;
      color: #334155;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9.5px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .sev-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 8.5px;
      text-transform: uppercase;
    }
    .sev-critical { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
    .sev-high { background: #ffedd5; color: #ea580c; border: 1px solid #fdba74; }
    .sev-medium { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
    .sev-low { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 9px;
    }
    .signoff-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 16px;
    }
    .signoff-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 10px;
    }
    .sig-line {
      border-bottom: 1px dashed #64748b;
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>FUSIONAI SECURITY OPERATIONS CENTER</h1>
      <div class="subtitle">
        ${reportKind === 'shift-handover' ? 'OPERATIONAL SHIFT-HANDOVER DOSSIER • FORMAL DISPATCH' : 'EXECUTIVE STAKEHOLDER SECURITY REVIEW • CISO BRIEFING'}
      </div>
    </div>
    <div style="text-align: right;">
      <span class="badge-amber">TLP:AMBER+STRICT • CONFIDENTIAL</span>
      <div style="color: #cbd5e1; font-size: 9px; margin-top: 4px;">
        Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC
      </div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-item">
      <label>Report Title</label>
      <value>${finalTitle}</value>
    </div>
    <div class="meta-item">
      <label>Operational Window</label>
      <value>${timeframeLabel}</value>
    </div>
    <div class="meta-item">
      <label>Tenant Scope</label>
      <value>${clientScopeName}</value>
    </div>
    <div class="meta-item">
      <label>Shift / Roster</label>
      <value>${currentShiftName} → ${nextShiftName}</value>
    </div>
    <div class="meta-item">
      <label>Outgoing Shift Supervisor</label>
      <value>${outgoingLead}</value>
    </div>
    <div class="meta-item">
      <label>Incoming Shift Commander</label>
      <value>${incomingLead}</value>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card cyan">
      <div class="kpi-title">Total 24h Signals</div>
      <div class="kpi-val">${metrics.totalVolume.toLocaleString()}</div>
      <div class="kpi-sub">${metrics.criticalVolume} Critical • ${metrics.highVolume} High</div>
    </div>
    <div class="kpi-card emerald">
      <div class="kpi-title">AI Auto-Triage</div>
      <div class="kpi-val">${metrics.autoTriagedRatio}%</div>
      <div class="kpi-sub">${metrics.autoTriagedCount.toLocaleString()} resolved autonomously</div>
    </div>
    <div class="kpi-card emerald">
      <div class="kpi-title">Labor Cost Avoided</div>
      <div class="kpi-val">$${metrics.cumulativeCostSavingsUSD.toLocaleString()}</div>
      <div class="kpi-sub">${metrics.hoursSaved} analyst hours saved</div>
    </div>
    <div class="kpi-card amber">
      <div class="kpi-title">${reportKind === 'shift-handover' ? 'SLA Breach Watch' : 'MTTD / MTTR'}</div>
      <div class="kpi-val">${reportKind === 'shift-handover' ? '0 Breached / 16 Monitored' : '4.2m / 12.8m'}</div>
      <div class="kpi-sub">${reportKind === 'shift-handover' ? '100% On-time Containment' : '91% Faster than SLA'}</div>
    </div>
  </div>

  <div class="section-title">1. Operational Narrative &amp; Shift Notes</div>
  <div class="narrative-box">
    ${shiftNotes || (reportKind === 'shift-handover'
      ? `Shift Alpha concluded active monitoring with zero SLA breaches across all 3 client pods. Primary focus was active containment of credential dumping (Mimikatz memory dump) in Apex Financial, successfully isolated by CrowdStrike sensor. 16 monitored at-risk cases are assigned to Tier-2 analysts with under 28 minutes remaining on containment timers. Incoming shift must immediately verify Sentinel RTU packet burst containment at 16:30 UTC.`
      : `During the ${timeframeLabel} operational window, the FusionAI Autonomous SOC Platform maintained a 98.4% SLA adherence rate across 3 enterprise client pods. Autonomous AI triage dispositioned ${metrics.autoTriagedRatio}% of inbound security telemetry in under 3.2 minutes average MTTR, generating quantifiable labor cost avoidance of $${metrics.cumulativeCostSavingsUSD.toLocaleString()} USD (${metrics.hoursSaved} analyst hours saved). High-severity threats were contained without perimeter degradation.`)}
  </div>

  ${
    reportKind === 'shift-handover'
      ? `
  <div class="section-title" style="color: #dc2626; border-left: 3px solid #dc2626; padding-left: 6px;">
    2. Escalated Alerts Requiring Incoming Shift Action (${alerts.filter((a) => a.status === 'Escalated' || Boolean(a.escalatedTo)).length})
  </div>
  <table>
    <thead>
      <tr style="background: #991b1b;">
        <th style="width: 14%;">Case ID</th>
        <th style="width: 10%;">Severity</th>
        <th style="width: 44%;">Escalated Incident &amp; Reason</th>
        <th style="width: 16%;">Client Tenant</th>
        <th style="width: 16%;">Escalated To / Directive</th>
      </tr>
    </thead>
    <tbody>
      ${alerts
        .filter((a) => a.status === 'Escalated' || Boolean(a.escalatedTo))
        .map(
          (a) => `
        <tr style="background: #fff5f5;">
          <td style="font-weight: bold; color: #dc2626; font-family: monospace;">${getAlertCaseNumber(a)}</td>
          <td><span class="sev-badge sev-critical">${a.severity}</span></td>
          <td>
            <div style="font-weight: bold; color: #0f172a;">${a.title}</div>
            <div style="font-size: 8.5px; color: #b91c1c; font-family: monospace; margin-top: 2px;">
              <strong>REASON:</strong> ${a.escalationReason || a.description}
            </div>
          </td>
          <td style="color: #334155;">${a.client}</td>
          <td>
            <div style="font-weight: 600; color: #0f172a;">${a.escalatedTo || 'Tier-3 Lead'}</div>
            <div style="font-size: 8px; color: #16a34a; font-family: monospace;">${a.escalationActionRequired || a.incomingActionRequired || 'Maintain emergency bridge'}</div>
          </td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="section-title">
    3. Active 'In Progress' Cases Transferred to Incoming Shift (${alerts.filter((a) => a.status?.startsWith('In Progress') || a.status === 'Acknowledged' || (a.assignedAnalyst && a.status !== 'Closed')).length})
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Case ID</th>
        <th style="width: 10%;">Severity</th>
        <th style="width: 42%;">Incident Title &amp; Platform</th>
        <th style="width: 16%;">Client Pod</th>
        <th style="width: 18%;">Assignee &amp; SLA Status</th>
      </tr>
    </thead>
    <tbody>
      ${alerts
        .filter((a) => a.status?.startsWith('In Progress') || a.status === 'Acknowledged' || (a.assignedAnalyst && a.status !== 'Closed'))
        .slice(0, 15)
        .map(
          (a) => `
        <tr>
          <td style="font-weight: bold; color: #0891b2; font-family: monospace;">${getAlertCaseNumber(a)}</td>
          <td>
            <span class="sev-badge ${
              a.severity === 'Critical'
                ? 'sev-critical'
                : a.severity === 'High'
                ? 'sev-high'
                : 'sev-medium'
            }">${a.severity}</span>
          </td>
          <td>
            <div style="font-weight: 600; color: #0f172a;">${a.title}</div>
            <div style="font-size: 8.5px; color: #64748b; font-family: monospace;">Sensor: ${a.source_platform} • Directive: ${a.incomingActionRequired || a.handoverNotes || 'Continue containment'}</div>
          </td>
          <td style="color: #334155;">${a.client}</td>
          <td style="color: #334155;">
            <div style="font-weight: 500;">${a.assignedAnalyst || a.routedTo || 'FusionAI'}</div>
            <div style="font-size: 8px; color: ${a.slaRisk ? '#dc2626; font-weight: bold;' : '#64748b;'}">${a.slaDeadline || 'On Track'}</div>
          </td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  `
      : `
  <div class="section-title">2. Live Incident Queue &amp; Handover Attention Items</div>
  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Case ID</th>
        <th style="width: 10%;">Severity</th>
        <th style="width: 44%;">Incident Title &amp; Adversary TTP</th>
        <th style="width: 16%;">Client Tenant</th>
        <th style="width: 16%;">Assigned Analyst</th>
      </tr>
    </thead>
    <tbody>
      ${topAlerts
        .map(
          (a) => `
        <tr>
          <td style="font-weight: bold; color: #0891b2; font-family: monospace;">${getAlertCaseNumber(a)}</td>
          <td>
            <span class="sev-badge ${
              a.severity === 'Critical'
                ? 'sev-critical'
                : a.severity === 'High'
                ? 'sev-high'
                : 'sev-medium'
            }">${a.severity}</span>
          </td>
          <td>
            <div style="font-weight: 600; color: #0f172a;">${a.title}</div>
            <div style="font-size: 8.5px; color: #64748b; font-family: monospace;">Sensor: ${a.source_platform} • Status: ${a.status}</div>
          </td>
          <td style="color: #334155;">${a.client}</td>
          <td style="color: #334155; font-weight: 500;">${a.assignedAnalyst || a.routedTo || 'FusionAI Autonomous'}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  `
  }

  ${
    techData && techData.length > 0
      ? `
  <div class="section-title">3. Technology Fleet &amp; Sensor Closure Performance</div>
  <table>
    <thead>
      <tr>
        <th>Technology Platform</th>
        <th>Closed Events</th>
        <th>Closure Rate</th>
        <th>Hours Saved</th>
        <th style="text-align: right;">Cost Avoidance</th>
      </tr>
    </thead>
    <tbody>
      ${techData
        .map(
          (t) => `
        <tr>
          <td style="font-weight: 600;">${t.technologyName}</td>
          <td>${t.closureCount.toLocaleString()}</td>
          <td style="color: #10b981; font-weight: bold;">${t.closureRatePct}%</td>
          <td>${t.hoursSaved} hrs</td>
          <td style="text-align: right; color: #0891b2; font-weight: bold;">$${t.costSavedUSD.toLocaleString()}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  `
      : ''
  }

  ${
    reportKind === 'shift-handover'
      ? `
  <div class="signoff-box">
    <div style="font-weight: bold; font-size: 10px; color: #0f172a; text-transform: uppercase;">
      Formal Shift-Handover Custody &amp; Operational Acceptance
    </div>
    <div style="font-size: 9px; color: #64748b; margin-top: 3px;">
      Incoming shift lead acknowledges custody of open investigations, active containment actions, and SLA timer watches.
    </div>
    <div class="signoff-grid">
      <div>
        <div class="sig-line">
          <span>Outgoing Lead: <strong>${outgoingLead}</strong></span>
          <span style="color: #16a34a; font-weight: bold;">[VERIFIED &amp; TRANSFERRED]</span>
        </div>
      </div>
      <div>
        <div class="sig-line">
          <span>Incoming Lead: <strong>${incomingLead}</strong></span>
          <span style="color: #2563eb; font-weight: bold;">[ACKNOWLEDGED CUSTODY]</span>
        </div>
      </div>
    </div>
  </div>
  `
      : ''
  }

  <div class="footer">
    <div>FusionAI Autonomous Security Operations Platform • Confidential Defense Telemetry</div>
    <div>Shift Operations Directive 2026-S1 • Page 1 of 1</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `.trim();

  // Open in an iframe or dedicated window
  const printWindow = window.open('', '_blank', 'width=950,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // If popup blocked, create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    }
  }
}
