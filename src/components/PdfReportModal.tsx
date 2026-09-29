import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Check,
  ShieldCheck,
  Calendar,
  Clock,
  Users2,
  Building2,
  Sparkles,
  ArrowRight,
  Send,
  Coins,
  Copy,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { Alert, Analyst, Client } from '../types/soc';
import {
  downloadSocPdfReport,
  printSocReportViaBrowser,
  ReportKind,
} from '../utils/pdfReportGenerator';
import { getAlertCaseNumber, getAlertTicketNumber, getCaseCostAndTimeSavings } from '../utils/ticketUtils';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  analysts: Analyst[];
  clients: Client[];
  selectedClientId: string;
  timeframe: '24h' | '7d' | '30d' | '90d';
  timeframeLabel: string;
  activeSubTab: string;
  cumulativeCostSavingsUSD: number;
  totalVolume: number;
  criticalVolume: number;
  highVolume: number;
  autoTriagedCount: number;
  autoTriagedRatio: number;
  hoursSaved: number;
  technologyClosureData?: Array<{
    technologyName: string;
    closureCount: number;
    closureRatePct: number;
    costSavedUSD: number;
    hoursSaved: number;
  }>;
  onShowToast?: (msg: string) => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  alerts,
  analysts,
  clients,
  selectedClientId,
  timeframe,
  timeframeLabel,
  activeSubTab,
  cumulativeCostSavingsUSD,
  totalVolume,
  criticalVolume,
  highVolume,
  autoTriagedCount,
  autoTriagedRatio,
  hoursSaved,
  technologyClosureData = [],
  onShowToast,
}) => {
  if (!isOpen) return null;

  // Selected report kind
  const [reportKind, setReportKind] = useState<ReportKind>('shift-handover');
  const [customTitle, setCustomTitle] = useState('');
  const [targetClientId, setTargetClientId] = useState<string>(selectedClientId);
  const [customTimeframe, setCustomTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>(timeframe);

  // Shift handover details
  const [currentShift, setCurrentShift] = useState('Morning Shift (08:00 - 16:00 UTC)');
  const [nextShift, setNextShift] = useState('Afternoon Shift (16:00 - 00:00 UTC)');
  const [outgoingLead, setOutgoingLead] = useState('David Sterling (Tier-3 Lead)');
  const [incomingLead, setIncomingLead] = useState('Sarah Chen (Incident Commander)');

  // Editable notes
  const [shiftNotes, setShiftNotes] = useState(
    'Morning Shift Alpha concluded with 0 SLA breaches across all 3 enterprise accounts. All 10 at-risk cases are actively contained with >22m margin. Handing over custody of Apex credential dump investigation (CASE-8841) to incoming team. Incoming lead to verify Sentinel Critical packet burst remediation at 16:30 UTC.'
  );

  // Options toggles
  const [includeSavings, setIncludeSavings] = useState(true);
  const [includeTechBreakdown, setIncludeTechBreakdown] = useState(true);
  const [includeSignoff, setIncludeSignoff] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active client filter
  const targetClient = clients.find((c) => c.id === targetClientId);
  const clientScopeName = targetClientId === 'all' ? 'All 3 Enterprise Accounts' : targetClient?.name || 'All Clients';

  const filteredScopeAlerts =
    targetClientId === 'all'
      ? alerts
      : alerts.filter((a) => a.clientId === targetClientId);

  const customMultiplier =
    customTimeframe === '24h' ? 1 : customTimeframe === '7d' ? 7 : customTimeframe === '30d' ? 30 : 90;

  const currentMetrics = {
    totalVolume: filteredScopeAlerts.length * customMultiplier,
    criticalVolume: filteredScopeAlerts.filter((a) => a.severity === 'Critical').length * customMultiplier,
    highVolume: filteredScopeAlerts.filter((a) => a.severity === 'High').length * customMultiplier,
    autoTriagedCount: filteredScopeAlerts.filter((a) => a.routedTo === 'FusionAI').length * customMultiplier,
    autoTriagedRatio: autoTriagedRatio,
    hoursSaved: Math.round(((filteredScopeAlerts.filter((a) => a.routedTo === 'FusionAI').length * customMultiplier) * 36) / 60),
    cumulativeCostSavingsUSD: cumulativeCostSavingsUSD * customMultiplier,
  };

  const currentTabLabel =
    activeSubTab === 'kpi-overview'
      ? 'Operational & KPI Overview'
      : activeSubTab === 'analysts-throughput'
      ? 'Analyst Title & Tool Throughput'
      : activeSubTab === 'tech-closure-report'
      ? 'Technology & Closure Analytics'
      : activeSubTab === 'client-scorecards'
      ? 'Client Security Scorecards'
      : 'Automated SOC Report Engine';

  const defaultTitle =
    reportKind === 'shift-handover'
      ? 'SOC Shift-Handover Dossier & Operational Custody'
      : reportKind === 'executive-summary'
      ? 'Executive Cybersecurity Posture & Platform ROI Briefing'
      : `Current View: ${currentTabLabel} Snapshot`;

  const reportOptions = {
    reportKind,
    reportTitle: customTitle.trim() || defaultTitle,
    timeframeLabel:
      customTimeframe === '24h'
        ? 'Past 24 Hours'
        : customTimeframe === '7d'
        ? 'Past 7 Days'
        : customTimeframe === '30d'
        ? 'Month-to-Date (30 Days)'
        : 'Quarter-to-Date (90 Days)',
    timeframeKey: customTimeframe,
    clientScopeName,
    clientId: targetClientId,
    alerts: filteredScopeAlerts,
    analysts,
    clients,
    shiftNotes,
    outgoingLead,
    incomingLead,
    currentShiftName: currentShift,
    nextShiftName: nextShift,
    currentTabName: currentTabLabel,
    includeSavings,
    metrics: currentMetrics,
    techData: includeTechBreakdown ? technologyClosureData : [],
  };

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      downloadSocPdfReport(reportOptions);
      if (onShowToast) {
        onShowToast(
          `Downloaded ${reportKind === 'shift-handover' ? 'Shift Handover' : 'Executive'} PDF report successfully.`
        );
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      if (onShowToast) onShowToast('Error generating PDF report. Opening browser print view instead.');
      printSocReportViaBrowser(reportOptions);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPdf = () => {
    printSocReportViaBrowser(reportOptions);
    if (onShowToast) onShowToast('Opened printable vector view. Select "Save as PDF" to export.');
  };

  const handleCopyNotes = () => {
    const text = `
*FUSIONAI SOC SHIFT-HANDOVER REPORT*
Shift: ${currentShift} -> ${nextShift}
Outgoing Lead: ${outgoingLead} | Incoming Lead: ${incomingLead}
Timeframe: ${reportOptions.timeframeLabel}
Scope: ${clientScopeName}

*METRICS:*
- Total Ingestion: ${currentMetrics.totalVolume.toLocaleString()} signals
- Critical Incidents: ${currentMetrics.criticalVolume} | High: ${currentMetrics.highVolume}
- AI Auto-Triage: ${currentMetrics.autoTriagedRatio}% (${currentMetrics.autoTriagedCount.toLocaleString()} alerts)
- Labor Cost Saved: $${currentMetrics.cumulativeCostSavingsUSD.toLocaleString()} (${currentMetrics.hoursSaved} hrs)
- SLA Status: 0 Breaches, 16 Watched Cases

*NOTES & ACTION ITEMS:*
${shiftNotes}

*PRIORITY OPEN CASES:*
${filteredScopeAlerts
  .slice(0, 5)
  .map(
    (a) =>
      `• [${getAlertCaseNumber(a)}] ${a.title} (${a.severity}) - Client: ${a.client} - Analyst: ${
        a.assignedAnalyst || a.routedTo || 'FusionAI'
      }`
  )
  .join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onShowToast) onShowToast('Shift handover summary copied to clipboard.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  Export PDF Report &amp; Shift Dossier
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  OFFICIAL SOC DISPATCH
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate formal, audit-ready PDF reports for incoming shift-handovers or CISO executive reviews.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          {/* 1. Report Kind Selector */}
          <div>
            <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Select Report Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option A: Shift Handover */}
              <button
                type="button"
                onClick={() => {
                  setReportKind('shift-handover');
                  setShiftNotes(
                    'Morning Shift Alpha concluded with 0 SLA breaches across all 3 enterprise accounts. All 10 at-risk cases are actively contained with >22m margin. Handing over custody of Apex credential dump investigation (CASE-8841) to incoming team. Incoming lead to verify Sentinel Critical packet burst remediation at 16:30 UTC.'
                  );
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  reportKind === 'shift-handover'
                    ? 'bg-amber-950/40 border-amber-500/70 text-white shadow-lg shadow-amber-950/20'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${reportKind === 'shift-handover' ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="font-bold text-xs text-white">Shift Handover Dossier</span>
                  </div>
                  {reportKind === 'shift-handover' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Tailored for incoming shift commanders: active cases, SLA countdowns, analyst assignments, and lead sign-off.
                </p>
              </button>

              {/* Option B: Executive Stakeholder Summary */}
              <button
                type="button"
                onClick={() => {
                  setReportKind('executive-summary');
                  setShiftNotes(
                    `During the operational window, the FusionAI Autonomous SOC Platform maintained a 98.4% SLA adherence rate across 3 enterprise client pods. Autonomous AI triage dispositioned ${currentMetrics.autoTriagedRatio}% of inbound security telemetry in under 3.2 minutes average MTTR, generating quantifiable labor cost avoidance of $${currentMetrics.cumulativeCostSavingsUSD.toLocaleString()} USD (${currentMetrics.hoursSaved} analyst hours saved). High-severity threats were contained without perimeter degradation.`
                  );
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  reportKind === 'executive-summary'
                    ? 'bg-cyan-950/40 border-cyan-500/70 text-white shadow-lg shadow-cyan-950/20'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 ${reportKind === 'executive-summary' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="font-bold text-xs text-white">Executive Stakeholder Summary</span>
                  </div>
                  {reportKind === 'executive-summary' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Executive briefing for CISO &amp; leadership: strategic health, MTTD/MTTR benchmarks, labor cost ROI, and sensor audit.
                </p>
              </button>

              {/* Option C: Current View Snapshot */}
              <button
                type="button"
                onClick={() => {
                  setReportKind('current-view');
                  setShiftNotes(
                    `Snapshot report of the current ${currentTabLabel} view within the FusionAI SOC Platform. Covers telemetry and metrics captured at ${new Date().toISOString().substring(11, 16)} UTC.`
                  );
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  reportKind === 'current-view'
                    ? 'bg-indigo-950/40 border-indigo-500/70 text-white shadow-lg shadow-indigo-950/20'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${reportKind === 'current-view' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="font-bold text-xs text-white">Current View Snapshot</span>
                  </div>
                  {reportKind === 'current-view' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Direct capture of current sub-tab: {currentTabLabel}.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Customization Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs">
            {/* Scope */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Client Tenant Scope:</label>
              <select
                value={targetClientId}
                onChange={(e) => setTargetClientId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">All 3 Enterprise Accounts</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Timeframe Window:</label>
              <select
                value={customTimeframe}
                onChange={(e) => setCustomTimeframe(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="24h">Past 24 Hours (Shift Cycle)</option>
                <option value="7d">Past 7 Days (Weekly)</option>
                <option value="30d">Month-to-Date (30 Days)</option>
                <option value="90d">Quarter-to-Date (90 Days)</option>
              </select>
            </div>

            {/* Custom Report Title */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Custom Report Title (Optional):</label>
              <input
                type="text"
                placeholder={defaultTitle}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* 3. Shift Handover Roster Details (Shown if Shift Handover mode) */}
          {reportKind === 'shift-handover' && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-2">
                <Users2 className="w-4 h-4 text-amber-400" />
                <span>Shift Custody &amp; Handover Personnel</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Active Shift:</label>
                  <input
                    type="text"
                    value={currentShift}
                    onChange={(e) => setCurrentShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Incoming Shift:</label>
                  <input
                    type="text"
                    value={nextShift}
                    onChange={(e) => setNextShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Outgoing Shift Lead:</label>
                  <input
                    type="text"
                    value={outgoingLead}
                    onChange={(e) => setOutgoingLead(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Incoming Commander:</label>
                  <input
                    type="text"
                    value={incomingLead}
                    onChange={(e) => setIncomingLead(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Editable Operational Notes & Handover Directives */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                {reportKind === 'shift-handover' ? 'Shift Handover Notes & Directives:' : 'Executive Narrative & Observations:'}
              </label>
              <button
                type="button"
                onClick={handleCopyNotes}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
            />
          </div>

          {/* 5. Document Sections & Options Toggles */}
          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSavings}
                onChange={(e) => setIncludeSavings(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Include Labor Cost &amp; Time Savings Metrics</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTechBreakdown}
                onChange={(e) => setIncludeTechBreakdown(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Include Platform &amp; Sensor Fleet Breakdown</span>
            </label>

            {reportKind === 'shift-handover' && (
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignoff}
                  onChange={(e) => setIncludeSignoff(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Include Formal Custody Sign-off Block</span>
              </label>
            )}
          </div>

          {/* 6. Document Live Preview Card */}
          <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner bg-slate-950/70">
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>PDF DOCUMENT LIVE PRINT PREVIEW</span>
              </div>
              <span>A4 PORTRAIT • 300 DPI VECTOR</span>
            </div>

            <div className="p-4 space-y-4 text-xs font-sans">
              {/* Header Box */}
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                    {reportKind === 'shift-handover' ? 'OPERATIONAL SHIFT HANDOVER' : 'EXECUTIVE STAKEHOLDER REVIEW'}
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">{customTitle || defaultTitle}</h4>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Scope: <strong className="text-slate-300">{clientScopeName}</strong> • Window:{' '}
                    <strong className="text-slate-300">{reportOptions.timeframeLabel}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    TLP:AMBER • CONFIDENTIAL
                  </span>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {filteredScopeAlerts.length} Cases in Scope
                  </div>
                </div>
              </div>

              {/* 4 Mini KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Total Telemetry</div>
                  <div className="text-sm font-bold text-white mt-0.5">{currentMetrics.totalVolume.toLocaleString()}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Autonomous Triage</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{currentMetrics.autoTriagedRatio}%</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Labor Cost Avoided</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    ${currentMetrics.cumulativeCostSavingsUSD.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">
                    {reportKind === 'shift-handover' ? 'SLA Breach Watch' : 'MTTD / MTTR'}
                  </div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">
                    {reportKind === 'shift-handover' ? '0 Breached / 16 Watched' : '4.2m / 12.8m'}
                  </div>
                </div>
              </div>

              {/* Top Cases Table Preview */}
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-mono text-[10px] border-b border-slate-800 uppercase">
                      <th className="py-2 px-2.5">Case Number</th>
                      <th className="py-2 px-2.5">Severity</th>
                      <th className="py-2 px-2.5">Incident Title</th>
                      <th className="py-2 px-2.5">Client Pod</th>
                      <th className="py-2 px-2.5">Analyst</th>
                      <th className="py-2 px-2.5 text-right">Labor ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {(reportKind === 'shift-handover'
                      ? filteredScopeAlerts.filter(
                          (a) =>
                            a.status === 'Escalated' ||
                            Boolean(a.escalatedTo) ||
                            a.status?.startsWith('In Progress') ||
                            a.status === 'Acknowledged'
                        )
                      : filteredScopeAlerts
                    )
                      .slice(0, 5)
                      .map((a) => {
                        const s = getCaseCostAndTimeSavings(a);
                        const isEscalated = a.status === 'Escalated' || Boolean(a.escalatedTo);
                        return (
                          <tr key={a.id} className={`hover:bg-slate-900/40 ${isEscalated ? 'bg-red-950/20' : ''}`}>
                            <td className="py-2 px-2.5 font-bold">
                              <span className={isEscalated ? 'text-red-400' : 'text-cyan-400'}>
                                {getAlertCaseNumber(a)}
                              </span>
                              {isEscalated && (
                                <span className="ml-1 text-[8px] bg-red-500/30 text-red-300 px-1 rounded">ESC</span>
                              )}
                            </td>
                            <td className="py-2 px-2.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  a.severity === 'Critical'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : a.severity === 'High'
                                    ? 'bg-orange-500/20 text-orange-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {a.severity}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 font-sans font-medium text-white max-w-xs truncate">
                              {a.title}
                            </td>
                            <td className="py-2 px-2.5 font-sans text-slate-300">{a.client}</td>
                            <td className="py-2 px-2.5 font-sans text-slate-400">
                              {a.assignedAnalyst ? a.assignedAnalyst.split(' ')[0] : 'FusionAI'}
                            </td>
                            <td className="py-2 px-2.5 text-right text-emerald-400 font-bold">
                              {s.costSavedFormatted}
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

        {/* Modal Footer Actions */}
        <div className="p-4 md:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Format: Standard A4 PDF Document with High-Res Vector Graphics</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            {/* Print / Save via Browser PDF */}
            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Open printable layout and use browser's Save as PDF"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Print / Browser PDF</span>
            </button>

            {/* Direct Instant PDF Download (jsPDF) */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-500 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/50 cursor-pointer transition-all active:scale-95 border border-cyan-400/30"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGenerating
                  ? 'Generating PDF...'
                  : reportKind === 'shift-handover'
                  ? 'Export Shift Handoff'
                  : 'Download PDF Report'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
