import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Bot,
  AlertTriangle,
  Zap,
  TrendingDown,
  Building2,
  Clock,
  Layers,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Search,
  Filter,
  Check,
  ExternalLink,
  Activity,
  Radio,
  Timer,
  Gauge,
  Sparkles,
  Users,
  Users2,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  UserCheck,
  ChevronRight,
  Shield,
  Briefcase,
  History,
  Sliders,
  X,
} from 'lucide-react';
import { Client, Alert, SeverityLevel, SecurityPlatform, Analyst } from '../types/soc';
import { ExecutiveAiTriageSummary } from './ExecutiveAiTriageSummary';
import { getAnalystDisplayName } from '../utils/analystUtils';
import { getCorrelatedAndHistoricalAlerts } from '../utils/historicalAlertUtils';
import { getAlertTicketNumber, getAlertCaseNumber, getCaseCostAndTimeSavings } from '../utils/ticketUtils';

import { DrilldownFilterContext } from './DrilldownResultsModal';

interface CommandCenterProps {
  clients: Client[];
  alerts: Alert[];
  analysts?: Analyst[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  onNavigateToInvestigation: (incidentId?: string) => void;
  onClaimAlert: (alertId: string) => void;
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
  onOpenDrilldown?: (context: DrilldownFilterContext) => void;
  currentAnalystName: string;
  onNavigateToTab?: (tab: string) => void;
  onSelectAnalystPerspective?: (analystId: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  clients,
  alerts,
  analysts = [],
  selectedClientId,
  onSelectClient,
  onNavigateToInvestigation,
  onClaimAlert,
  onSendToTuning,
  onCloseAlert,
  onEscalateAlert,
  onOpenDrilldown,
  currentAnalystName,
  onNavigateToTab,
  onSelectAnalystPerspective,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAlertForReport, setSelectedAlertForReport] = useState<Alert | null>(null);
  const [selectedAnalystForModal, setSelectedAnalystForModal] = useState<Analyst | null>(null);
  const [slaRiskOnly, setSlaRiskOnly] = useState<boolean>(false);
  const [fusionAiOnly, setFusionAiOnly] = useState<boolean>(false);

  const scrollToAlerts = () => {
    const el = document.getElementById('unified-alert-stream-table');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter alerts based on client, severity, platform, search, and click-to-filter states
  const filteredAlerts = alerts.filter((alert) => {
    if (selectedClientId !== 'all' && alert.clientId !== selectedClientId) return false;
    if (severityFilter !== 'all' && alert.severity.toLowerCase() !== severityFilter.toLowerCase()) return false;
    if (platformFilter !== 'all' && alert.source_platform !== platformFilter) return false;
    if (slaRiskOnly && !alert.slaRisk) return false;
    if (fusionAiOnly && alert.routedTo !== 'FusionAI') return false;
    if (
      searchQuery &&
      !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.assignedTo.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalAlertsCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === 'Critical').length;
  const highCount = alerts.filter((a) => a.severity === 'High').length;
  const slaRiskCount = alerts.filter((a) => a.slaRisk).length;
  const fusionAiTriagedCount = alerts.filter((a) => a.routedTo === 'FusionAI').length;

  // Selected client context for KPI ribbon
  const activeClient = clients.find((c) => c.id === selectedClientId);
  const scopeClientName = selectedClientId === 'all' ? 'Enterprise-Wide (All 3 Clients)' : (activeClient?.name || 'Selected Client');

  // Workload-based dynamic operational KPI calculations
  const clientAlerts = selectedClientId === 'all' 
    ? alerts 
    : alerts.filter((a) => a.clientId === selectedClientId);

  const scopeTotalAlerts = clientAlerts.length;
  const scopeFusionAiAlerts = clientAlerts.filter((a) => a.routedTo === 'FusionAI').length;
  const scopeHighCritical = clientAlerts.filter((a) => a.severity === 'High' || a.severity === 'Critical').length;
  const scopeSlaRisks = clientAlerts.filter((a) => a.slaRisk).length;

  // Automation rate based on alerts routed to FusionAI & automated correlation
  const automationRateNum = scopeTotalAlerts > 0 
    ? Math.round((scopeFusionAiAlerts / scopeTotalAlerts) * 1000) / 10
    : 71.4;
  const automationRate = automationRateNum.toFixed(1);

  // MTTI calculation: FusionAI auto-acknowledged/triaged alerts take avg 0.8 min, human alerts take avg 22.4 min
  const dynamicMttiNum = scopeTotalAlerts > 0
    ? Math.round(((scopeFusionAiAlerts * 0.8 + (scopeTotalAlerts - scopeFusionAiAlerts) * 22.4) / scopeTotalAlerts) * 10) / 10
    : 11.4;
  const dynamicMtti = dynamicMttiNum.toFixed(1);
  const mttiBaseline = 48.0;
  const mttiImprovement = Math.round(((mttiBaseline - dynamicMttiNum) / mttiBaseline) * 100);

  // MTTR calculation: Automated triage + gated SOAR playbooks reduces MTTR from 92.0 min baseline
  const dynamicMttrNum = scopeTotalAlerts > 0
    ? Math.round(((scopeFusionAiAlerts * 4.8 + (scopeTotalAlerts - scopeFusionAiAlerts) * 42.5) / scopeTotalAlerts) * 10) / 10
    : 24.2;
  const dynamicMttr = dynamicMttrNum.toFixed(1);
  const mttrBaseline = 92.0;
  const mttrImprovement = Math.round(((mttrBaseline - dynamicMttrNum) / mttrBaseline) * 100);

  // Estimated analyst investigation hours saved in current shift
  const estimatedHoursSaved = ((scopeFusionAiAlerts * 38) / 60).toFixed(1);

  const platforms: { name: SecurityPlatform; status: string; count: number }[] = [
    { name: 'Google SecOps', status: 'Connected', count: 184 },
    { name: 'Splunk', status: 'Connected', count: 142 },
    { name: 'Exabeam', status: 'Connected', count: 96 },
    { name: 'CrowdStrike', status: 'Sensor Live', count: 112 },
    { name: 'Microsoft Defender', status: 'Graph API', count: 88 },
    { name: 'Zscaler', status: 'NSS Stream', count: 64 },
    { name: 'ServiceNow', status: 'ITSM Sync', count: 32 },
    { name: 'Swimlane', status: 'SOAR Active', count: 26 },
  ];

  // Shift & Analyst Workload Calculations for Shift 1 (Alpha)
  const shift1HumanAnalysts = analysts.filter((a) => !a.isAiInvestigator);
  const totalShift1HumanCount = shift1HumanAnalysts.length || 9;
  const totalShift1Wip = shift1HumanAnalysts.reduce((acc, curr) => acc + curr.wip, 0) || 172;
  const avgShift1Wip = totalShift1HumanCount > 0 ? (totalShift1Wip / totalShift1HumanCount).toFixed(1) : '9.6';
  const shift1SlaRisks = shift1HumanAnalysts.reduce((acc, curr) => acc + curr.slaRisk, 0);
  const overloadedShift1Count = shift1HumanAnalysts.filter((a) => a.wip >= 14 || a.slaRisk >= 2).length;

  // Client-scoped shift intelligence
  const isClientScoped = selectedClientId !== 'all';
  const activeClientAnalysts = useMemo(() => {
    return analysts.filter(
      (a) => (isClientScoped ? (a.clientId === selectedClientId || a.clientIds?.includes(selectedClientId)) : true) && !a.isAiInvestigator
    );
  }, [analysts, isClientScoped, selectedClientId]);

  const activeClientShiftWip = activeClientAnalysts.reduce((acc, curr) => {
    if (isClientScoped) {
      const clientLoad = curr.clientAlertLoads?.find((l) => l.clientId === selectedClientId);
      return acc + (clientLoad ? clientLoad.alertsPicked : curr.wip);
    }
    return acc + curr.wip;
  }, 0);
  const activeClientAvgWip = activeClientAnalysts.length > 0 ? (activeClientShiftWip / activeClientAnalysts.length).toFixed(1) : '0';
  const activeClientSlaRisks = activeClientAnalysts.reduce((acc, curr) => acc + curr.slaRisk, 0);
  const activeClientOverloadedCount = activeClientAnalysts.filter((a) => a.wip >= 14 || a.slaRisk >= 2).length;

  // Sorting state for dedicated client-wise shift view
  const [clientAnalystSortDir, setClientAnalystSortDir] = useState<'desc' | 'asc'>('desc');
  const clientViewAnalysts = useMemo(() => {
    if (!activeClient) return [];
    return analysts
      .filter((a) => (a.clientId === activeClient.id || a.clientIds?.includes(activeClient.id)) && !a.isAiInvestigator)
      .sort((a, b) => {
        return clientAnalystSortDir === 'desc' ? b.wip - a.wip : a.wip - b.wip;
      });
  }, [analysts, activeClient, clientAnalystSortDir]);

  return (
    <div className="space-y-6">
      {/* Summary KPI Ribbon: Operational Performance Insight */}
      <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-4 shadow-lg shadow-cyan-950/20 backdrop-blur-sm">
        {/* Top ambient highlight line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 opacity-80" />

        {/* Ribbon Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="font-mono text-cyan-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Operational Performance Insight
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-medium">Scope: <span className="text-white font-semibold">{scopeClientName}</span></span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Morning Shift (08:00 - 16:00 UTC) • 9 Analysts Active</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Sparkles className="w-3 h-3" />
              <span>Est. Effort Saved: <strong>~{estimatedHoursSaved} hrs</strong></span>
            </div>
            <div className="text-slate-400 hidden sm:block">
              SLA Compliance: <span className="text-white font-semibold">{((1 - (scopeSlaRisks / (scopeTotalAlerts || 1))) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 3 Core KPI Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* MTTI Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 hover:border-cyan-500/40 rounded-lg p-3.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">MTTI</div>
                  <div className="text-[10px] text-slate-400">Mean Time to Investigate</div>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                Target &lt; 15m
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-3xl font-extrabold font-mono text-cyan-400 tracking-tight">
                {dynamicMtti} <span className="text-sm font-normal text-slate-400">min</span>
              </div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>↓ {mttiImprovement}% vs baseline</span>
              </div>
            </div>

            {/* Visual reduction bar */}
            <div className="mt-2.5">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-cyan-400 rounded-full" 
                  style={{ width: `${Math.min(100, Math.max(10, (dynamicMttiNum / mttiBaseline) * 100))}%` }} 
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                <span>Current: {dynamicMtti}m</span>
                <span className="text-slate-500">Manual Baseline: 48.0m</span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Auto-Ack (&lt;3s): <strong className="text-cyan-300">0.8m</strong></span>
              <span className="text-slate-600">|</span>
              <span>Human In-Depth: <strong className="text-slate-300">22.4m</strong></span>
            </div>
          </div>

          {/* MTTR Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/40 rounded-lg p-3.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">MTTR</div>
                  <div className="text-[10px] text-slate-400">Mean Time to Respond</div>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                Target &lt; 30m
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
                {dynamicMttr} <span className="text-sm font-normal text-slate-400">min</span>
              </div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>↓ {mttrImprovement}% vs baseline</span>
              </div>
            </div>

            {/* Visual reduction bar */}
            <div className="mt-2.5">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-400 rounded-full" 
                  style={{ width: `${Math.min(100, Math.max(10, (dynamicMttrNum / mttrBaseline) * 100))}%` }} 
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                <span>Current: {dynamicMttr}m</span>
                <span className="text-slate-500">Manual Baseline: 92.0m</span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Gated SOAR Approval: <strong className="text-emerald-300">3.8m</strong></span>
              <span className="text-slate-600">|</span>
              <span>Containment: <strong className="text-slate-300">18.2m</strong></span>
            </div>
          </div>

          {/* Automation Rate Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/40 rounded-lg p-3.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Automation Rate</div>
                  <div className="text-[10px] text-slate-400">Autonomous SOC Triage</div>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                {scopeFusionAiAlerts} / {scopeTotalAlerts} Alerts
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-3xl font-extrabold font-mono text-indigo-400 tracking-tight">
                {automationRate}%
              </div>
              <div className="text-xs font-semibold text-cyan-400 flex items-center gap-0.5 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dual-Stream Active</span>
              </div>
            </div>

            {/* Dual-stream ratio bar */}
            <div className="mt-2.5">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-indigo-500 rounded-l-full" 
                  style={{ width: `${Math.min(100, Math.max(5, automationRateNum))}%` }} 
                />
                <div 
                  className="bg-rose-500/70 rounded-r-full" 
                  style={{ width: `${Math.max(0, 100 - automationRateNum)}%` }} 
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                <span className="text-indigo-300">FusionAI: {automationRate}%</span>
                <span className="text-rose-400">Direct Human: {(100 - automationRateNum).toFixed(1)}%</span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Auto-Acknowledged: <strong className="text-indigo-300">{scopeFusionAiAlerts}</strong></span>
              <span className="text-slate-600">|</span>
              <span>Direct Human: <strong className="text-rose-300">{scopeHighCritical}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Adapters Status Ticker */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between overflow-x-auto no-scrollbar gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-medium whitespace-nowrap pl-1">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Vendor-Agnostic Adapters:</span>
        </div>
        <div className="flex items-center gap-3">
          {platforms.map((p) => (
            <div
              key={p.name}
              onClick={() => {
                setPlatformFilter(p.name);
                setSlaRiskOnly(false);
                setFusionAiOnly(false);
                scrollToAlerts();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 whitespace-nowrap cursor-pointer hover:border-cyan-500 hover:text-white transition-all hover:scale-105"
              title={`Click to filter alert stream by ${p.name}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-200">{p.name}</span>
              <span className="text-[10px] text-cyan-400/80 font-mono">({p.status})</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards Row (All Clickable to Filter Values or Open Full Drilldown) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => {
            if (onOpenDrilldown) {
              onOpenDrilldown({
                type: 'all',
                value: 'all',
                label: 'All Ingested Alerts (24h)',
                count: totalAlertsCount,
                subtitle: 'Unified stream across 3 client pods and all telemetry sources',
              });
            } else {
              setSeverityFilter('all');
              setPlatformFilter('all');
              setSlaRiskOnly(false);
              setFusionAiOnly(false);
              scrollToAlerts();
            }
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02] group"
          title="Click to view/drilldown all alerts"
        >
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold group-hover:text-cyan-300 transition-colors">
            Total Alerts (24h)
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 group-hover:text-cyan-400 transition-colors">
            {totalAlertsCount}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <span>↑ 12% • Results View ↗</span>
          </div>
        </div>

        <div
          onClick={() => {
            if (onOpenDrilldown) {
              onOpenDrilldown({
                type: 'severity',
                value: 'Critical',
                label: 'Critical / High Severity Alerts',
                count: criticalCount + highCount,
                subtitle: 'High-priority escalated incident triggers',
              });
            } else {
              setSeverityFilter('critical');
              setSlaRiskOnly(false);
              setFusionAiOnly(false);
              scrollToAlerts();
            }
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm hover:border-rose-500/50 cursor-pointer transition-all hover:scale-[1.02] group"
          title="Click to drilldown into Critical & High alerts"
        >
          <div className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Critical / High
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {criticalCount} <span className="text-slate-500 text-sm">/ {highCount}</span>
          </div>
          <div className="text-[10px] text-rose-400/90 mt-1 font-mono">Drilldown Results ↗</div>
        </div>

        <div
          onClick={() => {
            if (onOpenDrilldown) {
              onOpenDrilldown({
                type: 'status',
                value: 'unclaimed',
                label: 'FusionAI Auto-Triaged Cases',
                count: fusionAiTriagedCount,
                subtitle: 'Low & Medium severity alerts investigated by AI ready for analyst pickup',
              });
            } else {
              setFusionAiOnly(true);
              setSlaRiskOnly(false);
              setSeverityFilter('all');
              scrollToAlerts();
            }
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02] group"
          title="Click to drilldown into FusionAI auto-triaged cases"
        >
          <div className="text-[11px] text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-1">
            <Bot className="w-3.5 h-3.5" />
            FusionAI Auto-Triage
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{fusionAiTriagedCount}</div>
          <div className="text-[10px] text-cyan-300/80 mt-1 font-mono">Drilldown Cases ↗</div>
        </div>

        <div
          onClick={() => {
            if (onOpenDrilldown) {
              onOpenDrilldown({
                type: 'sla-risk',
                value: 'sla-risk',
                label: `SLA Breach Risks (${slaRiskCount} alerts)`,
                count: slaRiskCount,
                subtitle: 'Live Shift cases within <30m of SLA breach deadline across enterprise clients',
              });
            } else {
              setSlaRiskOnly(true);
              setFusionAiOnly(false);
              scrollToAlerts();
            }
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm hover:border-amber-500/50 cursor-pointer transition-all hover:scale-[1.02] group"
          title={`Click to drilldown into SLA breach risks (${slaRiskCount} alerts)`}
        >
          <div className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            SLA Breach Risks
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{slaRiskCount}</div>
          <div className="text-[10px] text-amber-300/80 mt-1 font-mono">Inspect At-Risk ({slaRiskCount} alerts) ↗</div>
        </div>

        <div
          onClick={() => {
            setSeverityFilter('all');
            setPlatformFilter('all');
            setSlaRiskOnly(false);
            setFusionAiOnly(false);
            scrollToAlerts();
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm hover:border-indigo-500/50 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            Cross-Correlation
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">78.4%</div>
          <div className="text-[10px] text-slate-400 mt-1">Automated Multi-Source Link</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            Avg MTTI
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            12m <span className="text-xs text-slate-500 font-normal">(-75%)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Down from 48m baseline</div>
        </div>
      </div>

      {/* Architectural Spotlight: Severity Routing & FusionAI Lifecycle */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3 max-w-3xl">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                FusionAI Autonomous Severity-Based Triage Architecture
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Dual-Stream Engine
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                <strong className="text-cyan-300">Low &amp; Medium alerts</strong> are instantly acknowledged (&lt;3s)
                by <strong className="text-white">FusionAI</strong>, normalized across Google SecOps, Splunk, Exabeam, and EDR,
                and pre-compiled into a comprehensive <strong className="text-cyan-300">Analysis Report</strong>.
                Available human analysts can inspect the report and click <strong className="text-white">"Claim Alert"</strong> to
                take ownership. <strong className="text-rose-300">High &amp; Critical alerts</strong> bypass queue delays
                and are dispatched directly to active human analysts on Shift 1.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToInvestigation('FUS-INC-2026-8841')}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Cpu className="w-4 h-4" />
            <span>Launch Correlated Demo Incident</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Client-Wise SOC Health & Shift Operational Breakdown */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              {isClientScoped ? `Client-Wise Data: ${activeClient?.name}` : 'Client-Wise SOC Health (3 Enterprise Accounts)'}
            </h2>
            {isClientScoped && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Morning Shift Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isClientScoped ? (
              <button
                onClick={() => onSelectClient('all')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer font-medium"
              >
                <span>View All 3 Clients</span>
                <span className="text-slate-400 text-xs">✕</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400">3 Dedicated Analysts Assigned Per Client (Morning Shift)</span>
            )}
          </div>
        </div>

        {/* When a Client is Selected: Show Detailed Client Shift Breakdown & Alert Count Sorter */}
        {isClientScoped && activeClient ? (
          <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-4 shadow-lg shadow-cyan-950/20 space-y-4">
            {/* Client Header Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full ring-2 ring-cyan-500/40"
                  style={{ backgroundColor: activeClient.logoColor }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{activeClient.name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${
                        activeClient.criticality === 'Critical'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {activeClient.criticality}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeClient.industry} • Code: <span className="font-mono text-slate-300">{activeClient.code}</span>
                  </p>
                </div>
              </div>

              {/* Staffing & Alert Count Sorting Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Staffing: <strong className="text-white">{clientViewAnalysts.length} Analysts</strong> Working on Morning Shift
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs">
                  <span className="text-slate-400 text-[11px] px-2 font-medium">Sort Alert Count:</span>
                  <button
                    onClick={() => setClientAnalystSortDir('desc')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      clientAnalystSortDir === 'desc'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowDown className="w-3 h-3 text-cyan-400" />
                    <span>High to Low</span>
                  </button>
                  <button
                    onClick={() => setClientAnalystSortDir('asc')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      clientAnalystSortDir === 'asc'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowUp className="w-3 h-3 text-cyan-400" />
                    <span>Low to High</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Current Shift Analysts Working on this Client */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>
                  Current Shift (Morning Shift) Analysts on Duty for {activeClient.name} ({clientViewAnalysts.length} Analysts)
                </span>
                <span className="text-slate-400 font-mono text-[11px] font-normal">
                  Ordered by Alert Count: <strong className="text-cyan-300">{clientAnalystSortDir === 'desc' ? 'High to Low (↓)' : 'Low to High (↑)'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {clientViewAnalysts.map((analyst, index) => {
                  const isOverloaded = analyst.wip >= 14 || analyst.slaRisk >= 2;
                  const capacityPct = Math.min(100, Math.round((analyst.wip / 15) * 100));

                  return (
                    <div
                      key={analyst.id}
                      className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                        isOverloaded
                          ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Top: Rank, Avatar, Name, Tier, Alert Count */}
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800/80">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                              #{index + 1}
                            </span>
                            <img
                              src={analyst.avatar}
                              alt={analyst.name}
                              onClick={() => setSelectedAnalystForModal(analyst)}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              title={`Click to view all ${analyst.wip} inprogress cases for ${analyst.name}`}
                            />
                            <div>
                              <div
                                onClick={() => setSelectedAnalystForModal(analyst)}
                                className="font-bold text-white text-xs cursor-pointer hover:text-cyan-300 transition-colors"
                                title={`Click to view all ${analyst.wip} inprogress cases for ${analyst.name}`}
                              >
                                {getAnalystDisplayName(analyst)}
                              </div>
                              <div className="text-[10px] text-slate-400">{analyst.tier}</div>
                            </div>
                          </div>

                          {/* Alert Count Badge */}
                          <div
                            onClick={() => setSelectedAnalystForModal(analyst)}
                            className="text-right shrink-0 cursor-pointer"
                            title={`Click to view all ${analyst.wip} inprogress cases for ${analyst.name}`}
                          >
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-xs inline-flex items-center gap-1 hover:scale-105 transition-transform ${
                                isOverloaded
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                              }`}
                            >
                              <span>{analyst.wip}</span>
                              <span className="text-[9px] font-sans font-normal text-slate-400">InProgress</span>
                            </span>
                          </div>
                        </div>

                        {/* Capacity meter */}
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                            <span>WIP Load: {analyst.wip} / 12 target</span>
                            <span className={isOverloaded ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                              {capacityPct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverloaded
                                  ? 'bg-rose-500'
                                  : capacityPct > 75
                                  ? 'bg-amber-400'
                                  : 'bg-cyan-500'
                              }`}
                              style={{ width: `${capacityPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Alert breakdown stats */}
                        <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60 text-center text-[10px]">
                          <div className="p-1 rounded bg-slate-900 border border-slate-800/80">
                            <div className="text-slate-500">Total Alerts</div>
                            <div className="font-mono font-bold text-white mt-0.5">{analyst.totalAlerts}</div>
                          </div>
                          <div className="p-1 rounded bg-slate-900 border border-slate-800/80">
                            <div className="text-slate-500">Crit/High</div>
                            <div className="font-mono font-bold text-rose-300 mt-0.5">{analyst.critical + analyst.high}</div>
                          </div>
                          <div className="p-1 rounded bg-slate-900 border border-slate-800/80">
                            <div className="text-slate-500">SLA Risk</div>
                            <div className={`font-mono font-bold mt-0.5 ${analyst.slaRisk > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {analyst.slaRisk}
                            </div>
                          </div>
                        </div>

                        {/* Current Topic */}
                        <div className="mt-2 text-[10px] text-slate-300 line-clamp-1 bg-slate-900/80 px-2 py-1 rounded border border-slate-800/60">
                          <span className="text-cyan-400 font-mono">Topic: </span>
                          {analyst.currentFocus}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setSelectedAnalystForModal(analyst)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Cases ({analyst.wip})</span>
                        </button>

                        {onSelectAnalystPerspective && (
                          <button
                            onClick={() => onSelectAnalystPerspective(analyst.id)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>My SOC</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Client-Level Aggregate Health Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
              <div
                onClick={() => {
                  if (onOpenDrilldown) {
                    onOpenDrilldown({
                      type: 'client',
                      value: activeClient.id,
                      label: `${activeClient.name} Ingested Alerts`,
                      count: activeClient.activeAlerts,
                      subtitle: `All active telemetry signals for ${activeClient.name}`,
                    });
                  }
                }}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center cursor-pointer hover:border-cyan-500/50 hover:scale-105 transition-all"
                title={`Click to view all ${activeClient.activeAlerts} alerts for ${activeClient.name}`}
              >
                <div className="text-[10px] uppercase font-mono text-slate-400">Total Client Alerts</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">{activeClient.activeAlerts}</div>
                <div className="text-[9px] text-cyan-400 mt-0.5 font-mono">View All Alerts ↗</div>
              </div>

              <div
                onClick={() => {
                  if (onOpenDrilldown) {
                    onOpenDrilldown({
                      type: 'client',
                      value: activeClient.id,
                      label: `${activeClient.name} Active InProgress Cases`,
                      count: activeClient.activeWip,
                      subtitle: `Cases managed by dedicated pod analysts on Morning Shift`,
                    });
                  }
                }}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center cursor-pointer hover:border-indigo-500/50 hover:scale-105 transition-all"
                title={`Click to view all ${activeClient.activeWip} InProgress cases for ${activeClient.name}`}
              >
                <div className="text-[10px] uppercase font-mono text-slate-400">Active InProgress (Morning Shift)</div>
                <div className="text-lg font-mono font-bold text-indigo-300 mt-0.5">{activeClient.activeWip} Cases</div>
                <div className="text-[9px] text-indigo-400 mt-0.5 font-mono">Inspect Cases ↗</div>
              </div>

              <div
                onClick={() => {
                  if (onOpenDrilldown) {
                    onOpenDrilldown({
                      type: 'client',
                      value: activeClient.id,
                      label: `${activeClient.name} Open Incidents`,
                      count: activeClient.openIncidents,
                      subtitle: `Multi-stage correlated incidents under active triage`,
                    });
                  }
                }}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center cursor-pointer hover:border-cyan-500/50 hover:scale-105 transition-all"
                title="Click to view open incidents"
              >
                <div className="text-[10px] uppercase font-mono text-slate-400">Open Incidents</div>
                <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">{activeClient.openIncidents} Incidents</div>
                <div className="text-[9px] text-cyan-400 mt-0.5 font-mono">Inspect Incidents ↗</div>
              </div>

              <div
                onClick={() => {
                  if (onOpenDrilldown) {
                    onOpenDrilldown({
                      type: 'sla-risk',
                      value: activeClient.id,
                      label: `${activeClient.name} SLA Breach Risks (${activeClient.slaBreachRisk} alerts)`,
                      count: activeClient.slaBreachRisk,
                      subtitle: `<30m timer threshold for ${activeClient.name}`,
                    });
                  }
                }}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center cursor-pointer hover:border-rose-500/50 hover:scale-105 transition-all"
                title={`Click to view ${activeClient.slaBreachRisk} SLA breach alerts for ${activeClient.name}`}
              >
                <div className="text-[10px] uppercase font-mono text-slate-400">SLA Breach Risks</div>
                <div className={`text-lg font-mono font-bold mt-0.5 ${activeClient.slaBreachRisk > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {activeClient.slaBreachRisk} Cases
                </div>
                <div className="text-[9px] text-rose-400 mt-0.5 font-mono">View {activeClient.slaBreachRisk} Alerts ↗</div>
              </div>
            </div>

            {/* Quick Switch Client Selector Pills */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px] font-medium">Switch Client Scope:</span>
              <button
                onClick={() => onSelectClient('all')}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                All 3 Clients
              </button>
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectClient(c.id)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    c.id === selectedClientId
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.logoColor }} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Grid when ALL clients are selected */
          <div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 mb-3 text-xs text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Showing high-level health for all 3 enterprise clients. <strong>Click any metric (SLA Risk, WIP, Alerts)</strong> to drilldown into those exact cases.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clients.map((client) => {
                const isSelected = selectedClientId === client.id;
                return (
                  <div
                    key={client.id}
                    onClick={() => onSelectClient(isSelected ? 'all' : client.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: client.logoColor }}
                          />
                          <h4 className="text-sm font-bold text-white">{client.name}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{client.industry}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${
                          client.criticality === 'Critical'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {client.criticality}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-center">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenDrilldown) {
                            onOpenDrilldown({
                              type: 'client',
                              value: client.id,
                              label: `${client.name} Alerts (${client.activeAlerts} alerts)`,
                              count: client.activeAlerts,
                              subtitle: `All ingested security alerts for ${client.name}`,
                            });
                          }
                        }}
                        className="p-1 rounded hover:bg-slate-800/80 transition-colors"
                        title={`Click to view all ${client.activeAlerts} alerts for ${client.name}`}
                      >
                        <div className="text-[10px] text-slate-400">Alerts</div>
                        <div className="text-xs font-mono font-bold text-white mt-0.5">{client.activeAlerts}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Open Inc.</div>
                        <div className="text-xs font-mono font-bold text-cyan-400 mt-0.5">{client.openIncidents}</div>
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenDrilldown) {
                            onOpenDrilldown({
                              type: 'client',
                              value: client.id,
                              label: `${client.name} InProgress Cases (${client.activeWip} cases)`,
                              count: client.activeWip,
                              subtitle: `Active WIP cases for ${client.name}`,
                            });
                          }
                        }}
                        className="p-1 rounded hover:bg-slate-800/80 transition-colors"
                        title={`Click to view all ${client.activeWip} InProgress cases for ${client.name}`}
                      >
                        <div className="text-[10px] text-slate-400">WIP</div>
                        <div className="text-xs font-mono font-bold text-indigo-300 mt-0.5">{client.activeWip}</div>
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenDrilldown) {
                            onOpenDrilldown({
                              type: 'sla-risk',
                              value: client.id,
                              label: `${client.name} SLA Breach Risks (${client.slaBreachRisk} alerts)`,
                              count: client.slaBreachRisk,
                              subtitle: `<30m deadline threshold for ${client.name}`,
                            });
                          }
                        }}
                        className="p-1 rounded hover:bg-rose-950/40 transition-colors"
                        title={`Click to view ${client.slaBreachRisk} SLA breach alerts for ${client.name}`}
                      >
                        <div className="text-[10px] text-slate-400">SLA Risk</div>
                        <div
                          className={`text-xs font-mono font-bold mt-0.5 ${
                            client.slaBreachRisk > 0 ? 'text-rose-400 font-extrabold animate-pulse' : 'text-slate-400'
                          }`}
                        >
                          {client.slaBreachRisk}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-cyan-400 font-medium">
                      <span>3 Analysts on Morning Shift</span>
                      <span className="flex items-center gap-0.5 text-slate-400 hover:text-cyan-300">
                        <span>Inspect Shift →</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Security Alert Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Table Header & Controls */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-white">Unified Multi-Platform Alert Stream</h2>
            <span className="text-xs text-slate-400 font-mono">({filteredAlerts.length} Active Events)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search alerts, users, IPs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 w-44"
              />
            </div>

            {/* Severity Filter */}
            <select
              aria-label="Filter alerts by severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Platform Filter */}
            <select
              aria-label="Filter alerts by platform"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
            >
              <option value="all">All Platforms</option>
              {platforms.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Severity &amp; Time</th>
                <th className="py-3 px-4">Alert Title &amp; Details</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Source Platform</th>
                <th className="py-3 px-4">Current Owner / Routing</th>
                <th className="py-3 px-4">SLA Status</th>
                <th className="py-3 px-4 text-right">Investigation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAlerts.map((alert) => {
                const isFusionAi = alert.assignedTo === 'FusionAI' || alert.routedTo === 'FusionAI';
                const hasAiReport = true;
                const isClaimed = alert.status.includes('Analyst Claimed');
                const savings = getCaseCostAndTimeSavings(alert);

                return (
                  <tr
                    key={alert.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedAlertForReport(alert);
                    }}
                  >
                    {/* Severity & Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            alert.severity === 'Critical'
                              ? 'bg-rose-500 animate-ping'
                              : alert.severity === 'High'
                              ? 'bg-orange-500'
                              : alert.severity === 'Medium'
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            alert.severity === 'Critical'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : alert.severity === 'High'
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                              : alert.severity === 'Medium'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">{alert.timestamp}</div>
                    </td>

                    {/* Alert Title & Description */}
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="flex items-center gap-1.5 mb-1 font-mono text-[10px] flex-wrap">
                        <span className="bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/80 font-bold shadow-sm">
                          {getAlertTicketNumber(alert)}
                        </span>
                        <span className="bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                          {getAlertCaseNumber(alert)}
                        </span>
                        <span
                          className="bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/80 font-bold text-[9px] flex items-center gap-1 shadow-sm"
                          title={`AI Triage Efficiency: ${savings.timeSavedFormatted} saved (${savings.costSavedFormatted} labor cost avoided at $85/hr standard SOC rate)`}
                        >
                          <span>💰 {savings.costSavedFormatted}</span>
                          <span className="text-emerald-400 font-normal">({savings.timeSavedFormatted})</span>
                        </span>
                        {alert.tuningFlagged && (
                          <span className="bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800 font-bold text-[9px]">
                            TUNING
                          </span>
                        )}
                        {alert.status === 'Closed' && (
                          <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-bold text-[9px]">
                            CLOSED
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                        <span>{alert.title}</span>
                        {alert.correlatedIncidentId && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            CORRELATED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{alert.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono flex-wrap">
                        {alert.mitreTactic && (
                          <span className="text-indigo-400">
                            MITRE: {alert.mitreTactic}
                          </span>
                        )}
                        {alert.entityUser && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenDrilldown) {
                                onOpenDrilldown({
                                  type: 'user',
                                  value: alert.entityUser || '',
                                  label: alert.entityUser || '',
                                  subtitle: `Events matching user identity ${alert.entityUser}`,
                                });
                              }
                            }}
                            className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            title="Drilldown into user results"
                          >
                            <span>User: {alert.entityUser} ↗</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenDrilldown) {
                            onOpenDrilldown({
                              type: 'client',
                              value: alert.clientId || alert.client,
                              label: alert.client,
                              subtitle: `All cases for client ${alert.client}`,
                            });
                          }
                        }}
                        className="font-medium text-slate-300 hover:text-cyan-400 hover:underline cursor-pointer"
                        title="Click to drilldown all cases for this client"
                      >
                        {alert.client} ↗
                      </button>
                    </td>

                    {/* Platform Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenDrilldown) {
                            onOpenDrilldown({
                              type: 'platform',
                              value: alert.source_platform,
                              label: `${alert.source_platform} Telemetry`,
                              subtitle: `Correlated events from ${alert.source_platform}`,
                            });
                          }
                        }}
                        className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px] hover:border-cyan-500/50 hover:text-cyan-300 cursor-pointer"
                        title="Drilldown by platform"
                      >
                        {alert.source_platform} ↗
                      </button>
                    </td>

                    {/* Current Owner & Initial Ack */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isFusionAi ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenDrilldown) {
                                onOpenDrilldown({
                                  type: 'status',
                                  value: 'unclaimed',
                                  label: 'FusionAI Autonomous Queue',
                                  subtitle: 'Low & Medium severity alerts investigated by FusionAI',
                                });
                              }
                            }}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 cursor-pointer"
                            title="Click to drilldown FusionAI queue"
                          >
                            <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            <span className="font-semibold">FusionAI (AI Triage) ↗</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenDrilldown) {
                                onOpenDrilldown({
                                  type: 'analyst',
                                  value: alert.assignedToId || alert.assignedTo,
                                  label: alert.assignedTo,
                                  subtitle: `Analyst workload & case history for ${alert.assignedTo}`,
                                });
                              }
                            }}
                            className="flex items-center gap-1.5 text-slate-200 hover:text-cyan-300 cursor-pointer hover:underline text-left"
                            title={`Click to drilldown into cases for ${alert.assignedTo}`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                              {alert.assignedTo.charAt(0)}
                            </span>
                            <span>{getAnalystDisplayName({ name: alert.assignedTo, client: alert.client })} ↗</span>
                          </button>
                        )}
                      </div>

                      {/* Initial Ack Indicator */}
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Ack by {alert.initialAckBy}</span>
                      </div>
                    </td>

                    {/* SLA Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div
                        className={`font-mono text-[11px] font-semibold flex items-center gap-1 ${
                          alert.slaRisk ? 'text-rose-400 animate-pulse' : 'text-slate-400'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{alert.slaDeadline}</span>
                      </div>
                      {alert.slaRisk && (
                        <span className="text-[9px] text-rose-400 uppercase font-mono font-bold">
                          SLA Threshold Risk
                        </span>
                      )}
                    </td>

                    {/* Action Column: Claim Alert or Deep Investigate */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {/* If low/med and handled by FusionAI, show Claim Alert button */}
                        {isFusionAi && !isClaimed ? (
                          <button
                            onClick={() => onClaimAlert(alert.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            title="Review AI Report and take ownership"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Claim Alert</span>
                          </button>
                        ) : null}

                        {/* Close Alert Button */}
                        {onCloseAlert && alert.status !== 'Closed' && (
                          <button
                            type="button"
                            onClick={() => onCloseAlert(alert.id, 'Benign', 'Closed as benign from Unified Alert Stream')}
                            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
                            title={`Close Alert ID ${alert.id} as Benign`}
                          >
                            Close
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedAlertForReport(alert)}
                          className="px-2 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:border-cyan-400"
                          title="View Executive AI Triage Dossier (When, Key Indicators, Impact, VirusTotal/Domain/IP/SiteReview, Conclusion)"
                        >
                          <Bot className="w-3.5 h-3.5 text-cyan-400" />
                          <span>AI Report</span>
                        </button>

                        <button
                          onClick={() => onNavigateToInvestigation(alert.correlatedIncidentId || 'FUS-INC-2026-8841')}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Investigate</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FusionAI Modal: Inspection of Executive AI Triage Report Dossier */}
      {selectedAlertForReport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl shadow-cyan-950/70 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Bot className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono uppercase bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                      FusionAI Incident Triage Dossier
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedAlertForReport.aiReport?.generatedAt || selectedAlertForReport.timestamp}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      ID: {selectedAlertForReport.id}
                    </span>
                    <span className="text-xs text-slate-400">
                      Client: <strong className="text-white">{selectedAlertForReport.client}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                    <span>{selectedAlertForReport.title}</span>
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertForReport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-4">
              {/* Quick Threat, SLA, and Historical User/IoC Precedent KPI Cards */}
              {(() => {
                const hist = selectedAlertForReport ? getCorrelatedAndHistoricalAlerts(selectedAlertForReport, alerts) : null;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Calculated Threat Risk</div>
                      <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                        {selectedAlertForReport.aiReport?.riskScore || (selectedAlertForReport.severity === 'Critical' ? 95 : selectedAlertForReport.severity === 'High' ? 84 : 76)}/100
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Automated Multi-Source Weighting</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">AI Confidence</div>
                      <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                        {selectedAlertForReport.aiReport?.confidence || 94}%
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Telemetry Cross-Validation</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Initial Acknowledgment</div>
                      <div className="text-xs font-bold font-mono text-emerald-400 mt-1 truncate">
                        {selectedAlertForReport.initialAckBy}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {selectedAlertForReport.initialAckTimestamp || 'Sub-second Ack'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">SLA Deadline</div>
                      <div className={`text-xs font-bold font-mono mt-1 ${selectedAlertForReport.slaRisk ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                        {selectedAlertForReport.slaDeadline}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {selectedAlertForReport.slaRisk ? 'SLA Risk Flagged' : 'Within SLA Target'}
                      </div>
                    </div>

                    {/* 5th KPI Card: Previous / Related Alert Match & Disposition */}
                    <div className={`p-3 rounded-xl border ${
                      hist && hist.truePositiveCount > 0
                        ? 'bg-rose-950/40 border-rose-500/50'
                        : hist && hist.benignCount > 0
                        ? 'bg-emerald-950/40 border-emerald-500/50'
                        : hist && hist.activeCount > 0
                        ? 'bg-cyan-950/40 border-cyan-500/50'
                        : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                        <span>Prior User / IoC History</span>
                        <History className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        {hist && hist.truePositiveCount > 0 ? (
                          <span className="text-sm font-bold font-mono text-rose-400">
                            {hist.truePositiveCount} True Pos
                            {hist.benignCount > 0 ? (
                              <span className="text-[11px] text-emerald-400 font-normal ml-1">/ {hist.benignCount} Benign</span>
                            ) : null}
                          </span>
                        ) : hist && hist.benignCount > 0 ? (
                          <span className="text-sm font-bold font-mono text-emerald-400">
                            {hist.benignCount} Closed Benign
                          </span>
                        ) : hist && hist.activeCount > 0 ? (
                          <span className="text-sm font-bold font-mono text-cyan-400">
                            {hist.activeCount} Active Chain
                          </span>
                        ) : (
                          <span className="text-sm font-bold font-mono text-slate-300">
                            Clean Baseline
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {hist && hist.truePositiveCount > 0
                          ? '⚠️ Recurring Incident Precedent'
                          : hist && hist.benignCount > 0
                          ? '✓ Previous Authorized Baseline'
                          : hist && hist.activeCount > 0
                          ? '⚡ Real-time Multi-Sensor Match'
                          : '0 Prior Alerts for User/IoCs'}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Standardized Executive AI Triage Summary with the 6 Required Sections */}
              <ExecutiveAiTriageSummary
                alert={selectedAlertForReport}
                allAlerts={alerts}
                currentAnalystName={currentAnalystName}
                onClaimAlert={(id) => {
                  onClaimAlert(id);
                  setSelectedAlertForReport(null);
                }}
                onSendToTuning={(id, reason) => {
                  if (onSendToTuning) onSendToTuning(id, reason);
                  setSelectedAlertForReport(null);
                }}
                onCloseAlert={(id, reason, notes) => {
                  if (onCloseAlert) onCloseAlert(id, reason, notes);
                  setSelectedAlertForReport(null);
                }}
                onEscalateAlert={(id, target, details) => {
                  if (onEscalateAlert) onEscalateAlert(id, target, details);
                  setSelectedAlertForReport(null);
                }}
                isModalView={true}
              />

              {/* Explainable Risk Factors (if available on aiReport) */}
              {selectedAlertForReport.aiReport?.contributingFactors && selectedAlertForReport.aiReport.contributingFactors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-slate-200 mb-2 text-xs flex items-center justify-between">
                    <span>Explainable Risk Scoring Factors:</span>
                    <span className="text-[10px] font-mono text-cyan-400">Additive Weight Model</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedAlertForReport.aiReport.contributingFactors.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80 text-xs"
                      >
                        <span className="text-slate-300">{f.label}</span>
                        <span className="font-mono text-cyan-400 font-bold">+{f.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Playbooks (if available on aiReport) */}
              {selectedAlertForReport.aiReport?.suggestedPlaybooks && selectedAlertForReport.aiReport.suggestedPlaybooks.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-slate-200 mb-2 text-xs flex items-center justify-between">
                    <span>Recommended Gated SOAR Playbooks:</span>
                    <span className="text-[10px] font-mono text-indigo-400">Requires Human Authorization</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAlertForReport.aiReport.suggestedPlaybooks.map((pb, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 font-mono text-[11px] flex items-center gap-1.5"
                      >
                        <Zap className="w-3 h-3 text-indigo-400" />
                        <span>{pb}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Claim Alert or Close */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
              <span className="text-xs text-slate-400">
                Logged in as <strong className="text-white">{currentAnalystName}</strong>
              </span>

              <div className="flex items-center gap-2">
                {onCloseAlert && selectedAlertForReport.status !== 'Closed' && (
                  <button
                    onClick={() => {
                      onCloseAlert(selectedAlertForReport.id, 'Benign', 'Closed as benign via AI Triage Dossier');
                      setSelectedAlertForReport(null);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-emerald-950/60 hover:text-emerald-300 hover:border-emerald-600/40 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors"
                    title={`Close Alert ID ${selectedAlertForReport.id}`}
                  >
                    Close Alert (Benign)
                  </button>
                )}
                <button
                  onClick={() => setSelectedAlertForReport(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    onClaimAlert(selectedAlertForReport.id);
                    setSelectedAlertForReport(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Claim Alert (Assign to {currentAnalystName})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ANALYST IN-PROGRESS CASE INSPECTION MODAL                          */}
      {/* ========================================================================= */}
      {selectedAnalystForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                {selectedAnalystForModal.isAiInvestigator ? (
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                    <Bot className="w-6 h-6 animate-pulse" />
                  </div>
                ) : (
                  <img
                    src={selectedAnalystForModal.avatar}
                    alt={selectedAnalystForModal.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{getAnalystDisplayName(selectedAnalystForModal)}</h3>
                    {selectedAnalystForModal.isAiInvestigator ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        VIRTUAL AI
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        MORNING SHIFT
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedAnalystForModal.tier} • {selectedAnalystForModal.client}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAnalystForModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 my-4 text-xs overflow-y-auto pr-1">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Active In-Progress</div>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                    {selectedAnalystForModal.wip} <span className="text-xs font-sans text-slate-400">Cases</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Under Live Investigation</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">SLA Breach Risk</div>
                  <div
                    className={`text-2xl font-bold font-mono mt-1 ${
                      selectedAnalystForModal.slaRisk > 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'
                    }`}
                  >
                    {selectedAnalystForModal.slaRisk} <span className="text-xs font-sans text-slate-400">Cases</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">&lt;30m SLA window</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Shift Workload State</div>
                  <div className="mt-1">
                    {selectedAnalystForModal.wip >= 14 || selectedAnalystForModal.slaRisk >= 2 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        OVERLOADED
                      </span>
                    ) : selectedAnalystForModal.wip <= 8 && selectedAnalystForModal.slaRisk === 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        OPTIMAL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        BALANCED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Target: &le; 12 Cases</div>
                </div>
              </div>

              {/* Active Investigation Focus */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-mono tracking-wider mb-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Current Investigation Topic:</span>
                </div>
                <p className="text-slate-200 font-medium text-xs leading-relaxed">
                  {selectedAnalystForModal.currentFocus || 'Investigating correlated multi-platform security alerts.'}
                </p>
              </div>

              {/* List of In-Progress Cases */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-slate-200">
                    Live Tickets Under Analysis ({selectedAnalystForModal.activeInProgressCases?.length || 0}):
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Shift 1 Active Queue</span>
                </div>

                <div className="space-y-2">
                  {selectedAnalystForModal.activeInProgressCases && selectedAnalystForModal.activeInProgressCases.length > 0 ? (
                    selectedAnalystForModal.activeInProgressCases.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                item.severity === 'Critical'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : item.severity === 'High'
                                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {item.severity}
                            </span>
                            <span className="font-mono text-cyan-400 text-xs">{item.id}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 text-[11px]">{item.platform}</span>
                          </div>
                          <div className="font-medium text-white text-xs">{item.title}</div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-mono text-slate-400">{item.durationMinutes}m in-progress</div>
                          <div className="text-[10px] font-mono text-amber-400 font-semibold mt-0.5">
                            SLA: {item.slaDeadlineMin}m left
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400">
                      No active cases in queue.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400">
                Shift 1 Alpha: <strong className="text-white">08:00 - 16:00 UTC</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedAnalystForModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Close
                </button>

                {!selectedAnalystForModal.isAiInvestigator && onSelectAnalystPerspective && (
                  <button
                    onClick={() => {
                      onSelectAnalystPerspective(selectedAnalystForModal.id);
                      setSelectedAnalystForModal(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/50"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Open in My SOC View</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
