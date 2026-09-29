import React, { useState } from 'react';
import {
  Sliders,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Check,
  Search,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Layers,
  Cpu,
  RefreshCw,
  Eye,
  Plus,
  X,
  ShieldAlert,
  Flame,
  Users2,
  FileCode,
  ShieldCheck,
  Send,
  Building2,
  Clock,
  Terminal,
} from 'lucide-react';
import { DetectionRuleFatigue, SecurityPlatform, Alert } from '../types/soc';
import { getAlertTicketNumber, getAlertCaseNumber } from '../utils/ticketUtils';

interface AnalystTuningSubmission {
  id: string;
  ticketNumber: string;
  caseNumber: string;
  title: string;
  client: string;
  source_platform: SecurityPlatform;
  severity: string;
  submittedBy: string;
  submittedTimestamp: string;
  reason: string;
  suggestedFilter: string;
  status: 'Under Review' | 'Tuning Rule Active' | 'Suppressed at Ingestion';
  dailyNoiseReduction: number;
}

interface RuleTuningDashboardProps {
  detectionRules: DetectionRuleFatigue[];
  onApplyRuleTuning: (ruleId: string) => void;
  flaggedAlerts?: Alert[];
  onSelectClient?: (clientId: string) => void;
  onShowToast?: (msg: string) => void;
}

export const RuleTuningDashboard: React.FC<RuleTuningDashboardProps> = ({
  detectionRules,
  onApplyRuleTuning,
  flaggedAlerts = [],
  onSelectClient,
  onShowToast,
}) => {
  // Main view tab: Detection Rules vs Manual / Analyst-Submitted Alerts
  const [activeViewTab, setActiveViewTab] = useState<'rules-engine' | 'analyst-submitted'>('rules-engine');

  // Rules Engine Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs-tuning' | 'tuned'>('all');

  // Analyst Submissions Filters
  const [submissionPlatformFilter, setSubmissionPlatformFilter] = useState<string>('all');
  const [submissionSearch, setSubmissionSearch] = useState<string>('');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'all' | 'active' | 'deployed'>('all');

  // Add rule modal
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [customRuleName, setCustomRuleName] = useState('');
  const [customRulePlatform, setCustomRulePlatform] = useState<SecurityPlatform>('CrowdStrike');
  const [customRuleQuery, setCustomRuleQuery] = useState('event_type == "SUSPICIOUS_SCRIPT" && ip != "10.0.0.1"');

  // Interactive toggle to show duplicate suppressed cases below the page
  const [showDuplicatesSuppressedCases, setShowDuplicatesSuppressedCases] = useState(false);

  // Local state for analyst submissions to support interactive tuning activation
  const [deployedSubmissionIds, setDeployedSubmissionIds] = useState<Set<string>>(new Set());

  // Default analyst submissions representing live shift tickets submitted for rule tuning (Case numbers only, no 2026)
  const defaultSubmissions: AnalystTuningSubmission[] = [
    {
      id: 'sub-101',
      ticketNumber: 'CASE-1094',
      caseNumber: 'CASE-1094',
      title: 'Exchange Online Automated Archiving Script Flagged as Exfiltration Rule',
      client: 'Apex Financial Group',
      source_platform: 'Splunk',
      severity: 'Medium',
      submittedBy: 'David Sterling (Tier 2 Incident Responder)',
      submittedTimestamp: '14:48 UTC (Today)',
      reason: 'Scheduled weekly compliance retention bot runs from IP 10.240.12.8; generates duplicate alerts every Tuesday.',
      suggestedFilter: 'SPL: index=o365_audit RuleName="AutoArchive" src_ip="10.240.12.8" | where NOT user="svc-compliance-archive@apexfin.internal"',
      status: 'Under Review',
      dailyNoiseReduction: 42,
    },
    {
      id: 'sub-102',
      ticketNumber: 'CASE-1095',
      caseNumber: 'CASE-1095',
      title: 'Perimeter Port Scan Probes on DMZ Web Subnet',
      client: 'AeroTech Defense Corp',
      source_platform: 'Zscaler',
      severity: 'Low',
      submittedBy: 'Elena Rostova (Tier 3 Threat Hunter)',
      submittedTimestamp: '14:25 UTC (Today)',
      reason: 'Internet background scanner TCP SYN sweeps dropped by edge firewall. Rule triggers alerts on dropped traffic.',
      suggestedFilter: 'Sigma: action="drop" AND destination.port IN (443, 8443, 8080) -> Suppress Alert Generation',
      status: 'Under Review',
      dailyNoiseReduction: 128,
    },
    {
      id: 'sub-103',
      ticketNumber: 'CASE-1082',
      caseNumber: 'CASE-1082',
      title: 'Rapid DNS Resolution to Known Akamai CDN Edges',
      client: 'Nexus Health Systems',
      source_platform: 'Google SecOps',
      severity: 'Low',
      submittedBy: 'Marcus Vance (Tier 1 Triage)',
      submittedTimestamp: '13:52 UTC (Today)',
      reason: 'High frequency DNS lookups to *.akamaiedge.net by EHR patient portal frontend servers during shift handover.',
      suggestedFilter: 'YARA-L: $e.target.hostname = /.*\\.akamaiedge\\.net$/ AND $e.principal.hostname = /.*-EHR-APP-.*/ => condition: false',
      status: 'Under Review',
      dailyNoiseReduction: 76,
    },
  ];

  // Dynamic submissions from user flagged alerts
  const userSubmissions: AnalystTuningSubmission[] = flaggedAlerts.map((alert) => ({
    id: `flagged-${alert.id}`,
    ticketNumber: getAlertTicketNumber(alert),
    caseNumber: getAlertCaseNumber(alert),
    title: alert.title,
    client: alert.client,
    source_platform: alert.source_platform,
    severity: alert.severity,
    submittedBy: alert.assignedTo || 'SOC Analyst (Shift 1)',
    submittedTimestamp: alert.timestamp || 'Recent',
    reason: alert.tuningReason || 'Analyst flagged as high-noise false positive / duplicate candidate from AI Triage Dossier',
    suggestedFilter: `ADD_SUPPRESSION: platform == "${alert.source_platform}" AND rule.name == "${alert.title}" AND client == "${alert.client}"`,
    status: deployedSubmissionIds.has(`flagged-${alert.id}`) ? 'Tuning Rule Active' : 'Under Review',
    dailyNoiseReduction: 38,
  }));

  // Combine default submissions with user flagged alerts (deduplicating by ticket/id)
  const allSubmissions = [
    ...userSubmissions,
    ...defaultSubmissions.filter((ds) => !userSubmissions.some((us) => us.ticketNumber === ds.ticketNumber)),
  ].map((sub) => ({
    ...sub,
    status: deployedSubmissionIds.has(sub.id)
      ? ('Tuning Rule Active' as const)
      : sub.status,
  }));

  // Filtered submissions
  const filteredSubmissions = allSubmissions.filter((sub) => {
    if (submissionPlatformFilter !== 'all' && sub.source_platform !== submissionPlatformFilter) return false;
    if (submissionStatusFilter === 'active' && sub.status !== 'Under Review') return false;
    if (submissionStatusFilter === 'deployed' && sub.status === 'Under Review') return false;
    if (submissionSearch) {
      const q = submissionSearch.toLowerCase();
      const matchTicket = sub.ticketNumber.toLowerCase().includes(q);
      const matchTitle = sub.title.toLowerCase().includes(q);
      const matchClient = sub.client.toLowerCase().includes(q);
      const matchAnalyst = sub.submittedBy.toLowerCase().includes(q);
      const matchPlatform = sub.source_platform.toLowerCase().includes(q);
      if (!matchTicket && !matchTitle && !matchClient && !matchAnalyst && !matchPlatform) return false;
    }
    return true;
  });

  const filteredRules = detectionRules.filter((rule) => {
    if (platformFilter !== 'all' && rule.platform !== platformFilter) return false;
    if (statusFilter === 'needs-tuning' && rule.tuningApplied) return false;
    if (statusFilter === 'tuned' && !rule.tuningApplied) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = rule.ruleId.toLowerCase().includes(q);
      const matchName = (rule.ruleName || rule.name || '').toLowerCase().includes(q);
      const matchPlatform = rule.platform.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchPlatform) return false;
    }
    return true;
  });

  const totalMonitoredAlerts = detectionRules.reduce((acc, r) => acc + r.totalAlerts24h, 0);
  const totalDuplicatesSuppressed = detectionRules.reduce((acc, r) => acc + (r.tuningApplied ? r.duplicates : 0), 0);
  const totalTunedCount = detectionRules.filter((r) => r.tuningApplied).length;

  const handleApplyTuning = (ruleId: string) => {
    onApplyRuleTuning(ruleId);
    if (onShowToast) {
      onShowToast('Rule tuning filter applied. Suppressing benign duplicates at ingestion layer.');
    }
  };

  const handleDeployAnalystSubmission = (submission: AnalystTuningSubmission) => {
    setDeployedSubmissionIds((prev) => new Set([...prev, submission.id]));
    if (onShowToast) {
      onShowToast(`Suppression filter deployed for [${submission.ticketNumber}] across ${submission.source_platform} sensors. Noise reduced.`);
    }
  };

  const handleCreateCustomRule = () => {
    if (!customRuleName) return;
    setIsAddRuleModalOpen(false);
    if (onShowToast) {
      onShowToast(`Custom suppression rule "${customRuleName}" deployed across ${customRulePlatform} sensors.`);
    }
  };

  const duplicateSuppressedCases = [
    {
      caseNumber: 'CASE-1095',
      title: 'Perimeter Port Scan Probes on DMZ Web Subnet (Dropped by Firewall)',
      ruleName: 'Edge Firewall: Low-Reputation IP Scan Sweeps',
      sourcePlatform: 'Zscaler',
      client: 'AeroTech Defense Corp',
      duplicateCount: 128,
      suppressedTimestamp: '14:52 UTC (Just now)',
      suppressionLogic: 'action=="drop" AND destination.port IN (443, 8443, 8080) -> Ingestion Silenced',
      analystHoursSaved: '4.2 hrs',
      costAvoided: '$357.00',
    },
    {
      caseNumber: 'CASE-1082',
      title: 'High-Frequency Akamai CDN Edge DNS Resolution Bursts',
      ruleName: 'SecOps: DNS Rapid Query Anomaly',
      sourcePlatform: 'Google SecOps',
      client: 'Nexus Health Systems',
      duplicateCount: 76,
      suppressedTimestamp: '14:45 UTC',
      suppressionLogic: '$e.target.hostname = /.*\\.akamaiedge\\.net$/ AND EHR-APP -> Suppress',
      analystHoursSaved: '2.5 hrs',
      costAvoided: '$212.50',
    },
    {
      caseNumber: 'CASE-1094',
      title: 'Exchange Online Automated Archiving Script Trigger',
      ruleName: 'O365: Massive Mailbox Item Transfer',
      sourcePlatform: 'Splunk',
      client: 'Apex Financial Group',
      duplicateCount: 42,
      suppressedTimestamp: '14:38 UTC',
      suppressionLogic: 'src_ip="10.240.12.8" AND user="svc-compliance-archive" -> Bypass Alert',
      analystHoursSaved: '1.8 hrs',
      costAvoided: '$153.00',
    },
    {
      caseNumber: 'CASE-1077',
      title: 'Qualys Scheduled Vulnerability Scanner IP Range Sweep',
      ruleName: 'CrowdStrike: Suspicious Network Connection from Scanner',
      sourcePlatform: 'CrowdStrike',
      client: 'AeroTech Defense Corp',
      duplicateCount: 94,
      suppressedTimestamp: '14:15 UTC',
      suppressionLogic: 'src_ip IN (10.50.99.0/24) AND process_name=="qualys-agent" -> Filtered',
      analystHoursSaved: '3.1 hrs',
      costAvoided: '$263.50',
    },
    {
      caseNumber: 'CASE-1065',
      title: 'Kubernetes Internal Healthcheck Liveness Probe Failover',
      ruleName: 'Google SecOps: HTTP 500 Spike on Internal Service',
      sourcePlatform: 'Google SecOps',
      client: 'Nexus Health Systems',
      duplicateCount: 62,
      suppressedTimestamp: '13:58 UTC',
      suppressionLogic: 'request_path=="/healthz" AND user_agent=="kube-probe/*" -> Silenced',
      analystHoursSaved: '2.0 hrs',
      costAvoided: '$170.00',
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/70 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/50 shrink-0">
              <Sliders className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Alert Fatigue Detection &amp; Rule Tuning Engine
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  INSTITUTIONAL QUALITY: 88.2%
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Automated detection fatigue mitigation: identifies noisy detection rules with high benign ratios and duplicate volumes to protect analyst attention.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddRuleModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-all border border-amber-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Suppression Filter</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">Total Monitored 24h Alerts</div>
            <div className="text-2xl font-mono font-bold text-white mt-1">
              {totalMonitoredAlerts.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Across {detectionRules.length} core rules</div>
          </div>

          <div
            onClick={() => setShowDuplicatesSuppressedCases((prev) => !prev)}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all hover:scale-[1.02] group"
            title="Click to show/hide duplicate suppressed cases below the page"
          >
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-between">
              <span>Duplicates Suppressed</span>
              <span className="text-[10px] text-emerald-300 font-mono underline">
                {showDuplicatesSuppressedCases ? 'Hide Cases ▲' : 'View Cases ▼'}
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
              {totalDuplicatesSuppressed > 0 ? totalDuplicatesSuppressed.toLocaleString() : '8,420'}
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">Click to view suppressed duplicate cases ↗</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-cyan-300 font-semibold">Rule Tuning Applied</div>
            <div className="text-2xl font-mono font-bold text-cyan-300 mt-1">
              {totalTunedCount} / {detectionRules.length}
            </div>
            <div className="text-[10px] text-cyan-400/80 mt-0.5">Active automated suppression filters</div>
          </div>

          <div
            onClick={() => setActiveViewTab('analyst-submitted')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all hover:scale-[1.02] group"
            title="Click to view all cases/tickets submitted for tuning"
          >
            <div className="text-[11px] text-amber-300 font-semibold flex items-center justify-between">
              <span>Analyst-Submitted for Tuning</span>
              <span className="text-[10px] text-amber-300 font-mono underline">View Cases →</span>
            </div>
            <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
              {allSubmissions.length} Cases
            </div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Click to view submitted cases ↗</div>
          </div>
        </div>

        {/* Tab Switcher: Detection Rules Engine vs Analyst-Submitted Alerts for Tuning */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveViewTab('rules-engine')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'rules-engine'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Detection Rules &amp; Fatigue Engine ({detectionRules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('analyst-submitted')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer relative ${
              activeViewTab === 'analyst-submitted'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Manual / Analyst-Submitted Alerts for Tuning</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
              {allSubmissions.length} Requests
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE STREAM: DUPLICATE SUPPRESSED CASES (User Requirement)         */}
      {/* ========================================================================= */}
      {showDuplicatesSuppressedCases && (
        <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Ingestion Layer: Suppressed Duplicate Cases &amp; Noise Signals
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    8,420 EVENTS COLLAPSED
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  High-frequency repeated benign triggers and internet background scans filtered before reaching human queues.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDuplicatesSuppressedCases(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
            >
              Hide Stream ✕
            </button>
          </div>

          {/* Table of Suppressed Cases */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800 uppercase">
                  <th className="py-2.5 px-3">Case Number</th>
                  <th className="py-2.5 px-3">Triggering Alert Title</th>
                  <th className="py-2.5 px-3">Sensor Platform</th>
                  <th className="py-2.5 px-3">Client Pod</th>
                  <th className="py-2.5 px-3 text-right">Duplicate Events</th>
                  <th className="py-2.5 px-3">Suppression Logic</th>
                  <th className="py-2.5 px-3 text-right">Analyst Effort Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {duplicateSuppressedCases.map((item) => (
                  <tr key={item.caseNumber} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold">
                        {item.caseNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans font-medium text-white max-w-xs">
                      {item.title}
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.suppressedTimestamp}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{item.sourcePlatform}</td>
                    <td className="py-3 px-3 font-sans text-slate-300">{item.client}</td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold tabular-nums">
                      {item.duplicateCount} repeats
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-cyan-300 max-w-xs truncate" title={item.suppressionLogic}>
                      {item.suppressionLogic}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 tabular-nums">
                      <strong>{item.costAvoided}</strong>
                      <div className="text-[10px] text-slate-500">{item.analystHoursSaved}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DETECTION RULES & FATIGUE ENGINE                                    */}
      {/* ========================================================================= */}
      {activeViewTab === 'rules-engine' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Controls: Search, Platform Filter, Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search rule ID, name or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full"
                />
              </div>

              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">All Platforms</option>
                <option value="Google SecOps">Google SecOps</option>
                <option value="Splunk">Splunk</option>
                <option value="CrowdStrike">CrowdStrike</option>
                <option value="Microsoft Defender">Microsoft Defender</option>
                <option value="Zscaler">Zscaler</option>
              </select>

              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                  }`}
                >
                  All Rules ({detectionRules.length})
                </button>
                <button
                  onClick={() => setStatusFilter('needs-tuning')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === 'needs-tuning' ? 'bg-amber-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Needs Tuning
                </button>
                <button
                  onClick={() => setStatusFilter('tuned')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === 'tuned' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Tuned &amp; Suppressed
                </button>
              </div>
            </div>

            <span className="text-slate-400 font-mono text-[11px]">
              Showing {filteredRules.length} Detection Rules
            </span>
          </div>

          {/* Rules Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((rule) => {
              const benignPct = Math.round((rule.benignClosed / rule.totalAlerts24h) * 100);
              const duplicatePct = Math.round((rule.duplicates / rule.totalAlerts24h) * 100);
              const tpPct = Math.round((rule.truePositives / rule.totalAlerts24h) * 100);

              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl bg-slate-950 border transition-all space-y-3.5 ${
                    rule.tuningApplied
                      ? 'border-emerald-500/40 shadow-sm'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Header: Platform, Rule ID, Severity, Author */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                          {rule.platform}
                        </span>
                        <span className="text-xs font-mono text-slate-400 font-bold">{rule.ruleId}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{rule.ruleName || rule.name}</h4>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                        rule.tuningApplied
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {rule.tuningApplied ? 'Tuning Active' : 'High Noise Warning'}
                    </span>
                  </div>

                  {/* Volume & Noise Distribution */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Total 24h Volume:</span>
                      <span className="text-white font-bold">{rule.totalAlerts24h.toLocaleString()} alerts</span>
                    </div>

                    {/* Tri-color Stacked Ratio Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${benignPct}%` }}
                        className="bg-slate-600 transition-all"
                        title={`Benign: ${rule.benignClosed} (${benignPct}%)`}
                      />
                      <div
                        style={{ width: `${duplicatePct}%` }}
                        className="bg-amber-500 transition-all"
                        title={`Duplicates: ${rule.duplicates} (${duplicatePct}%)`}
                      />
                      <div
                        style={{ width: `${tpPct}%` }}
                        className="bg-emerald-400 transition-all"
                        title={`True Positives: ${rule.truePositives} (${tpPct}%)`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Benign: {benignPct}%</span>
                      <span className="text-amber-400 font-semibold">Duplicates: {duplicatePct}%</span>
                      <span className="text-emerald-400 font-bold">True Positives: {tpPct}%</span>
                    </div>
                  </div>

                  {/* Suppression & Tuning Strategy */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Suppression &amp; Tuning Strategy:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{rule.aiRecommendation}</p>

                    <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-cyan-300 border border-slate-800 overflow-x-auto">
                      {rule.suggestedTuning}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                    {rule.tuningApplied ? (
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Suppression Filter Active (Noise Suppressed)</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyTuning(rule.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Deploy Suppression Rule</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MANUAL / ANALYST-SUBMITTED ALERTS FOR TUNING                       */}
      {/* ========================================================================= */}
      {activeViewTab === 'analyst-submitted' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Submissions Header & Quick Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative min-w-[260px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ticket, title, client, or analyst..."
                  value={submissionSearch}
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full"
                />
              </div>

              <select
                value={submissionPlatformFilter}
                onChange={(e) => setSubmissionPlatformFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">All Security Platforms</option>
                <option value="CrowdStrike">CrowdStrike Falcon</option>
                <option value="Splunk">Splunk ES</option>
                <option value="Google SecOps">Google SecOps</option>
                <option value="Microsoft Defender">Microsoft Defender</option>
                <option value="Zscaler">Zscaler Zero Trust</option>
              </select>

              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setSubmissionStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    submissionStatusFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                  }`}
                >
                  All Requests ({allSubmissions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionStatusFilter('active')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    submissionStatusFilter === 'active' ? 'bg-amber-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Under Review
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionStatusFilter('deployed')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    submissionStatusFilter === 'deployed' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Tuning Deployed
                </button>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono text-slate-400">
              <span>{filteredSubmissions.length} Requests Displayed</span>
            </div>
          </div>

          {/* List of Analyst-Submitted Alerts */}
          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 space-y-2">
              <Sliders className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="font-semibold text-white">No Analyst Tuning Requests Match Current Filters</div>
              <p className="text-xs max-w-md mx-auto">
                Analysts can flag any alert for tuning directly inside the Executive AI Triage report using the "Send to Rule Tuning" button.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSubmissions.map((sub) => {
                const isDeployed = sub.status === 'Tuning Rule Active' || deployedSubmissionIds.has(sub.id);

                return (
                  <div
                    key={sub.id}
                    className={`bg-slate-900 border rounded-2xl p-5 shadow-lg space-y-4 transition-all ${
                      isDeployed
                        ? 'border-emerald-500/40 shadow-emerald-950/20'
                        : 'border-amber-500/40 shadow-amber-950/20'
                    }`}
                  >
                    {/* Top Row: Ticket numbers, Client, Platform, Severity, Status */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                          <span className="px-2 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm">
                            {sub.ticketNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            {sub.caseNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {sub.source_platform}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-bold uppercase ${
                              sub.severity === 'Critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : sub.severity === 'High'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {sub.severity}
                          </span>
                          <span className="text-slate-400 flex items-center gap-1 font-sans">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <strong>{sub.client}</strong>
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white mt-2">{sub.title}</h3>
                      </div>

                      {/* Status Badge */}
                      <div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border shadow-sm ${
                            isDeployed
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                          }`}
                        >
                          {isDeployed ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Tuning Rule Active</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Under Review by SOC Engineering</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Submitter & Justification */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" />
                            <span>Analyst Submission Justification:</span>
                          </span>
                          <span>{sub.submittedTimestamp}</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed font-medium mt-1">
                          "{sub.reason}"
                        </p>
                        <div className="text-[10px] text-slate-400 font-mono pt-1">
                          Submitted by: <strong className="text-slate-300">{sub.submittedBy}</strong>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <div className="text-[11px] text-cyan-400 font-mono font-semibold flex items-center gap-1">
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Generated Suppression Logic (Sensor Deployment):</span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 text-cyan-300 font-mono text-[11px] border border-slate-800 overflow-x-auto select-all">
                          {sub.suggestedFilter}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 pt-0.5">
                          <span>Estimated Noise Suppression: ~{sub.dailyNoiseReduction} alerts/day</span>
                          <span>Analyst Time Saved: ~4.2 hrs/week</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Exclusion scope: Client {sub.client} • Zero impact on true-positive detection</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDeployed ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-xs bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800">
                            <Check className="w-4 h-4" />
                            <span>Suppression Rule Enforced at Ingestion</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeployAnalystSubmission(sub)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer transition-all active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Deploy Suppression Rule</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Custom Suppression Filter Modal */}
      {isAddRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Create Custom Noise Suppression Rule</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRuleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Filter / Rule Title:</label>
                <input
                  type="text"
                  value={customRuleName}
                  onChange={(e) => setCustomRuleName(e.target.value)}
                  placeholder="e.g. Suppress Vulnerability Scanner Rapid Heartbeats"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Platform:</label>
                <select
                  value={customRulePlatform}
                  onChange={(e) => setCustomRulePlatform(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="CrowdStrike">CrowdStrike Falcon</option>
                  <option value="Splunk">Splunk Enterprise Security</option>
                  <option value="Google SecOps">Google SecOps</option>
                  <option value="Microsoft Defender">Microsoft Defender</option>
                  <option value="Zscaler">Zscaler</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Suppression Logic (SPL / YARA-L / Sigma):</label>
                <textarea
                  rows={3}
                  value={customRuleQuery}
                  onChange={(e) => setCustomRuleQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddRuleModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomRule}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Deploy Suppression Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
