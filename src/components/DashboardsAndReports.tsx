import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users2,
  Building2,
  TrendingDown,
  TrendingUp,
  Download,
  Mail,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldAlert,
  Bot,
  Layers,
  Sparkles,
  Filter,
  Check,
  ExternalLink,
  ChevronRight,
  Sliders,
  RefreshCw,
  Search,
  X,
  Coins,
  DollarSign,
  Wrench,
  Tag,
  Cpu,
  Database,
  Network,
  ShieldCheck,
  Flame,
  Printer,
} from 'lucide-react';
import { Alert, Analyst, Client, SecurityPlatform, SeverityLevel } from '../types/soc';
import { getAlertTicketNumber, getAlertCaseNumber, getCaseCostAndTimeSavings } from '../utils/ticketUtils';
import { getAnalystOperationsDisplayName } from '../utils/analystUtils';
import { DrilldownFilterContext } from './DrilldownResultsModal';
import { PdfReportModal } from './PdfReportModal';
import { AlertVolumeSeverityTrend } from './AlertVolumeSeverityTrend';
import { ExecutiveKpiSummarySection } from './ExecutiveKpiSummarySection';
import { TopTargetedAssetsChart } from './TopTargetedAssetsChart';
import { downloadSocPdfReport } from '../utils/pdfReportGenerator';

interface DashboardsAndReportsProps {
  alerts: Alert[];
  analysts: Analyst[];
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  onSelectAnalystPerspective?: (analystId: string) => void;
  onNavigateToInvestigation?: (incidentId?: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenDrilldown?: (context: DrilldownFilterContext) => void;
  userEmail?: string;
  onShowToast?: (msg: string) => void;
}

type TimeframeMode = '24h' | '7d' | '30d' | '90d';
type SubDashboardTab =
  | 'kpi-overview'
  | 'analysts-throughput'
  | 'tech-closure-report'
  | 'client-scorecards'
  | 'reports-engine';

interface TechClosureData {
  technologyId: string;
  technologyName: string;
  technologyFamily: string;
  icon: string;
  primaryTools: string[];
  ingestedVolume: number;
  closureCount: number;
  closureRatePct: number;
  categories: {
    tpRemediated: number;
    tpEscalated: number;
    fpAdmin: number;
    fpScanner: number;
    benignExpected: number;
    tunedOut: number;
  };
  mttrMins: number;
  aiAutonomousClosedPct: number;
  costSavedUSD: number;
  hoursSaved: number;
}

export const DashboardsAndReports: React.FC<DashboardsAndReportsProps> = ({
  alerts,
  analysts,
  clients,
  selectedClientId,
  onSelectClient,
  onSelectAnalystPerspective,
  onNavigateToInvestigation,
  onNavigateToTab,
  onOpenDrilldown,
  userEmail = 'soc.analyst@spectra.local',
  onShowToast,
}) => {
  // Navigation & Filter state
  const [activeSubTab, setActiveSubTab] = useState<SubDashboardTab>('kpi-overview');
  const [timeframe, setTimeframe] = useState<TimeframeMode>('24h');
  const [reportType, setReportType] = useState<string>('soc-24h-briefing');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Analyst Tool & Title-Wise Deep Dive states
  const [selectedAnalystId, setSelectedAnalystId] = useState<string>('all');
  const [analystTitleSearch, setAnalystTitleSearch] = useState<string>('');
  const [analystToolFilter, setAnalystToolFilter] = useState<string>('all');

  // Technology & Closure Report states
  const [techFamilyFilter, setTechFamilyFilter] = useState<string>('all');
  const [closureCategoryFilter, setClosureCategoryFilter] = useState<string>('all');

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(userEmail);
  const [emailCc, setEmailCc] = useState('soc-leadership@apexfin.com, ciso-desk@fusioncenter.soc');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSentTimestamp, setEmailSentTimestamp] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Timeframe multiplier for dynamic data scaling
  const multiplier = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const timeframeLabel =
    timeframe === '24h'
      ? 'Past 24 Hours'
      : timeframe === '7d'
      ? 'Past 7 Days'
      : timeframe === '30d'
      ? 'Month-to-Date (30 Days)'
      : 'Quarter-to-Date (90 Days)';

  // Client filtering
  const filteredAlerts =
    selectedClientId === 'all'
      ? alerts
      : alerts.filter((a) => a.clientId === selectedClientId);

  const humanAnalysts = analysts.filter((a) => !a.isAiInvestigator);

  // Computed metrics
  const totalVolume = filteredAlerts.length * multiplier;
  const criticalVolume = filteredAlerts.filter((a) => a.severity === 'Critical').length * multiplier;
  const highVolume = filteredAlerts.filter((a) => a.severity === 'High').length * multiplier;
  const autoTriagedCount = filteredAlerts.filter((a) => a.routedTo === 'FusionAI').length * multiplier;
  const autoTriagedRatio = totalVolume > 0 ? Math.round((autoTriagedCount / totalVolume) * 100) : 72;
  const hoursSaved = Math.round((autoTriagedCount * 36) / 60);

  // Calculate Cumulative Cost Savings for all alerts in scope
  const cumulativeCostSavingsUSD = filteredAlerts.reduce((acc, alert) => {
    const s = getCaseCostAndTimeSavings(alert);
    return acc + s.costSaved * multiplier;
  }, 0);

  // Platform telemetry statistics
  const platformStats: {
    name: SecurityPlatform;
    displayName: string;
    eventsAnalyzed: number;
    falsePositiveRate: string;
    status: string;
    color: string;
  }[] = [
    { name: 'CrowdStrike', displayName: 'CrowdStrike Falcon EDR', eventsAnalyzed: 284 * multiplier, falsePositiveRate: '2.1%', status: 'Sensor Live', color: '#ef4444' },
    { name: 'Microsoft Defender', displayName: 'Microsoft Defender XDR', eventsAnalyzed: 236 * multiplier, falsePositiveRate: '3.4%', status: 'Graph API Connected', color: '#0284c7' },
    { name: 'Google SecOps', displayName: 'Google SecOps (Chronicle)', eventsAnalyzed: 198 * multiplier, falsePositiveRate: '2.8%', status: 'Ingesting Telemetry', color: '#10b981' },
    { name: 'Splunk', displayName: 'Splunk Enterprise SIEM', eventsAnalyzed: 342 * multiplier, falsePositiveRate: '4.6%', status: 'HEC Ingestion Active', color: '#f97316' },
    { name: 'Zscaler', displayName: 'Zscaler Zero Trust NSS', eventsAnalyzed: 142 * multiplier, falsePositiveRate: '1.7%', status: 'Cloud Stream Live', color: '#06b6d4' },
    { name: 'Exabeam', displayName: 'Exabeam Advanced UEBA', eventsAnalyzed: 114 * multiplier, falsePositiveRate: '5.1%', status: 'Behavior Models OK', color: '#8b5cf6' },
    { name: 'ServiceNow', displayName: 'ServiceNow SecOps ITSM', eventsAnalyzed: 68 * multiplier, falsePositiveRate: '0.0%', status: 'Bi-Directional Sync', color: '#6366f1' },
    { name: 'Swimlane', displayName: 'Swimlane Turbine SOAR', eventsAnalyzed: 56 * multiplier, falsePositiveRate: '0.0%', status: 'Playbooks Online', color: '#14b8a6' },
  ];

  // =========================================================================
  // Technology & Closure Report Data
  // =========================================================================
  const technologyClosureData: TechClosureData[] = [
    {
      technologyId: 'tech-edr',
      technologyName: 'Endpoint Detection & Response (EDR / XDR)',
      technologyFamily: 'Endpoint Security',
      icon: 'Laptop',
      primaryTools: ['CrowdStrike Falcon', 'Microsoft Defender for Endpoint'],
      ingestedVolume: 420 * multiplier,
      closureCount: 406 * multiplier,
      closureRatePct: 96.6,
      categories: {
        tpRemediated: 84 * multiplier,
        tpEscalated: 18 * multiplier,
        fpAdmin: 96 * multiplier,
        fpScanner: 68 * multiplier,
        benignExpected: 112 * multiplier,
        tunedOut: 28 * multiplier,
      },
      mttrMins: 9.4,
      aiAutonomousClosedPct: 76,
      costSavedUSD: Math.round(406 * multiplier * 58.2),
      hoursSaved: Math.round((406 * multiplier * 41) / 60),
    },
    {
      technologyId: 'tech-siem',
      technologyName: 'SIEM & Security Data Lake Analytics',
      technologyFamily: 'Security Analytics',
      icon: 'Database',
      primaryTools: ['Splunk Enterprise Security', 'Google SecOps (Chronicle)'],
      ingestedVolume: 512 * multiplier,
      closureCount: 494 * multiplier,
      closureRatePct: 96.5,
      categories: {
        tpRemediated: 92 * multiplier,
        tpEscalated: 24 * multiplier,
        fpAdmin: 142 * multiplier,
        fpScanner: 98 * multiplier,
        benignExpected: 104 * multiplier,
        tunedOut: 34 * multiplier,
      },
      mttrMins: 11.2,
      aiAutonomousClosedPct: 71,
      costSavedUSD: Math.round(494 * multiplier * 56.4),
      hoursSaved: Math.round((494 * multiplier * 39) / 60),
    },
    {
      technologyId: 'tech-iam',
      technologyName: 'Identity & Cloud Security (IAM / CASB)',
      technologyFamily: 'Identity & Cloud',
      icon: 'Shield',
      primaryTools: ['Microsoft Entra ID (Azure AD)', 'Okta Workforce Identity'],
      ingestedVolume: 286 * multiplier,
      closureCount: 278 * multiplier,
      closureRatePct: 97.2,
      categories: {
        tpRemediated: 46 * multiplier,
        tpEscalated: 12 * multiplier,
        fpAdmin: 82 * multiplier,
        fpScanner: 32 * multiplier,
        benignExpected: 88 * multiplier,
        tunedOut: 18 * multiplier,
      },
      mttrMins: 7.8,
      aiAutonomousClosedPct: 82,
      costSavedUSD: Math.round(278 * multiplier * 59.8),
      hoursSaved: Math.round((278 * multiplier * 42) / 60),
    },
    {
      technologyId: 'tech-sase',
      technologyName: 'Network Security & Zero Trust SASE',
      technologyFamily: 'Network Security',
      icon: 'Network',
      primaryTools: ['Zscaler Zero Trust NSS', 'Palo Alto Networks NGFW'],
      ingestedVolume: 324 * multiplier,
      closureCount: 318 * multiplier,
      closureRatePct: 98.1,
      categories: {
        tpRemediated: 38 * multiplier,
        tpEscalated: 8 * multiplier,
        fpAdmin: 114 * multiplier,
        fpScanner: 86 * multiplier,
        benignExpected: 52 * multiplier,
        tunedOut: 20 * multiplier,
      },
      mttrMins: 6.2,
      aiAutonomousClosedPct: 85,
      costSavedUSD: Math.round(318 * multiplier * 52.1),
      hoursSaved: Math.round((318 * multiplier * 36) / 60),
    },
    {
      technologyId: 'tech-soar',
      technologyName: 'SOAR, Workflow & ITSM Integration',
      technologyFamily: 'Automation & ITSM',
      icon: 'Wrench',
      primaryTools: ['Swimlane Turbine SOAR', 'ServiceNow SecOps'],
      ingestedVolume: 124 * multiplier,
      closureCount: 124 * multiplier,
      closureRatePct: 100.0,
      categories: {
        tpRemediated: 34 * multiplier,
        tpEscalated: 6 * multiplier,
        fpAdmin: 28 * multiplier,
        fpScanner: 14 * multiplier,
        benignExpected: 36 * multiplier,
        tunedOut: 6 * multiplier,
      },
      mttrMins: 4.1,
      aiAutonomousClosedPct: 92,
      costSavedUSD: Math.round(124 * multiplier * 64.5),
      hoursSaved: Math.round((124 * multiplier * 45) / 60),
    },
  ];

  const totalTechClosures = technologyClosureData.reduce((acc, t) => acc + t.closureCount, 0);
  const totalTechCostSaved = technologyClosureData.reduce((acc, t) => acc + t.costSavedUSD, 0);
  const totalTechHoursSaved = technologyClosureData.reduce((acc, t) => acc + t.hoursSaved, 0);

  // =========================================================================
  // Analyst Workload: Tool-Wise & Title-Wise Dataset
  // =========================================================================
  const sampleAlertTitles = [
    {
      title: 'Suspicious PowerShell Encoded Payload with Cobalt Strike Signatures',
      platform: 'CrowdStrike' as SecurityPlatform,
      category: 'True Positive - Contained',
      severity: 'Critical' as SeverityLevel,
      ticketNumber: 'CASE-1088',
      analystId: 'a2',
      analystName: "David Sterling",
      casesWorked: 14 * multiplier,
      avgResolutionMin: 22,
    },
    {
      title: 'Beaconing to Known Command and Control (C2) IP 185.220.101.45',
      platform: 'Zscaler' as SecurityPlatform,
      category: 'True Positive - Contained',
      severity: 'Critical' as SeverityLevel,
      ticketNumber: 'CASE-1089',
      analystId: 'a2',
      analystName: "David Sterling",
      casesWorked: 11 * multiplier,
      avgResolutionMin: 18,
    },
    {
      title: 'Exchange Online Inbox Rule Created (Forwarding to External)',
      platform: 'Splunk' as SecurityPlatform,
      category: 'True Positive - Contained',
      severity: 'Medium' as SeverityLevel,
      ticketNumber: 'CASE-1094',
      analystId: 'a2',
      analystName: "David Sterling",
      casesWorked: 18 * multiplier,
      avgResolutionMin: 14,
    },
    {
      title: 'Privilege Escalation via SeImpersonatePrivilege Token Manipulation',
      platform: 'Microsoft Defender' as SecurityPlatform,
      category: 'True Positive - Contained',
      severity: 'Critical' as SeverityLevel,
      ticketNumber: 'CASE-1081',
      analystId: 'a1',
      analystName: "Maya Lin",
      casesWorked: 16 * multiplier,
      avgResolutionMin: 26,
    },
    {
      title: 'Potential Kerberoasting Activity with RC4-HMAC Ticket Encryption',
      platform: 'Splunk' as SecurityPlatform,
      category: 'True Positive - Contained',
      severity: 'High' as SeverityLevel,
      ticketNumber: 'CASE-1083',
      analystId: 'a1',
      analystName: "Maya Lin",
      casesWorked: 19 * multiplier,
      avgResolutionMin: 21,
    },
    {
      title: 'Anomalous Azure AD Login from Tor Exit Node 194.26.29.11',
      platform: 'Microsoft Defender' as SecurityPlatform,
      category: 'Benign Positive - Expected Workflow',
      severity: 'High' as SeverityLevel,
      ticketNumber: 'CASE-1093',
      analystId: 'a3',
      analystName: "Elena Rostova",
      casesWorked: 24 * multiplier,
      avgResolutionMin: 12,
    },
    {
      title: 'Port Scan on DMZ Web Subnet with TCP SYN Sweeps',
      platform: 'Zscaler' as SecurityPlatform,
      category: 'False Positive - Scanner Drill',
      severity: 'Low' as SeverityLevel,
      ticketNumber: 'CASE-1095',
      analystId: 'a3',
      analystName: "Elena Rostova",
      casesWorked: 32 * multiplier,
      avgResolutionMin: 8,
    },
    {
      title: 'SCADA PLC Firmware Integrity Check Mismatch',
      platform: 'Google SecOps' as SecurityPlatform,
      category: 'True Positive - Escalated to Client',
      severity: 'Critical' as SeverityLevel,
      ticketNumber: 'CASE-1080',
      analystId: 'a9',
      analystName: "Alexander Wright",
      casesWorked: 8 * multiplier,
      avgResolutionMin: 34,
    },
    {
      title: 'Multiple Failed SSH Logins Followed by Root Login',
      platform: 'Google SecOps' as SecurityPlatform,
      category: 'True Positive - Contained',
      severity: 'High' as SeverityLevel,
      ticketNumber: 'CASE-1079',
      analystId: 'a8',
      analystName: "James O'Connor",
      casesWorked: 21 * multiplier,
      avgResolutionMin: 16,
    },
    {
      title: 'Suspicious DLL Side-Loading via legitimate executable',
      platform: 'CrowdStrike' as SecurityPlatform,
      category: 'True Positive - Contained',
      severity: 'High' as SeverityLevel,
      ticketNumber: 'CASE-1078',
      analystId: 'a8',
      analystName: "James O'Connor",
      casesWorked: 15 * multiplier,
      avgResolutionMin: 19,
    },
  ];

  // Filtered title-wise entries
  const filteredTitleBreakdown = sampleAlertTitles.filter((item) => {
    if (selectedAnalystId !== 'all' && item.analystId !== selectedAnalystId) return false;
    if (analystToolFilter !== 'all' && item.platform !== analystToolFilter) return false;
    if (
      analystTitleSearch &&
      !item.title.toLowerCase().includes(analystTitleSearch.toLowerCase()) &&
      !item.ticketNumber.toLowerCase().includes(analystTitleSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      'Ticket Number',
      'Case Number',
      'Title',
      'Severity',
      'Client',
      'Source Platform',
      'Status',
      'Time Saved by AI',
      'Cost Saved USD',
      'Routed To',
      'Timestamp',
    ];
    const rows = filteredAlerts.map((a) => {
      const s = getCaseCostAndTimeSavings(a);
      return [
        getAlertTicketNumber(a),
        getAlertCaseNumber(a),
        `"${a.title.replace(/"/g, '""')}"`,
        a.severity,
        `"${a.client}"`,
        a.source_platform,
        a.status,
        s.timeSavedFormatted,
        `$${s.costSaved.toFixed(2)}`,
        a.routedTo,
        a.timestamp,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FusionAI_SOC_Report_${timeframe}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) onShowToast(`Exported CSV report with ${filteredAlerts.length} alert records with cost savings metrics.`);
  };

  const handleExportTechClosureCSV = () => {
    const headers = [
      'Technology Family',
      'Technology Name',
      'Primary Tools',
      'Ingested Volume',
      'Total Closures',
      'Closure Rate (%)',
      'TP Remediated',
      'TP Escalated',
      'FP Admin Activity',
      'FP Security Scanner',
      'Benign Expected',
      'Tuned Out / Suppressed',
      'MTTR (Min)',
      'AI Closed (%)',
      'Cost Saved (USD)',
      'Hours Saved',
    ];
    const rows = technologyClosureData.map((t) => [
      `"${t.technologyFamily}"`,
      `"${t.technologyName}"`,
      `"${t.primaryTools.join('; ')}"`,
      t.ingestedVolume,
      t.closureCount,
      `${t.closureRatePct}%`,
      t.categories.tpRemediated,
      t.categories.tpEscalated,
      t.categories.fpAdmin,
      t.categories.fpScanner,
      t.categories.benignExpected,
      t.categories.tunedOut,
      t.mttrMins,
      `${t.aiAutonomousClosedPct}%`,
      `$${t.costSavedUSD.toLocaleString()}`,
      t.hoursSaved,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FusionAI_Technology_Closure_Report_${timeframe}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) onShowToast('Exported Technology & Closure Analytics Report to CSV.');
  };

  const handleExportJSON = () => {
    const reportData = {
      reportType,
      timeframe,
      timeframeLabel,
      generatedAt: new Date().toISOString(),
      generatedBy: 'FusionAI Autonomous SOC Platform',
      metrics: {
        totalVolume,
        criticalVolume,
        highVolume,
        autoTriagedCount,
        autoTriagedRatio,
        hoursSaved,
        cumulativeCostSavingsUSD: `$${cumulativeCostSavingsUSD.toFixed(2)}`,
      },
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        activeAlerts: c.activeAlerts * multiplier,
        openIncidents: c.openIncidents,
        slaBreachRisk: c.slaBreachRisk,
      })),
      platforms: platformStats,
      technologyAndClosures: technologyClosureData,
      alerts: filteredAlerts.map((a) => {
        const s = getCaseCostAndTimeSavings(a);
        return {
          ticketNumber: getAlertTicketNumber(a),
          caseNumber: getAlertCaseNumber(a),
          title: a.title,
          severity: a.severity,
          client: a.client,
          platform: a.source_platform,
          status: a.status,
          timeSavedMins: s.timeSavedMins,
          timeSavedFormatted: s.timeSavedFormatted,
          costSavedUSD: s.costSaved,
          costSavedFormatted: s.costSavedFormatted,
        };
      }),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `FusionAI_SOC_Report_${timeframe}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) onShowToast(`Exported JSON report payload with per-case ROI.`);
  };

  const handleCopyReportText = () => {
    const text = `
FUSIONAI SOC OPERATIONS & EXECUTIVE REPORT
Generated: ${new Date().toUTCString()}
Timeframe: ${timeframeLabel}
Client Scope: ${selectedClientId === 'all' ? 'All 3 Enterprise Accounts' : clients.find((c) => c.id === selectedClientId)?.name}

==================================================
1. OPERATIONAL HEADLINE METRICS:
==================================================
- Total Ingestion Volume: ${totalVolume.toLocaleString()} alerts
- Critical Severity Incidents: ${criticalVolume} (100% Contained)
- High Severity Incidents: ${highVolume} (Dispatched to Shift 1)
- Autonomous AI Triage Rate: ${autoTriagedRatio}% (${autoTriagedCount.toLocaleString()} alerts)
- Total Labor Cost Avoided: $${cumulativeCostSavingsUSD.toLocaleString()} USD
- Total Investigation Hours Saved: ${hoursSaved} analyst hours
- MTTD (Mean Time to Detect): 4.2 minutes (91% faster than 48m baseline)
- MTTR (Mean Time to Resolve): 12.8 minutes (86% faster than 92m baseline)
- SLA Compliance Rate: 97.4% (0 critical SLA breaches)

==================================================
2. ALERT TECHNOLOGY & CLOSURE TOTALS:
==================================================
${technologyClosureData
  .map(
    (t) =>
      `• ${t.technologyName}: ${t.closureCount.toLocaleString()} closed (${t.closureRatePct}%) | Cost Saved: $${t.costSavedUSD.toLocaleString()}`
  )
  .join('\n')}

==================================================
3. TOP CASES WITH AI COST SAVINGS:
==================================================
${filteredAlerts
  .slice(0, 5)
  .map((a) => {
    const s = getCaseCostAndTimeSavings(a);
    return `• [${getAlertTicketNumber(a)}] ${a.title} (${a.severity}) | Saved: ${s.costSavedFormatted} (${s.timeSavedFormatted})`;
  })
  .join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
    if (onShowToast) onShowToast('Full executive summary report copied to clipboard.');
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BANNER: DASHBOARDS & REPORTS                                */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        {/* Ambient lighting */}
        <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-bl from-cyan-500/10 via-indigo-500/5 to-transparent blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-cyan-950/80 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50 shrink-0">
              <LayoutDashboard className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Dashboards &amp; Reports
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  REAL-TIME TELEMETRY
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-emerald-400" />
                  <span>${cumulativeCostSavingsUSD.toLocaleString()} TOTAL AI SAVINGS</span>
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
                Unified SOC operational performance, analyst throughput based on tools &amp; titles, technology closure analytics, and per-case AI cost savings.
              </p>
              <div className="text-[11px] font-mono text-slate-400 mt-2 flex items-center gap-2 flex-wrap">
                <span>Scope: <strong className="text-white">{selectedClientId === 'all' ? 'All 3 Clients' : clients.find((c) => c.id === selectedClientId)?.name}</strong></span>
                <span>•</span>
                <span>Interval: <strong className="text-cyan-300">{timeframeLabel}</strong></span>
                <span>•</span>
                <span className="text-emerald-400">8 Integrated Security Platforms Live</span>
                {emailSentTimestamp && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-300">Last Dispatched: {emailSentTimestamp}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Timeframe Selector & Actions */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {/* Timeframe Segmented Control */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold shadow-inner">
              {(['24h', '7d', '30d', '90d'] as TimeframeMode[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    timeframe === tf
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-500 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/50 cursor-pointer border border-cyan-400/30"
                title="Download PDF report for executive and stakeholder reviews"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={handleCopyReportText}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                title="Copy formatted executive report to clipboard"
              >
                {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copiedReport ? 'Copied' : 'Copy Summary'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEmailModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                title="Schedule & dispatch report via email"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Email Briefing</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('kpi-overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'kpi-overview'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Operational &amp; KPI Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('analysts-throughput')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'analysts-throughput'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users2 className="w-4 h-4 text-indigo-400" />
            <span>Analyst Workload (Tools &amp; Title Wise)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('tech-closure-report')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'tech-closure-report'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Alert Technology &amp; Closure Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('client-scorecards')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'client-scorecards'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Client Security Scorecards</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reports-engine')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'reports-engine'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Reports Generator &amp; Archive</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUMMARY KPI SECTION: MTTR, AUTOMATION COVERAGE %, ANALYST UTILIZATION     */}
      {/* 30-Day Comparative Trends with Recharts                                   */}
      {/* ========================================================================= */}
      <ExecutiveKpiSummarySection
        selectedClientId={selectedClientId}
        clients={clients}
        onShowToast={onShowToast}
      />

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: OPERATIONAL & KPI DASHBOARD                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'kpi-overview' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Headline Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Card 1: Ingested Alerts */}
            <div
              onClick={() => onOpenDrilldown && onOpenDrilldown({ type: 'all', value: 'all', label: 'All Ingested Signals' })}
              className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 transition-all cursor-pointer shadow-md group"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Ingested Telemetry</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1 group-hover:text-cyan-300">
                {totalVolume.toLocaleString()}
              </div>
              <div className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1 font-mono">
                <TrendingUp className="w-3 h-3" />
                <span>+12.4% vs prev week</span>
              </div>
            </div>

            {/* Card 2: AI Cost Savings */}
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 transition-all shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>AI Cost Saved</span>
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                ${cumulativeCostSavingsUSD.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-400/90 mt-1 font-mono">
                <span>$85/hr SOC labor avoided</span>
              </div>
            </div>

            {/* Card 3: Autonomous Triage Rate */}
            <div
              onClick={() => onOpenDrilldown && onOpenDrilldown({ type: 'status', value: 'unclaimed', label: 'FusionAI Autonomous Queue' })}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all cursor-pointer shadow-md group"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>AI Auto-Triage</span>
                <Bot className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold font-mono text-indigo-400 mt-1 group-hover:text-indigo-300">
                {autoTriagedRatio}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                <span>{autoTriagedCount.toLocaleString()} alerts dispositioned</span>
              </div>
            </div>

            {/* Card 4: Hours Saved */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Hours Saved</span>
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                {hoursSaved} hrs
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                <span>~36m per triage saved</span>
              </div>
            </div>

            {/* Card 5: Critical Escalations */}
            <div
              onClick={() => onOpenDrilldown && onOpenDrilldown({ type: 'severity', value: 'critical', label: 'Critical Severity Escalations' })}
              className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 transition-all cursor-pointer shadow-md group"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Critical Contained</span>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1 group-hover:text-rose-300">
                {criticalVolume}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 font-mono">
                <span>100% Contained (0 Breaches)</span>
              </div>
            </div>

            {/* Card 6: High Severity WIP */}
            <div
              onClick={() => onOpenDrilldown && onOpenDrilldown({ type: 'severity', value: 'high', label: 'High Severity Alerts' })}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all cursor-pointer shadow-md group"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>High Severity</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1 group-hover:text-amber-300">
                {highVolume}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                <span>Dispatched to Shift 1</span>
              </div>
            </div>
          </div>

          {/* 30-Day Alert Volume & Severity Distribution Trend (Recharts) */}
          <AlertVolumeSeverityTrend
            alerts={filteredAlerts}
            selectedClientId={selectedClientId}
            clients={clients}
            onOpenDrilldown={onOpenDrilldown}
            onShowToast={onShowToast}
          />

          {/* Top 5 Most Targeted Assets (Last 7 Days) Priority Hardening (Recharts) */}
          <TopTargetedAssetsChart
            selectedClientId={selectedClientId}
            clients={clients}
            alerts={filteredAlerts}
            onOpenDrilldown={onOpenDrilldown}
            onShowToast={onShowToast}
          />

          {/* Integrated Security Platform Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Integrated Security Platforms Telemetry Health</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Normalized Common Security Event Model (CEM) ingestion across 8 cloud, endpoint, and SIEM security sensors.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/80">
                8 OF 8 SENSORS ONLINE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {platformStats.map((platform) => (
                <div
                  key={platform.name}
                  onClick={() =>
                    onOpenDrilldown &&
                    onOpenDrilldown({
                      type: 'platform',
                      value: platform.name,
                      label: `${platform.displayName} Ingested Telemetry`,
                    })
                  }
                  className="bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                      {platform.displayName}
                    </span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: platform.color }} />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between font-mono">
                    <span className="text-xs text-slate-400">Ingested:</span>
                    <span className="text-base font-bold text-white">{platform.eventsAnalyzed.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between font-mono text-[10px]">
                    <span className="text-slate-500">False Positive:</span>
                    <span className="text-emerald-400 font-semibold">{platform.falsePositiveRate}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{platform.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: ANALYST THROUGHPUT (TOOLS & TITLE-WISE BREAKDOWN)             */}
      {/* ========================================================================= */}
      {activeSubTab === 'analysts-throughput' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Section A: 18 Human Responders Master Workload Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users2 className="w-4 h-4 text-cyan-400" />
                  <span>Shift 1 Active Analysts: Workload &amp; Throughput Matrix</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  18 human incident responders on duty. Click on any analyst to inspect their specific tool distribution and worked alert titles.
                </p>
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('operations')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <span>Open Operations Rebalancer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-slate-950/40">
                    <th className="py-2.5 px-3">Analyst</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Client Coverage</th>
                    <th className="py-2.5 px-3 text-right">Active WIP</th>
                    <th className="py-2.5 px-3 text-right">Resolved ({timeframe})</th>
                    <th className="py-2.5 px-3 text-right">Avg Response</th>
                    <th className="py-2.5 px-3 text-right">SLA Risk</th>
                    <th className="py-2.5 px-3 text-center">Tool &amp; Title Deep Dive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {humanAnalysts.map((analyst) => (
                    <tr
                      key={analyst.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        selectedAnalystId === analyst.id ? 'bg-cyan-950/30 border-l-2 border-cyan-400' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedAnalystId(analyst.id)}
                          className="flex items-center gap-2 text-left hover:text-cyan-300 cursor-pointer font-sans"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-300 shrink-0">
                            {analyst.name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-cyan-300">
                              {getAnalystOperationsDisplayName(analyst)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{analyst.email}</div>
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {analyst.tier}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-sans">
                        {analyst.client}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-cyan-400 tabular-nums">
                        {analyst.wip}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-200 tabular-nums">
                        {analyst.totalAlerts * multiplier}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                        {analyst.avgResolutionTimeMin}m
                      </td>
                      <td className="py-3 px-3 text-right">
                        {analyst.slaRisk > 0 ? (
                          <span className="text-rose-400 font-bold tabular-nums">{analyst.slaRisk} at risk</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">Clean (0)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedAnalystId(analyst.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedAnalystId === analyst.id
                              ? 'bg-cyan-600 text-white shadow-md'
                              : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                          }`}
                        >
                          View Breakdown
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Analyst-Wise Alerts Worked based on Tools & Title-Wise */}
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Analyst Alert Status Breakdown: By Security Tools &amp; Alert Titles
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed inspection of alerts worked by each incident responder, segmented by technology tool used and exact detection rule titles.
                </p>
              </div>

              {/* Analyst Filter Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Focus Analyst:</span>
                <select
                  value={selectedAnalystId}
                  onChange={(e) => setSelectedAnalystId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-cyan-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">All Shift 1 Responders (9 Analysts)</option>
                  {humanAnalysts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.tier} • {a.client})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PART 1: Analyst Tools Breakdown Grid */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>1. Telemetry &amp; Security Tools Worked Status</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    toolName: 'CrowdStrike Falcon',
                    category: 'EDR / Endpoint Security',
                    workedCount: (selectedAnalystId === 'all' ? 142 : 38) * multiplier,
                    closedCount: (selectedAnalystId === 'all' ? 136 : 36) * multiplier,
                    avgResolution: '16.4 min',
                    fpRatio: '2.1%',
                    color: '#ef4444',
                  },
                  {
                    toolName: 'Splunk Enterprise Security',
                    category: 'SIEM / Correlation Lake',
                    workedCount: (selectedAnalystId === 'all' ? 186 : 44) * multiplier,
                    closedCount: (selectedAnalystId === 'all' ? 179 : 42) * multiplier,
                    avgResolution: '18.2 min',
                    fpRatio: '4.6%',
                    color: '#f97316',
                  },
                  {
                    toolName: 'Microsoft Defender XDR',
                    category: 'Endpoint & Identity XDR',
                    workedCount: (selectedAnalystId === 'all' ? 128 : 28) * multiplier,
                    closedCount: (selectedAnalystId === 'all' ? 122 : 27) * multiplier,
                    avgResolution: '14.8 min',
                    fpRatio: '3.4%',
                    color: '#0284c7',
                  },
                  {
                    toolName: 'Google SecOps (Chronicle)',
                    category: 'Cloud Telemetry & YARA-L',
                    workedCount: (selectedAnalystId === 'all' ? 112 : 22) * multiplier,
                    closedCount: (selectedAnalystId === 'all' ? 108 : 21) * multiplier,
                    avgResolution: '12.6 min',
                    fpRatio: '2.8%',
                    color: '#10b981',
                  },
                ].map((tool) => (
                  <div key={tool.toolName} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{tool.toolName}</span>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tool.color }} />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{tool.category}</div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Worked</span>
                        <span className="font-bold text-cyan-300">{tool.workedCount} cases</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Closed</span>
                        <span className="font-bold text-emerald-400">{tool.closedCount} cases</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
                      <span>Avg MTTR: {tool.avgResolution}</span>
                      <span className="text-slate-500">FP: {tool.fpRatio}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PART 2: Title-Wise Alert Breakdown Table with Cost & Time Saved */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>2. Title-Wise Alert Breakdown (With Case Cost &amp; Time Savings)</span>
                </h4>

                {/* Search & Tool Filter */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="relative min-w-[200px]">
                    <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter alert title or ticket..."
                      value={analystTitleSearch}
                      onChange={(e) => setAnalystTitleSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <select
                    value={analystToolFilter}
                    onChange={(e) => setAnalystToolFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="all">All Tools</option>
                    <option value="CrowdStrike">CrowdStrike Falcon</option>
                    <option value="Splunk">Splunk ES</option>
                    <option value="Microsoft Defender">Microsoft Defender</option>
                    <option value="Google SecOps">Google SecOps</option>
                    <option value="Zscaler">Zscaler</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Ticket / Rule</th>
                      <th className="py-2.5 px-3">Alert Title</th>
                      <th className="py-2.5 px-3">Tool / Platform</th>
                      <th className="py-2.5 px-3">Investigator</th>
                      <th className="py-2.5 px-3">Closure Category</th>
                      <th className="py-2.5 px-3 text-right">Cases Worked</th>
                      <th className="py-2.5 px-3 text-right">Time Saved</th>
                      <th className="py-2.5 px-3 text-right">Cost Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredTitleBreakdown.map((item, idx) => {
                      const mockAlertForSavings = {
                        id: item.ticketNumber,
                        severity: item.severity,
                        routedTo: 'FusionAI',
                      };
                      const savings = getCaseCostAndTimeSavings(mockAlertForSavings);

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm">
                              {item.ticketNumber}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans font-medium text-slate-200 max-w-xs">
                            <div className="truncate font-semibold text-white">{item.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Severity: <strong className={item.severity === 'Critical' ? 'text-rose-400' : 'text-amber-400'}>{item.severity}</strong>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                              {item.platform}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-sans text-slate-300">
                            {item.analystName}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                item.category.includes('True Positive')
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-white tabular-nums">
                            {item.casesWorked}
                          </td>
                          <td className="py-3 px-3 text-right text-cyan-300 tabular-nums font-bold">
                            {savings.timeSavedFormatted}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-bold tabular-nums">
                            {savings.costSavedFormatted}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: ALERT TECHNOLOGY & CLOSURE ANALYTICS REPORT                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'tech-closure-report' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Header Summary Ribbon */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Alert Technology &amp; Closure Analytics Report
                  </h2>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                    AUDITED CLOSURES
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Comprehensive breakdown of closed alerts categorized by underlying security technology family, resolution category (True Positive, False Positive, Benign, Suppressed), and quantified AI financial savings.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportTechClosureCSV}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export Closure Report (CSV)</span>
                </button>
              </div>
            </div>

            {/* 4 Summary Stat Boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-slate-800 font-mono">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-sans">Total Technology Closures</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {totalTechClosures.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">97.1% Overall Closure Rate</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-emerald-400 font-sans font-semibold">Total Cost Avoided by AI</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  ${totalTechCostSaved.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">Based on $85.00/hr SOC Labor Rate</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-cyan-300 font-sans font-semibold">Analyst Hours Saved</div>
                <div className="text-2xl font-bold text-cyan-300 mt-1">
                  {totalTechHoursSaved.toLocaleString()} hrs
                </div>
                <div className="text-[10px] text-cyan-400/80 mt-0.5">Triage fatigue mitigated</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-indigo-300 font-sans font-semibold">Autonomous vs Analyst</div>
                <div className="text-2xl font-bold text-indigo-300 mt-1">
                  78% AI • 22% Human
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Optimal tier balance</div>
              </div>
            </div>
          </div>

          {/* Technology & Closure Category Detailed Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Technology Family &amp; Closure Category Distribution</span>
              </h3>

              {/* Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono">Filter Category:</span>
                <select
                  value={closureCategoryFilter}
                  onChange={(e) => setClosureCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="all">All Closure Dispositions</option>
                  <option value="tp">True Positives Only (Remediated / Escalated)</option>
                  <option value="fp">False Positives (Admin / Scanner)</option>
                  <option value="benign">Benign Expected</option>
                  <option value="tuned">Tuned / Duplicate Suppressed</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono text-slate-400 uppercase">
                    <th className="py-3 px-3">Alert Technology</th>
                    <th className="py-3 px-3">Primary Tools</th>
                    <th className="py-3 px-3 text-right">Ingested</th>
                    <th className="py-3 px-3 text-right">Closure Count</th>
                    <th className="py-3 px-3 text-center">Closure Categories Breakdown</th>
                    <th className="py-3 px-3 text-right">MTTR</th>
                    <th className="py-3 px-3 text-right">Cost Saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {technologyClosureData.map((tech) => (
                    <tr key={tech.technologyId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-sans font-bold text-white text-xs">{tech.technologyName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tech.technologyFamily}</div>
                      </td>

                      <td className="py-3.5 px-3 font-sans text-slate-300 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {tech.primaryTools.map((tool) => (
                            <span
                              key={tool}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right text-slate-300 tabular-nums">
                        {tech.ingestedVolume.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-emerald-400 tabular-nums">
                        {tech.closureCount.toLocaleString()}
                        <div className="text-[10px] text-slate-500 font-normal">({tech.closureRatePct}%)</div>
                      </td>

                      {/* Closure Categories Breakdown Badges */}
                      <td className="py-3.5 px-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-center" title="True Positive - Remediated">
                            TP: {tech.categories.tpRemediated}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-center" title="True Positive - Client Escalated">
                            Escalated: {tech.categories.tpEscalated}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-center" title="False Positive - Admin Activity">
                            FP Admin: {tech.categories.fpAdmin}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-center" title="False Positive - Scanner Drill">
                            Scanner: {tech.categories.fpScanner}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-center" title="Benign Expected Behavior">
                            Benign: {tech.categories.benignExpected}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-center" title="Tuned Out & Suppressed">
                            Tuned: {tech.categories.tunedOut}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right text-slate-200 tabular-nums font-bold">
                        {tech.mttrMins} min
                      </td>

                      <td className="py-3.5 px-3 text-right text-emerald-400 font-bold tabular-nums">
                        ${tech.costSavedUSD.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: CLIENT SECURITY SCORECARDS                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'client-scorecards' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              const clientAlerts = alerts.filter((a) => a.clientId === client.id);
              const critAlerts = clientAlerts.filter((a) => a.severity === 'Critical').length * multiplier;

              return (
                <div
                  key={client.id}
                  className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: client.logoColor }} />
                        <h3 className="font-bold text-white text-base">{client.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{client.industry} • Code: {client.code}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        client.criticality === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}
                    >
                      {client.criticality}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 font-mono text-center">
                    <div>
                      <div className="text-[10px] text-slate-400">Total Alerts</div>
                      <div className="text-base font-bold text-white tabular-nums">
                        {client.activeAlerts * multiplier}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Incidents</div>
                      <div className="text-base font-bold text-amber-400 tabular-nums">
                        {client.openIncidents}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">SLA Risk</div>
                      <div className={`text-base font-bold tabular-nums ${client.slaBreachRisk > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {client.slaBreachRisk}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                    <span className="text-slate-400 font-mono text-[11px]">
                      {client.assignedAnalystsCount} analysts assigned
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectClient(client.id);
                        if (onOpenDrilldown) {
                          onOpenDrilldown({
                            type: 'client',
                            value: client.id,
                            label: `${client.name} Incidents & Alerts`,
                          });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold border border-cyan-800 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Drilldown</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 5: REPORTS GENERATOR & ARCHIVE                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'reports-engine' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Automated SOC Report Engine &amp; Executive Distribution</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a template, customize report parameters, and export to CSV/JSON with detailed per-case cost and time savings.
                </p>
              </div>

              {/* Export Formats */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-500 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-cyan-400/30"
                  title="Download PDF report for executive and stakeholder reviews"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Export JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Email Briefing</span>
                </button>
              </div>
            </div>

            {/* Template Selection Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
              {[
                { id: 'soc-24h-briefing', title: '24-Hour SOC Operations Brief', desc: 'Tactical incident count, containment verification, and MTTD/MTTR.' },
                { id: 'weekly-threat-digest', title: 'Weekly Incident & Threat Digest', desc: '7-day trend analysis, adversarial techniques, and human hours saved.' },
                { id: 'monthly-executive-ciso', title: 'Monthly Executive Security Report', desc: 'Multi-client compliance, SLA audit, platform ROI, and rule tuning.' },
                { id: 'platform-ingestion-audit', title: 'Platform Ingestion & Sensor Audit', desc: 'CrowdStrike, Defender, Splunk volume, latency, and false positive metrics.' },
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setReportType(tpl.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    reportType === tpl.id
                      ? 'bg-cyan-950/60 border-cyan-500/60 text-white shadow-md'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="font-bold text-xs text-white truncate">{tpl.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{tpl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Live Compiled Report Document Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  DOCUMENT PREVIEW: {reportType.replace(/-/g, ' ').toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  FusionAI Security Operations &amp; Intelligence Digest
                </h3>
              </div>
              <div className="text-right text-xs font-mono text-slate-400">
                <div>Generated: {new Date().toLocaleDateString()} (UTC)</div>
                <div className="text-emerald-400 font-bold">Verified Contained (0 SLA Breaches)</div>
              </div>
            </div>

            {/* Document Section: Executive Narrative */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
                1. Executive Summary &amp; Operational Posture
              </h4>
              <p className="text-xs leading-relaxed text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                During the specified timeframe (<strong>{timeframeLabel}</strong>), the FusionAI Autonomous SOC Platform analyzed{' '}
                <strong className="text-cyan-300 font-mono">{totalVolume.toLocaleString()} raw security signals</strong> across 3 enterprise client tenants.
                Of these, <strong className="text-cyan-300 font-mono">{autoTriagedCount.toLocaleString()} ({autoTriagedRatio}%)</strong> were autonomously triaged,
                enriched, and dispositioned by the FusionAI reasoning engine in under 3 seconds, saving an estimated{' '}
                <strong className="text-emerald-400 font-mono">{hoursSaved} human analyst investigation hours</strong> and avoiding{' '}
                <strong className="text-emerald-400 font-mono">${cumulativeCostSavingsUSD.toLocaleString()} in SOC labor costs</strong>. All{' '}
                <strong className="text-rose-400 font-mono">{criticalVolume} Critical severity escalations</strong> were contained with zero SLA breaches.
              </p>
            </div>

            {/* Document Section: Cases with Cost & Time Savings */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  2. Priority Escalated Incidents with Quantified Cost Savings ({filteredAlerts.length} Cases in Scope)
                </h4>
                <span className="text-[11px] font-mono text-cyan-400">All cases feature enterprise TCK identifiers and ROI metrics</span>
              </div>

              <div className="space-y-2">
                {filteredAlerts.slice(0, 6).map((alert) => {
                  const s = getCaseCostAndTimeSavings(alert);

                  return (
                    <div
                      key={alert.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                          <span className="px-2 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {getAlertTicketNumber(alert)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {getAlertCaseNumber(alert)}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              alert.severity === 'Critical'
                                ? 'bg-rose-500/20 text-rose-300'
                                : alert.severity === 'High'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-slate-400">{alert.source_platform}</span>
                          <span className="text-slate-400 font-sans">• {alert.client}</span>
                        </div>
                        <div className="font-semibold text-white mt-1 truncate">{alert.title}</div>
                      </div>

                      {/* Savings Pill */}
                      <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                        <div className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                          <span>💰 {s.costSavedFormatted}</span>
                          <span className="text-slate-400 text-[10px] ml-1.5">({s.timeSavedFormatted})</span>
                        </div>

                        {onNavigateToInvestigation && (
                          <button
                            type="button"
                            onClick={() => onNavigateToInvestigation(alert.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                          >
                            Investigate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EMAIL DISPATCH MODAL                                                      */}
      {/* ========================================================================= */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Schedule &amp; Dispatch SOC Report</h3>
                  <p className="text-[11px] text-slate-400">Automated distribution list delivery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Primary Recipient</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">CC Distribution List</label>
                <input
                  type="text"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject || `[CONFIDENTIAL] FusionAI Executive SOC Report - ${timeframeLabel}`}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSending(true);
                  setTimeout(() => {
                    setIsSending(false);
                    const nowStr = new Date().toLocaleTimeString() + ' UTC';
                    setEmailSentTimestamp(nowStr);
                    setIsEmailModalOpen(false);
                    if (onShowToast) onShowToast(`Report dispatched to ${recipientEmail}`);
                  }, 800);
                }}
                disabled={isSending}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Dispatching...' : 'Send Report'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal for Shift Handovers & Stakeholder Reviews */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        alerts={filteredAlerts}
        analysts={analysts}
        clients={clients}
        selectedClientId={selectedClientId}
        timeframe={timeframe}
        timeframeLabel={timeframeLabel}
        activeSubTab={activeSubTab}
        cumulativeCostSavingsUSD={cumulativeCostSavingsUSD}
        totalVolume={totalVolume}
        criticalVolume={criticalVolume}
        highVolume={highVolume}
        autoTriagedCount={autoTriagedCount}
        autoTriagedRatio={autoTriagedRatio}
        hoursSaved={hoursSaved}
        technologyClosureData={technologyClosureData}
        onShowToast={onShowToast}
      />
    </div>
  );
};
