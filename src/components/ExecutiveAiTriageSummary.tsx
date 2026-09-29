import React, { useState } from 'react';
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  Globe,
  Binary,
  Network,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Bot,
  Zap,
  Tag,
  Activity,
  User,
  Laptop,
  FileText,
  Lock,
  ArrowRight,
  Sparkles,
  History,
  FileSearch,
  Layers,
  Search,
  Sliders,
  X,
  ArrowUpRight,
  Building2,
  UserPlus,
  Send,
  Radio,
  Coins,
  DollarSign,
} from 'lucide-react';
import { Alert, ExecutiveTriageReport } from '../types/soc';
import { getExecutiveTriageReportForAlert, formatTriageReportAsText } from '../utils/triageReportUtils';
import { getAlertTicketNumber, getAlertCaseNumber, getCaseCostAndTimeSavings } from '../utils/ticketUtils';

interface ExecutiveAiTriageSummaryProps {
  alert: Alert;
  allAlerts?: Alert[];
  report?: ExecutiveTriageReport;
  onExecutePlaybook?: (playbookName: string) => void;
  onClaimAlert?: (alertId: string) => void;
  onSendToTuning?: (alertId: string, reason?: string) => void;
  onCloseAlert?: (alertId: string, reason: 'Benign' | 'False Positive' | 'True Positive', notes?: string) => void;
  onEscalateAlert?: (
    alertId: string,
    target: 'Client Team' | 'T3 / SME',
    details: {
      recipient?: string;
      reason: string;
      urgency: 'Standard' | 'High' | 'Emergency';
      actionRequired?: string;
    }
  ) => void;
  currentAnalystName?: string;
  isModalView?: boolean;
}

export const ExecutiveAiTriageSummary: React.FC<ExecutiveAiTriageSummaryProps> = ({
  alert,
  allAlerts,
  report: propReport,
  onExecutePlaybook,
  onClaimAlert,
  onSendToTuning,
  onCloseAlert,
  onEscalateAlert,
  currentAnalystName,
  isModalView = false,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');
  const [copied, setCopied] = useState(false);
  const [analysisSubTab, setAnalysisSubTab] = useState<'all' | 'virustotal' | 'domain' | 'ip' | 'symantec'>('all');
  const [histFilter, setHistFilter] = useState<'all' | 'true-positive' | 'benign' | 'active'>('all');

  // Alert Escalation Option State (User requirement: Escalate to Client Team or T3/SME across all severity cases)
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateTarget, setEscalateTarget] = useState<'Client Team' | 'T3 / SME'>('Client Team');
  const [escalateRecipient, setEscalateRecipient] = useState('');
  const [escalateUrgency, setEscalateUrgency] = useState<'Standard' | 'High' | 'Emergency'>(
    alert.severity === 'Critical' ? 'Emergency' : alert.severity === 'High' ? 'High' : 'Standard'
  );
  const [escalateActionRequired, setEscalateActionRequired] = useState(
    'Identity Verification & Incident Confirmation'
  );
  const [escalateNotes, setEscalateNotes] = useState('');
  const [isSubmittingEscalation, setIsSubmittingEscalation] = useState(false);
  const [escalatedState, setEscalatedState] = useState<{
    target: 'Client Team' | 'T3 / SME';
    recipient: string;
    timestamp: string;
    notes?: string;
  } | null>(
    alert.status === 'Escalated' && alert.escalatedTo
      ? {
          target: (alert.escalatedTo as 'Client Team' | 'T3 / SME') || 'Client Team',
          recipient: alert.escalationTarget || 'Assigned Lead',
          timestamp: alert.escalationTimestamp || 'Earlier',
          notes: alert.escalationReason,
        }
      : null
  );

  const report = propReport || getExecutiveTriageReportForAlert(alert, allAlerts);
  const hist = report.historicalCorrelation;
  const savings = getCaseCostAndTimeSavings(alert);

  const handleCopy = () => {
    const formattedText = formatTriageReportAsText(report, alert.title);
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getVerdictBadge = (verdict: string) => {
    if (verdict.includes('True Positive') || verdict.toLowerCase().includes('malicious')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    if (verdict.toLowerCase().includes('suspicious')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  };

  const filteredMatches =
    hist?.matchedAlerts.filter((m) => {
      if (histFilter === 'true-positive') return m.closureResult === 'True Positive';
      if (histFilter === 'benign') return m.closureResult === 'Benign' || m.closureResult === 'False Positive';
      if (histFilter === 'active') return !m.isHistoricalClosed;
      return true;
    }) || [];

  const handleOpenEscalateToClient = () => {
    setEscalateTarget('Client Team');
    setEscalateRecipient(
      `${alert.client.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-secops@${alert.client.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.internal`
    );
    setEscalateUrgency(alert.severity === 'Critical' ? 'Emergency' : alert.severity === 'High' ? 'High' : 'Standard');
    setEscalateActionRequired('Identity Verification & Incident Confirmation');
    setEscalateNotes(
      `[${getAlertTicketNumber(alert)} / ${getAlertCaseNumber(alert)}] Escalation to Client Security Team for ${alert.client}.\nAlert: "${alert.title}" (${alert.severity} Severity)\nTarget Entity: User ${alert.entityUser || 's.jenkins'}, Host ${alert.entityHost || 'CORP-HOST-01'}, IP ${alert.entityIp || '10.100.4.15'}.\nRecommended Action: Validate user authorization, confirm endpoint containment, and review multi-factor authentication logs.`
    );
    setIsEscalateModalOpen(true);
  };

  const handleOpenEscalateToT3 = () => {
    setEscalateTarget('T3 / SME');
    setEscalateRecipient('Tier 3 Advanced Threat Hunter & Senior Forensics SME Lead');
    setEscalateUrgency(alert.severity === 'Critical' ? 'Emergency' : alert.severity === 'High' ? 'High' : 'Standard');
    setEscalateActionRequired('Deep Memory Forensics & Reverse Engineering');
    setEscalateNotes(
      `[${getAlertTicketNumber(alert)} / ${getAlertCaseNumber(alert)}] Escalation to Tier 3 Threat Hunter / Incident Response SME.\nAlert: "${alert.title}" (${alert.severity} Severity)\nCorrelated Platform: ${alert.source_platform} | MITRE: ${alert.mitreTactic}\nTarget Entity: Host ${alert.entityHost || 'CORP-HOST-01'}, IP ${alert.entityIp || '10.100.4.15'}.\nRequested SME Assistance: Perform binary unpacking, analyze beacon heartbeat cadence, and reconstruct lateral movement tree.`
    );
    setIsEscalateModalOpen(true);
  };

  const handleConfirmEscalation = () => {
    setIsSubmittingEscalation(true);
    setTimeout(() => {
      setIsSubmittingEscalation(false);
      const timeStr = new Date().toLocaleTimeString() + ' UTC';
      setEscalatedState({
        target: escalateTarget,
        recipient: escalateRecipient,
        timestamp: timeStr,
        notes: escalateNotes,
      });
      setIsEscalateModalOpen(false);
      if (onEscalateAlert) {
        onEscalateAlert(alert.id, escalateTarget, {
          recipient: escalateRecipient,
          reason: escalateNotes,
          urgency: escalateUrgency,
          actionRequired: escalateActionRequired,
        });
      }
    }, 600);
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Triage Summary Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                Executive AI Triage Summary
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                FusionAI SOC Intelligence
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950/70 border border-indigo-500/30 text-indigo-300">
                Telemetry Cross-Validated
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 flex items-center gap-1 shadow-sm">
                <Coins className="w-3 h-3 text-emerald-400" />
                <span>{savings.costSavedFormatted} Saved ({savings.timeSavedFormatted})</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Standardized SOC Incident Triage Dossier • 5-Vector Threat Forensics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                viewMode === 'visual'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Visual Dossier
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Formatted Report (Text)
            </button>
          </div>

          {/* Copy Report Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-all active:scale-95 shadow-sm"
            title="Copy standardized triage report formatted for ServiceNow / Jira / ITSM"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Report Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Triage Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {viewMode === 'raw' ? (
        /* Raw Text / Formatted Markdown View */
        <div className="relative">
          <div className="absolute top-3 right-3 text-[10px] text-slate-400 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded font-mono">
            Standardized SecOps Markdown Format
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[550px] overflow-y-auto selection:bg-cyan-500/30 selection:text-cyan-200">
            {formatTriageReportAsText(report, alert.title)}
          </pre>
        </div>
      ) : (
        /* Rich Interactive Visual Dossier View */
        <div className="space-y-4">
          {/* AI EFFICIENCY & COST SAVINGS PER TICKET BANNER */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-indigo-950/40 border border-emerald-500/40 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      AI Analysis Efficiency &amp; Cost Savings Impact
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {savings.efficiencyGainPct}% Time Reduction
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Quantified ROI for ticket <strong>{getAlertTicketNumber(alert)}</strong> based on automated correlation and autonomous forensic triage.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap font-mono text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-emerald-500/40 text-right">
                  <span className="text-[10px] text-slate-400 block">Cost Avoided / Saved</span>
                  <span className="text-sm font-bold text-emerald-400">{savings.costSavedFormatted}</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-cyan-500/40 text-right">
                  <span className="text-[10px] text-slate-400 block">Analyst Time Saved</span>
                  <span className="text-sm font-bold text-cyan-300">{savings.timeSavedFormatted}</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-right">
                  <span className="text-[10px] text-slate-400 block">Manual Baseline</span>
                  <span className="text-xs font-bold text-slate-300">{savings.manualBaselineMins}m vs {savings.aiAnalysisMins}m</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: When (Trigger & Scope) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                  When (Trigger &amp; Scope)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                {report.when.timestamp}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/90">
                <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1">
                  Trigger Event &amp; Detection Logic
                </span>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {report.when.trigger}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/90">
                <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1">
                  Detection Scope &amp; Target Context
                </span>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {report.when.scope}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold block mb-1.5 flex items-center gap-1.5">
                  <Laptop className="w-3 h-3 text-slate-400" />
                  Affected Infrastructure &amp; Assets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {report.when.affectedAssets.map((asset, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px] flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      {asset}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold block mb-1.5 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-slate-400" />
                  Affected User Identities:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {report.when.affectedUsers.map((user, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-mono text-[11px] flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      {user}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Key Indicators */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Tag className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                  Key Indicators
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {report.keyIndicators.indicators.length} IoCs Correlated
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed">
              {report.keyIndicators.iocSummary}
            </p>

            {/* IoCs Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Artifact / Value</th>
                    <th className="py-2 px-3">Forensic Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                  {report.keyIndicators.indicators.map((ind, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 whitespace-nowrap font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ind.type === 'Hash'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : ind.type === 'IP'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : ind.type === 'Domain'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : ind.type === 'Command'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          }`}
                        >
                          {ind.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-cyan-300 break-all select-all font-semibold">
                        {ind.value}
                      </td>
                      <td className="py-2 px-3 text-slate-300">{ind.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MITRE ATT&CK Mapping */}
            <div className="pt-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold block mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                MITRE ATT&amp;CK Matrix Techniques:
              </span>
              <div className="flex flex-wrap gap-2">
                {report.keyIndicators.mitreTechniques.map((m, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-amber-500/30 text-amber-300 font-mono text-[11px] flex items-center gap-1.5"
                  >
                    <strong className="text-white">{m.id}</strong> • {m.name}{' '}
                    <span className="text-slate-400 text-[10px]">({m.tactic})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: Impact Assessment */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                  Impact Assessment
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300">
                  {report.impactAssessment.criticalityTier}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    report.impactAssessment.riskLevel === 'Critical'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : report.impactAssessment.riskLevel === 'High'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  }`}
                >
                  {report.impactAssessment.riskLevel} Risk
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1">
                  Business &amp; Operational Impact
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {report.impactAssessment.businessImpact}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1">
                  Target Data &amp; Assets at Risk
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {report.impactAssessment.dataAtRisk}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1">
                  Infection / Intrusion Blast Radius
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {report.impactAssessment.blastRadius}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: Analysis Result */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Activity className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                    Analysis Result
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    VirusTotal Hash • Domain Reputation • IPs Analysis • Symantec SiteReview
                  </span>
                </div>
              </div>

              {/* Sub-tab filter for Analysis Result */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setAnalysisSubTab('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                    analysisSubTab === 'all'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All 4 Feeds
                </button>
                <button
                  onClick={() => setAnalysisSubTab('virustotal')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                    analysisSubTab === 'virustotal'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  VirusTotal
                </button>
                <button
                  onClick={() => setAnalysisSubTab('domain')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                    analysisSubTab === 'domain'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Domain
                </button>
                <button
                  onClick={() => setAnalysisSubTab('ip')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                    analysisSubTab === 'ip'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  IPs Analysis
                </button>
                <button
                  onClick={() => setAnalysisSubTab('symantec')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                    analysisSubTab === 'symantec'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Symantec SiteReview
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1. VirusTotal for Hash Value Analysis */}
              {(analysisSubTab === 'all' || analysisSubTab === 'virustotal') && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Binary className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-slate-200 text-xs uppercase font-mono">
                        VirusTotal Hash Analysis
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        report.analysisResult.hashAnalysis.verdict === 'Malicious'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : report.analysisResult.hashAnalysis.verdict === 'Suspicious'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {report.analysisResult.hashAnalysis.verdict}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-black/60 border border-slate-800 font-mono text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>SHA256 Digest:</span>
                      <span className="text-purple-300 select-all truncate max-w-[200px]" title={report.analysisResult.hashAnalysis.sha256}>
                        {report.analysisResult.hashAnalysis.sha256}
                      </span>
                    </div>
                    {report.analysisResult.hashAnalysis.md5 && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>MD5:</span>
                        <span className="text-slate-300 select-all font-mono">
                          {report.analysisResult.hashAnalysis.md5}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Vendor Detection:</span>
                      <strong className="text-rose-400 font-mono text-xs">
                        {report.analysisResult.hashAnalysis.detectionRatio}
                      </strong>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Malware Family:</span>
                      <strong className="text-purple-300 font-mono text-[11px] truncate block" title={report.analysisResult.hashAnalysis.malwareFamily}>
                        {report.analysisResult.hashAnalysis.malwareFamily}
                      </strong>
                    </div>
                  </div>

                  {report.analysisResult.hashAnalysis.sandboxVerdict && (
                    <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-800/80">
                      <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-0.5">
                        Sandbox Dynamic Behavior:
                      </span>
                      {report.analysisResult.hashAnalysis.sandboxVerdict}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Domain Reputation */}
              {(analysisSubTab === 'all' || analysisSubTab === 'domain') && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-slate-200 text-xs uppercase font-mono">
                        Domain Reputation
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        report.analysisResult.domainReputation.reputationVerdict === 'Malicious'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {report.analysisResult.domainReputation.reputationVerdict}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-black/60 border border-slate-800 font-mono text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Target FQDN:</span>
                      <span className="text-amber-300 font-bold font-mono">
                        {report.analysisResult.domainReputation.domain}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Threat Index:</span>
                      <span className="text-rose-400 font-bold font-mono">
                        {report.analysisResult.domainReputation.threatScore}/100 Risk
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Registrar:</span>
                      <span className="text-slate-200 font-medium truncate block" title={report.analysisResult.domainReputation.registrar}>
                        {report.analysisResult.domainReputation.registrar}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Creation Age:</span>
                      <span className="text-slate-200 font-medium">
                        {report.analysisResult.domainReputation.creationAge}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-0.5">
                      Threat Category &amp; DNS:
                    </span>
                    <strong className="text-amber-300 font-mono">
                      {report.analysisResult.domainReputation.threatCategory}
                    </strong>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {report.analysisResult.domainReputation.dnsDetails}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. IPs Analysis */}
              {(analysisSubTab === 'all' || analysisSubTab === 'ip') && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-slate-200 text-xs uppercase font-mono">
                        IPs Analysis
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        report.analysisResult.ipAnalysis.reputationVerdict === 'High Risk'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {report.analysisResult.ipAnalysis.reputationVerdict}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-black/60 border border-slate-800 font-mono text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Source / Target IP:</span>
                      <span className="text-cyan-300 font-bold font-mono">
                        {report.analysisResult.ipAnalysis.ip}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Abuse Confidence:</span>
                      <span className="text-rose-400 font-bold font-mono">
                        {report.analysisResult.ipAnalysis.abuseConfidenceScore}% AbuseIPDB
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">ASN / Network:</span>
                      <span className="text-slate-200 font-medium truncate block" title={report.analysisResult.ipAnalysis.asn}>
                        {report.analysisResult.ipAnalysis.asn}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Geolocation:</span>
                      <span className="text-slate-200 font-medium">
                        {report.analysisResult.ipAnalysis.city ? `${report.analysisResult.ipAnalysis.city}, ` : ''}
                        {report.analysisResult.ipAnalysis.country}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-0.5">
                      Threat Intel Categorization:
                    </span>
                    <span className="text-cyan-300 font-medium">
                      {report.analysisResult.ipAnalysis.threatCategory}
                    </span>
                  </div>
                </div>
              )}

              {/* 4. Symantec SiteReview (Website Reputation & Category) */}
              {(analysisSubTab === 'all' || analysisSubTab === 'symantec') && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-slate-200 text-xs uppercase font-mono">
                        Symantec SiteReview (Website Category)
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        report.analysisResult.symantecSiteReview.securityRisk === 'High Risk'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {report.analysisResult.symantecSiteReview.securityRisk}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-black/60 border border-slate-800 font-mono text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Queried Host / URL:</span>
                      <span className="text-emerald-300 font-bold font-mono truncate max-w-[220px]" title={report.analysisResult.symantecSiteReview.targetUrlOrDomain}>
                        {report.analysisResult.symantecSiteReview.targetUrlOrDomain}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Site Classification:</span>
                      <span className="text-rose-400 font-semibold">
                        {report.analysisResult.symantecSiteReview.threatClassification}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Primary Category:</span>
                      <strong className="text-white block truncate" title={report.analysisResult.symantecSiteReview.primaryCategory}>
                        {report.analysisResult.symantecSiteReview.primaryCategory}
                      </strong>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Secondary Category:</span>
                      <span className="text-slate-300 block truncate" title={report.analysisResult.symantecSiteReview.secondaryCategory || 'None'}>
                        {report.analysisResult.symantecSiteReview.secondaryCategory || 'None'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-0.5">
                      Broadcom / BlueCoat Proxy Policy:
                    </span>
                    <strong className="text-emerald-400 font-mono text-[10px]">
                      {report.analysisResult.symantecSiteReview.filteringPolicy}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {report.analysisResult.technicalDetails && (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-300">Correlation Engine Note: </strong>
                  {report.analysisResult.technicalDetails}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: Conclusion & Action */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                  Conclusion &amp; Action
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getVerdictBadge(
                  report.conclusionAndAction.verdict
                )}`}
              >
                {report.conclusionAndAction.verdict}
              </span>
            </div>

            {/* Conclusion text */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1">
                Executive Incident Triage Assessment:
              </span>
              <p className="text-slate-200 leading-relaxed font-medium">
                {report.conclusionAndAction.conclusion}
              </p>
            </div>

            {/* Immediate Actions Checklist */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold block mb-2 flex items-center justify-between">
                <span>Prescribed Immediate Containment Actions:</span>
                <span className="text-cyan-400 font-mono">
                  Status: {report.conclusionAndAction.containmentStatus}
                </span>
              </span>
              <div className="space-y-1.5">
                {report.conclusionAndAction.immediateActions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono font-bold">
                        {i + 1}
                      </span>
                      <span className="text-slate-200 font-medium text-xs">{action}</span>
                    </div>
                    {onExecutePlaybook && (
                      <button
                        onClick={() => onExecutePlaybook(action)}
                        className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-[10px] font-mono font-bold cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Stage Playbook</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 6: Previous & Related Alert Correlation (Same User & Key Indicators Matching) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <History className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wide flex items-center gap-2">
                    <span>Previous &amp; Related Alert Correlation</span>
                    {hist && hist.hasMatches && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                        {hist.totalMatches} Matched
                      </span>
                    )}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Matches on Same User Identity &amp; Key Indicators (IP, Host, Domain, Hash) • Historical Closure Dispositions
                  </span>
                </div>
              </div>

              {/* Tally Pill Badges */}
              {hist && hist.hasMatches && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hist.truePositiveCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      <span>{hist.truePositiveCount} Closed: True Positive</span>
                    </span>
                  )}
                  {hist.benignCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{hist.benignCount} Closed: Benign</span>
                    </span>
                  )}
                  {hist.activeCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-cyan-400" />
                      <span>{hist.activeCount} Active Related</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Historical Synthesis Verdict Banner */}
            {hist && (
              <div
                className={`p-3.5 rounded-xl border ${
                  hist.truePositiveCount > 0
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : hist.benignCount > 0 && hist.activeCount === 0
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : hist.activeCount > 0
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {hist.truePositiveCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : hist.benignCount > 0 ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider block opacity-80">
                      FusionAI Historical Intelligence Synthesis
                    </span>
                    <p className="text-xs leading-relaxed font-medium">
                      {hist.summaryVerdict}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Sub-Tabs for Matches */}
            {hist && hist.hasMatches && (
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setHistFilter('all')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-all ${
                      histFilter === 'all'
                        ? 'bg-purple-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Correlated ({hist.totalMatches})
                  </button>
                  {hist.truePositiveCount > 0 && (
                    <button
                      onClick={() => setHistFilter('true-positive')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-all ${
                        histFilter === 'true-positive'
                          ? 'bg-rose-600 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Closed: True Positive ({hist.truePositiveCount})
                    </button>
                  )}
                  {hist.benignCount > 0 && (
                    <button
                      onClick={() => setHistFilter('benign')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-all ${
                        histFilter === 'benign'
                          ? 'bg-emerald-600 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Closed: Benign ({hist.benignCount})
                    </button>
                  )}
                  {hist.activeCount > 0 && (
                    <button
                      onClick={() => setHistFilter('active')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-all ${
                        histFilter === 'active'
                          ? 'bg-cyan-600 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Active Related ({hist.activeCount})
                    </button>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 font-mono">
                  Showing {filteredMatches.length} of {hist.totalMatches} matched records
                </span>
              </div>
            )}

            {/* List of Matched Historical & Related Alerts */}
            {hist && hist.hasMatches ? (
              <div className="space-y-3">
                {filteredMatches.map((m, idx) => {
                  const isTP = m.closureResult === 'True Positive';
                  const isBenign = m.closureResult === 'Benign' || m.closureResult === 'False Positive';
                  const isClosed = m.isHistoricalClosed;

                  return (
                    <div
                      key={m.alertId + idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isTP
                          ? 'bg-slate-900/90 border-rose-500/40 hover:border-rose-400/60 shadow-sm shadow-rose-950/20'
                          : isBenign
                          ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400/60 shadow-sm shadow-emerald-950/20'
                          : 'bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400/60 shadow-sm shadow-cyan-950/20'
                      }`}
                    >
                      {/* Alert Card Header with explicit outcome badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-white">
                            {m.alertId}
                          </span>
                          {m.incidentId && (
                            <span className="text-[10px] font-mono bg-slate-950 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded">
                              {m.incidentId}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-slate-200">
                            {m.title}
                          </span>
                        </div>

                        {/* Explicit Outcome: Benign vs True Positive vs Active */}
                        <div>
                          {isClosed ? (
                            isTP ? (
                              <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1.5 shadow-sm">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                <span>CLOSED: TRUE POSITIVE (Malicious)</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>CLOSED: BENIGN (False Positive)</span>
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 flex items-center gap-1.5 shadow-sm">
                              <Activity className="w-3.5 h-3.5 text-cyan-400" />
                              <span>ACTIVE: IN-PROGRESS (Live)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Matching Factor Chips */}
                      <div className="py-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold mr-1">
                          Matched On:
                        </span>
                        {m.matchedBy.map((factor, fIdx) => (
                          <span
                            key={fIdx}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border ${
                              factor.type === 'Same User'
                                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                                : factor.type.includes('IP')
                                ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                                : factor.type.includes('Host')
                                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                                : factor.type.includes('Domain')
                                ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                : 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                            }`}
                            title={factor.details}
                          >
                            <strong>{factor.type}:</strong> {factor.value}
                          </span>
                        ))}
                      </div>

                      {/* Context & Closure Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">
                            Timeline &amp; Platform:
                          </span>
                          <span className="text-slate-200 font-medium font-mono text-[10px]">
                            {m.timestamp} {m.relativeTime ? `(${m.relativeTime})` : ''} • {m.source_platform}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">
                            Classification Category:
                          </span>
                          <span className="text-slate-200 font-medium">
                            {m.closureCategory || 'Standard Telemetry'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">
                            {isClosed ? 'Investigated &amp; Closed By:' : 'Currently Assigned To:'}
                          </span>
                          <span className="text-cyan-300 font-medium">
                            {m.closedBy || 'SOC Operations'}
                          </span>
                        </div>
                      </div>

                      {/* Resolution Notes / Closed Results */}
                      <div className="mt-2.5 text-xs text-slate-300 space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <strong className="text-slate-200 shrink-0 font-mono text-[10px] uppercase mt-0.5">
                            {isClosed ? 'Resolution Outcome &amp; Notes:' : 'Current Investigation State:'}
                          </strong>
                          <p className="leading-relaxed text-slate-300 text-[11px]">
                            {m.resolutionNotes}
                          </p>
                        </div>

                        {/* Remediations / Actions taken in that incident */}
                        {m.actionsTaken && m.actionsTaken.length > 0 && (
                          <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-slate-400">Actions Recorded:</span>
                            {m.actionsTaken.map((act, aIdx) => (
                              <span
                                key={aIdx}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]"
                              >
                                ✓ {act}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Clean Baseline empty state */
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1.5">
                <ShieldCheck className="w-7 h-7 text-emerald-400 mx-auto" />
                <h4 className="text-xs font-bold text-white uppercase font-mono">
                  Clean Historical Baseline Verified
                </h4>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  No prior alerts or historical closed incidents recorded for this user identity or key indicators across the 365-day SOC enterprise archive. First-time observation baseline.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM ACTION BAR: ESCALATIONS, CLAIM, TUNING, CLOSE ACTIONS              */}
      {/* ========================================================================= */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 shadow-lg">
        {/* Top Status & Confirmation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-mono">
              Ticket: <strong className="text-cyan-400 font-bold">{getAlertTicketNumber(alert)}</strong>{' '}
              <span className="text-slate-500">({getAlertCaseNumber(alert)})</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                alert.severity === 'Critical'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : alert.severity === 'High'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : alert.severity === 'Medium'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {alert.severity.toUpperCase()} SEVERITY
            </span>
            {alert.tuningFlagged && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                SENT TO TUNING
              </span>
            )}
            {(alert.status === 'Escalated' || escalatedState) && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold flex items-center gap-1.5 animate-pulse">
                <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                <span>
                  ESCALATED: {escalatedState ? escalatedState.target.toUpperCase() : alert.escalatedTo?.toUpperCase() || 'SME'}
                </span>
              </span>
            )}
            {alert.status === 'Closed' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                CLOSED ({alert.closureReason || 'Resolved'})
              </span>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Client: <strong className="text-white">{alert.client}</strong></span>
            <span>•</span>
            <span>Platform: <strong className="text-cyan-300">{alert.source_platform}</strong></span>
          </div>
        </div>

        {/* Escalation Notification Banner if recently escalated */}
        {escalatedState && (
          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">
                Alert escalated to <strong>{escalatedState.target}</strong> ({escalatedState.recipient}) at {escalatedState.timestamp}.
              </span>
            </div>
            <span className="text-[10px] font-mono text-indigo-300 font-bold px-1.5 py-0.5 rounded bg-indigo-900/60 border border-indigo-700/60 shrink-0">
              SLA TIMER RUNNING
            </span>
          </div>
        )}

        {/* Action Buttons Row (Escalations available for ALL severity cases) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Left Group: ESCALATION OPTIONS (USER REQUIREMENT - Included for all severities) */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-bold mr-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>Escalate:</span>
            </span>

            {/* 1. Escalate to Client Team */}
            <button
              type="button"
              onClick={handleOpenEscalateToClient}
              className="px-3.5 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm hover:shadow-cyan-950/50"
              title="Escalate alert to client security operations or account leadership (Available for all severities)"
            >
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Escalate to Client Team</span>
            </button>

            {/* 2. Escalate to T3 / SME */}
            <button
              type="button"
              onClick={handleOpenEscalateToT3}
              className="px-3.5 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/50 text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm hover:shadow-indigo-950/50"
              title="Escalate alert to Tier 3 advanced threat hunter or senior forensics SME (Available for all severities)"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
              <span>Escalate to T3 \ SME</span>
            </button>
          </div>

          {/* Right Group: Operational Actions (Claim, Tuning, Close) */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Claim Alert */}
            {onClaimAlert && alert.status !== 'Closed' && (
              <button
                type="button"
                onClick={() => onClaimAlert(alert.id)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40 transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Claim Alert</span>
              </button>
            )}

            {/* Send to Tuning */}
            {onSendToTuning && !alert.tuningFlagged && (
              <button
                type="button"
                onClick={() => onSendToTuning(alert.id, 'High benign duplicate pattern flagged in AI triage')}
                className="px-3.5 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Flag this detection rule to the Rule Tuning Engine to suppress noisy benign duplicates"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Send to Tuning</span>
              </button>
            )}

            {/* Close as Benign */}
            {onCloseAlert && alert.status !== 'Closed' && (
              <button
                type="button"
                onClick={() => onCloseAlert(alert.id, 'Benign', 'Closed as legitimate benign system activity during AI triage')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700 active:scale-95"
                title="Close alert as verified benign activity"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Close as Benign</span>
              </button>
            )}

            {/* Close as False Positive */}
            {onCloseAlert && alert.status !== 'Closed' && (
              <button
                type="button"
                onClick={() => onCloseAlert(alert.id, 'False Positive', 'Closed as false positive; detection threshold exceeded for normal baseline')}
                className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Close alert as false positive"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Close as False Positive</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE ALERT ESCALATION MODAL FORM                                   */}
      {/* ========================================================================= */}
      {isEscalateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
                    escalateTarget === 'Client Team'
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  }`}
                >
                  {escalateTarget === 'Client Team' ? (
                    <Building2 className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">
                      Alert Escalation Action Form
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {getAlertTicketNumber(alert)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        alert.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300'
                          : alert.severity === 'High'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Handoff escalation active across all severities • Multi-tier incident dispatch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEscalateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Escalation Target Selector Tabs */}
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => {
                  setEscalateTarget('Client Team');
                  setEscalateRecipient(
                    `${alert.client.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-secops@${alert.client.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.internal`
                  );
                  setEscalateActionRequired('Identity Verification & Incident Confirmation');
                }}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  escalateTarget === 'Client Team'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>1. Escalate to Client Team</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEscalateTarget('T3 / SME');
                  setEscalateRecipient('Tier 3 Advanced Threat Hunter & Senior Forensics SME Lead');
                  setEscalateActionRequired('Deep Memory Forensics & Reverse Engineering');
                }}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  escalateTarget === 'T3 / SME'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>2. Escalate to T3 \ SME</span>
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              {/* Target Recipient */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    {escalateTarget === 'Client Team'
                      ? `Client Recipient / Point of Contact (${alert.client})`
                      : 'Assigned Tier 3 / SME Specialist'}
                  </label>
                  <span className="text-[10px] font-mono text-cyan-400">Target Assigned</span>
                </div>
                <input
                  type="text"
                  value={escalateRecipient}
                  onChange={(e) => setEscalateRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono outline-none focus:border-cyan-500"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-500">Quick Presets:</span>
                  {escalateTarget === 'Client Team' ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setEscalateRecipient(
                            `primary-soc@${alert.client.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.internal`
                          )
                        }
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono border border-slate-700 cursor-pointer"
                      >
                        Client SecOps Lead
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEscalateRecipient(
                            `iam-admin@${alert.client.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.internal`
                          )
                        }
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono border border-slate-700 cursor-pointer"
                      >
                        IT Identity Admin
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEscalateRecipient(
                            `ciso-incident@${alert.client.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.internal`
                          )
                        }
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono border border-slate-700 cursor-pointer"
                      >
                        CISO Notification Desk
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEscalateRecipient('T3 Advanced Threat Hunter (SME)')}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono border border-slate-700 cursor-pointer"
                      >
                        T3 Threat Hunter
                      </button>
                      <button
                        type="button"
                        onClick={() => setEscalateRecipient('Senior Malware Reverse Engineer (SME)')}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono border border-slate-700 cursor-pointer"
                      >
                        Malware Reverse Engineer
                      </button>
                      <button
                        type="button"
                        onClick={() => setEscalateRecipient('Cloud IR Forensics Specialist (SME)')}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono border border-slate-700 cursor-pointer"
                      >
                        Cloud IR Specialist
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Urgency & Required Action in two columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Urgency Level */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Escalation Urgency</label>
                  <select
                    value={escalateUrgency}
                    onChange={(e) => setEscalateUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-semibold outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="Emergency">⚡ Emergency P1 (15m Response SLA)</option>
                    <option value="High">⚠️ High Priority (1h Response SLA)</option>
                    <option value="Standard">📋 Standard Priority (4h Response SLA)</option>
                  </select>
                </div>

                {/* Action Required */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Required Action</label>
                  <select
                    value={escalateActionRequired}
                    onChange={(e) => setEscalateActionRequired(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-semibold outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {escalateTarget === 'Client Team' ? (
                      <>
                        <option value="Identity Verification & Incident Confirmation">Identity Verification & Incident Confirmation</option>
                        <option value="Host Quarantine & Endpoint Isolation Request">Host Quarantine & Endpoint Isolation Request</option>
                        <option value="Credential Revocation & Password Reset">Credential Revocation & Password Reset</option>
                        <option value="Executive Briefing & Client Notification">Executive Briefing & Client Notification</option>
                      </>
                    ) : (
                      <>
                        <option value="Deep Memory Forensics & Reverse Engineering">Deep Memory Forensics & Reverse Engineering</option>
                        <option value="Advanced Attack Tree & Lateral Movement Trace">Advanced Attack Tree & Lateral Movement Trace</option>
                        <option value="Malware C2 Infrastructure Attribution">Malware C2 Infrastructure Attribution</option>
                        <option value="Custom Detection Signature Authoring">Custom Detection Signature Authoring</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Detailed Investigation Notes & Handoff Summary */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Investigation Notes &amp; Handoff Brief
                </label>
                <textarea
                  rows={4}
                  value={escalateNotes}
                  onChange={(e) => setEscalateNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 font-mono text-[11px] outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] font-mono text-slate-400">
                Audited by {currentAnalystName || 'Shift 1 Analyst'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEscalateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEscalation}
                  disabled={isSubmittingEscalation}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50 ${
                    escalateTarget === 'Client Team'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                  }`}
                >
                  {isSubmittingEscalation ? (
                    <span>Dispatching...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Dispatch Escalation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
