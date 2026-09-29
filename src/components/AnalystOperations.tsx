import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Zap,
  Bot,
  Sliders,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Shield,
  Layers,
  Eye,
  ExternalLink,
  X,
  AlertCircle,
  Calendar,
  Briefcase,
  ChevronRight,
  Search,
  Activity,
  UserCheck,
  BarChart3,
  Gauge,
  Radio,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Percent,
  CheckCircle2,
  Info,
  Award,
} from 'lucide-react';
import { Analyst, Client, DetectionRuleFatigue, SocShift, AnalystTier } from '../types/soc';
import { SOC_SHIFTS } from '../data/mockSocData';
import { AnalystMaturityMatrix } from './AnalystMaturityMatrix';
import {
  getAnalystOperationsDisplayName as getAnalystDisplayName,
  getClientShortName,
} from '../utils/analystUtils';

interface AnalystOperationsProps {
  analysts: Analyst[];
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  onOpenRebalanceModal: () => void;
  detectionRules: DetectionRuleFatigue[];
  onApplyRuleTuning: (ruleId: string) => void;
  onSelectAnalystPerspective: (analystId: string) => void;
}

type SortField =
  | 'totalAlerts'
  | 'wip'
  | 'slaRisk'
  | 'criticalHigh'
  | 'name'
  | 'client'
  | 'avgResolutionTimeMin';
type SortDirection = 'desc' | 'asc';
type ViewMode = 'inprogress' | 'shifts-roster' | 'workload-table' | 'maturity-matrix';
type InProgressLayout = 'pods' | 'ranking' | 'cards';
const DualClientAlertLoadBadge: React.FC<{
  analyst: Analyst;
  selectedClientId?: string;
  compact?: boolean;
}> = ({ analyst, selectedClientId, compact = false }) => {
  if (analyst.isAiInvestigator) {
    return (
      <div className="mt-2.5 p-2 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-[11px]">
        <div className="flex items-center justify-between text-cyan-300 font-mono text-[10px]">
          <span className="flex items-center gap-1 font-semibold">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            Autonomous 24/7 Engine
          </span>
          <span>{analyst.wip} alerts triaged cross-client</span>
        </div>
      </div>
    );
  }

  const loads = analyst.clientAlertLoads || [];
  if (loads.length === 0) return null;

  const totalWip = analyst.wip;

  return (
    <div className={`mt-2.5 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-mono">
        <span className="flex items-center gap-1 text-slate-300 font-semibold uppercase tracking-wider">
          <Layers className="w-3 h-3 text-cyan-400" />
          Alerts Picked by Client ({totalWip} Total WIP)
        </span>
        <span className="text-[9px] text-slate-500 font-sans">Dual-Client Load</span>
      </div>

      {/* Proportional Split Bar */}
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex mb-2 shadow-inner">
        {loads.map((load) => {
          const pct = totalWip > 0 ? Math.round((load.alertsPicked / totalWip) * 100) : 50;
          return (
            <div
              key={load.clientId}
              style={{ width: `${pct}%`, backgroundColor: load.color }}
              className="h-full transition-all relative group"
              title={`${load.shortName}: ${load.alertsPicked} alerts (${pct}%)`}
            />
          );
        })}
      </div>

      {/* Client Load Cards */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {loads.map((load) => {
          const isSelected = selectedClientId && selectedClientId !== 'all' && selectedClientId === load.clientId;
          return (
            <div
              key={load.clientId}
              className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                isSelected
                  ? 'bg-cyan-950/50 border border-cyan-500/50 text-cyan-200 shadow-sm'
                  : 'bg-slate-950/90 border border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: load.color }} />
                <span className="truncate font-medium">{load.shortName}</span>
              </div>
              <span className="font-mono font-bold text-white shrink-0 ml-1">
                {load.alertsPicked} <span className="text-[9px] text-slate-400 font-normal">alerts</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AnalystOperations: React.FC<AnalystOperationsProps> = ({
  analysts,
  clients,
  selectedClientId,
  onSelectClient,
  onOpenRebalanceModal,
  detectionRules,
  onApplyRuleTuning,
  onSelectAnalystPerspective,
}) => {
  // Navigation & Subtab State
  const [activeViewMode, setActiveViewMode] = useState<ViewMode>('inprogress');
  const [activeShiftId, setActiveShiftId] = useState<string>('shift-1');

  // Layout for Current Shift InProgress View
  const [inprogressLayout, setInprogressLayout] = useState<InProgressLayout>('pods');

  // Sorting & Filtering
  const [sortField, setSortField] = useState<SortField>('wip');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchAnalyst, setSearchAnalyst] = useState<string>('');

  // Selected Analyst for In-Progress Deep Dive Modal
  const [selectedAnalystForModal, setSelectedAnalystForModal] = useState<Analyst | null>(null);

  // Client Dropdown State
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState<boolean>(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Sort Click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' || field === 'client' ? 'asc' : 'desc');
    }
  };

  // Filter and Sort analysts
  const filteredAnalysts = useMemo(() => {
    return [...analysts]
      .filter((a) => {
        // When a specific client is selected, show analysts assigned to that client (support dual-client assignments)
        if (selectedClientId !== 'all') {
          const isAssigned = a.clientId === selectedClientId || a.clientIds?.includes(selectedClientId);
          if (!isAssigned) return false;
        }
        if (tierFilter !== 'all' && a.tier !== tierFilter) return false;
        if (statusFilter === 'overloaded' && a.wip < 14) return false;
        if (statusFilter === 'slarisk' && a.slaRisk === 0) return false;
        if (statusFilter === 'optimal' && a.wip >= 9) return false;
        if (
          searchAnalyst &&
          !a.name.toLowerCase().includes(searchAnalyst.toLowerCase()) &&
          !a.client.toLowerCase().includes(searchAnalyst.toLowerCase()) &&
          !(a.currentFocus && a.currentFocus.toLowerCase().includes(searchAnalyst.toLowerCase())) &&
          !(a.assignedClients && a.assignedClients.some((c) => c.shortName.toLowerCase().includes(searchAnalyst.toLowerCase()) || c.name.toLowerCase().includes(searchAnalyst.toLowerCase())))
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof Analyst];
        let valB: any = b[sortField as keyof Analyst];

        if (sortField === 'criticalHigh') {
          valA = a.critical + a.high;
          valB = b.critical + b.high;
        }

        if (typeof valA === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [analysts, selectedClientId, tierFilter, statusFilter, searchAnalyst, sortField, sortDirection]);

  // Current Shift 1 Human Analysts
  const shift1HumanAnalysts = useMemo(() => {
    return analysts.filter((a) => !a.isAiInvestigator);
  }, [analysts]);

  const isClientScoped = selectedClientId !== 'all';
  const activeClient = clients.find((c) => c.id === selectedClientId);

  // Group analysts by client for Client Pods View (6 analysts assigned per client on Shift 1 with dual coverage)
  const clientPods = useMemo(() => {
    return clients
      .filter((c) => selectedClientId === 'all' || c.id === selectedClientId)
      .map((client) => {
        const podAnalysts = analysts
          .filter((a) => (a.clientId === client.id || a.clientIds?.includes(client.id)) && !a.isAiInvestigator)
          .sort((a, b) => {
            if (sortField === 'wip' || sortField === 'totalAlerts') {
              const field = sortField === 'totalAlerts' ? 'totalAlerts' : 'wip';
              return sortDirection === 'desc' ? b[field] - a[field] : a[field] - b[field];
            }
            if (sortField === 'slaRisk') {
              return sortDirection === 'desc' ? b.slaRisk - a.slaRisk : a.slaRisk - b.slaRisk;
            }
            if (sortField === 'criticalHigh') {
              const chA = a.critical + a.high;
              const chB = b.critical + b.high;
              return sortDirection === 'desc' ? chB - chA : chA - chB;
            }
            if (sortField === 'name') {
              return sortDirection === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
            }
            return sortDirection === 'desc' ? b.wip - a.wip : a.wip - b.wip;
          });
        const podWip = podAnalysts.reduce((acc, a) => {
          const clientLoad = a.clientAlertLoads?.find((l) => l.clientId === client.id);
          return acc + (clientLoad ? clientLoad.alertsPicked : a.wip);
        }, 0);
        const podSlaRisk = podAnalysts.reduce((acc, a) => acc + a.slaRisk, 0);
        const podCriticalHigh = podAnalysts.reduce((acc, a) => acc + a.critical + a.high, 0);
        return {
          client,
          podAnalysts,
          podWip,
          podSlaRisk,
          podCriticalHigh,
        };
      });
  }, [clients, analysts, selectedClientId, sortField, sortDirection]);

  // Aggregate metrics for Current Shift
  const totalShift1Human = shift1HumanAnalysts.length;
  const totalShift1Wip = shift1HumanAnalysts.reduce((acc, curr) => acc + curr.wip, 0);
  const avgShift1Wip = totalShift1Human > 0 ? (totalShift1Wip / totalShift1Human).toFixed(1) : '0';
  const overloadedShift1Analysts = shift1HumanAnalysts.filter((a) => a.wip >= 14 || a.slaRisk >= 2);
  const balancedShift1Analysts = shift1HumanAnalysts.filter((a) => a.wip >= 9 && a.wip <= 13 && a.slaRisk <= 1);
  const optimalShift1Analysts = shift1HumanAnalysts.filter((a) => a.wip <= 8 && a.slaRisk === 0);
  const totalShift1SlaRisks = shift1HumanAnalysts.reduce((acc, curr) => acc + curr.slaRisk, 0);

  // Client-scoped metrics for Current Shift display
  const scopedShift1HumanAnalysts = useMemo(() => {
    return analysts.filter((a) => {
      if (a.isAiInvestigator) return false;
      if (isClientScoped) {
        const isAssigned = a.clientId === selectedClientId || a.clientIds?.includes(selectedClientId);
        if (!isAssigned) return false;
      }
      return true;
    });
  }, [analysts, isClientScoped, selectedClientId]);

  const displayShift1Human = scopedShift1HumanAnalysts.length;
  const displayShift1Wip = scopedShift1HumanAnalysts.reduce((acc, curr) => {
    if (isClientScoped) {
      const clientLoad = curr.clientAlertLoads?.find((l) => l.clientId === selectedClientId);
      return acc + (clientLoad ? clientLoad.alertsPicked : curr.wip);
    }
    return acc + curr.wip;
  }, 0);
  const displayAvgShift1Wip = displayShift1Human > 0 ? (displayShift1Wip / displayShift1Human).toFixed(1) : '0';
  const displayOverloadedAnalysts = scopedShift1HumanAnalysts.filter((a) => a.wip >= 14 || a.slaRisk >= 2);
  const displayTotalSlaRisks = scopedShift1HumanAnalysts.reduce((acc, curr) => acc + curr.slaRisk, 0);
  
  // Capacity calculation based on target 12 cases / max 15 cases per analyst
  const shift1TargetCapacity = totalShift1Human * 12; // 108 cases
  const shift1CapacityUtilization = Math.round((totalShift1Wip / shift1TargetCapacity) * 100);

  const activeShift = SOC_SHIFTS.find((s) => s.id === activeShiftId) || SOC_SHIFTS[0];

  // Shift Capacity Comparison Data
  const shiftCapacities = useMemo(() => {
    return [
      {
        id: 'shift-1',
        name: 'Shift 1 — Alpha',
        label: 'Day Operations',
        code: 'ALPHA-01',
        hours: '08:00 - 16:00 UTC',
        status: 'Active On Duty',
        isActive: true,
        analystCount: 9,
        aiInvestigatorCount: 1,
        totalCapacity: 108,
        currentWip: totalShift1Wip,
        utilizationPct: shift1CapacityUtilization,
        overloadedCount: overloadedShift1Analysts.length,
        slaRiskCount: totalShift1SlaRisks,
        supervisor: 'Cmdr. Rachel Hayes',
        statusColor: 'emerald',
        handoverStatus: 'Active Operations',
      },
      {
        id: 'shift-2',
        name: 'Shift 2 — Bravo',
        label: 'Evening Operations',
        code: 'BRAVO-02',
        hours: '16:00 - 00:00 UTC',
        status: 'Standby / Next',
        isActive: false,
        analystCount: 9,
        aiInvestigatorCount: 1,
        totalCapacity: 108,
        currentWip: 0,
        utilizationPct: 0,
        overloadedCount: 0,
        slaRiskCount: 0,
        supervisor: 'Marcus Sterling (Senior IR Lead)',
        statusColor: 'indigo',
        handoverStatus: 'Handover in 1h 45m',
      },
      {
        id: 'shift-3',
        name: 'Shift 3 — Charlie',
        label: 'Night / APAC Operations',
        code: 'CHARLIE-03',
        hours: '00:00 - 08:00 UTC',
        status: 'Scheduled',
        isActive: false,
        analystCount: 9,
        aiInvestigatorCount: 1,
        totalCapacity: 108,
        currentWip: 0,
        utilizationPct: 0,
        overloadedCount: 0,
        slaRiskCount: 0,
        supervisor: 'Elena Vance (Threat Hunt Lead)',
        statusColor: 'slate',
        handoverStatus: 'Follow-the-Sun APAC',
      },
    ];
  }, [totalShift1Wip, shift1CapacityUtilization, overloadedShift1Analysts.length, totalShift1SlaRisks]);

  // =========================================================================
  // OPERATIONAL READINESS & HUMAN BANDWIDTH STATE & CALCULATIONS
  // =========================================================================
  const [isReadinessExpanded, setIsReadinessExpanded] = useState<boolean>(true);
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'overloaded' | 'near-capacity' | 'available'>('all');
  const [readinessSearch, setReadinessSearch] = useState<string>('');
  const [readinessSort, setReadinessSort] = useState<'wip-desc' | 'wip-asc' | 'headroom-desc' | 'headroom-asc'>('wip-desc');
  const [readinessTab, setReadinessTab] = useState<'roster' | 'tiers'>('roster');

  // Human Bandwidth Constants & Computations for Current Active Shift (Shift 1 — Alpha)
  const TARGET_ALERTS_PER_ANALYST = 12; // Sustainable target capacity per human analyst
  const MAX_ALERTS_CEILING = 15; // Upper saturation threshold
  const SHIFT_HOURS_PER_ANALYST = 8.0; // 8-hour operational shift duration

  // Total Shift Human Bandwidth
  const totalHumanBandwidthSlots = totalShift1Human * TARGET_ALERTS_PER_ANALYST; // 9 * 12 = 108 alert slots
  const totalHumanBandwidthHours = totalShift1Human * SHIFT_HOURS_PER_ANALYST; // 9 * 8 = 72.0 analyst-hours

  // Utilized Human Bandwidth (Active InProgress Alerts Managed)
  const utilizedBandwidthSlots = totalShift1Wip; // e.g. ~202 cases
  const utilizedBandwidthPct = Math.round((utilizedBandwidthSlots / totalHumanBandwidthSlots) * 100);
  const utilizedBandwidthHours = parseFloat(((utilizedBandwidthSlots / totalHumanBandwidthSlots) * totalHumanBandwidthHours).toFixed(1));

  // Available Human Bandwidth (Headroom / Absorption Buffer)
  const availableBandwidthSlots = totalHumanBandwidthSlots - utilizedBandwidthSlots; // e.g. 14 slots
  const availableBandwidthPct = parseFloat((((totalHumanBandwidthSlots - utilizedBandwidthSlots) / totalHumanBandwidthSlots) * 100).toFixed(1));
  const availableBandwidthHours = parseFloat(Math.max(0, totalHumanBandwidthHours - utilizedBandwidthHours).toFixed(1));

  // Operational Readiness Score & Posture
  const isBandwidthConstrained = availableBandwidthSlots <= 16 || overloadedShift1Analysts.length >= 5;
  const isBandwidthCritical = availableBandwidthSlots <= 8;

  const readinessScore = useMemo(() => {
    // 40% based on available bandwidth buffer, 40% on healthy analyst ratio, 20% on SLA preservation
    const bufferScore = Math.max(0, Math.min(40, (availableBandwidthSlots / 30) * 40));
    const analystHealthScore = totalShift1Human > 0 ? ((totalShift1Human - overloadedShift1Analysts.length) / totalShift1Human) * 40 : 0;
    const slaScore = Math.max(0, (1 - totalShift1SlaRisks / 10)) * 20;
    return Math.round(bufferScore + analystHealthScore + slaScore);
  }, [availableBandwidthSlots, totalShift1Human, overloadedShift1Analysts.length, totalShift1SlaRisks]);

  const readinessStatus = useMemo(() => {
    if (availableBandwidthSlots <= 8 || overloadedShift1Analysts.length >= 6) {
      return {
        label: 'CRITICAL DEFICIT',
        color: 'rose',
        desc: 'Bandwidth is near exhaustion (<5% buffer remaining). Immediate rebalance needed.',
      };
    }
    if (availableBandwidthSlots <= 16 || overloadedShift1Analysts.length >= 4) {
      return {
        label: 'CONSTRAINED BANDWIDTH',
        color: 'amber',
        desc: 'Human bandwidth buffer is strained. 6 analysts operating beyond safe capacity.',
      };
    }
    return {
      label: 'OPERATIONAL READY',
      color: 'emerald',
      desc: 'Adequate bandwidth buffer to absorb incoming incidents.',
    };
  }, [availableBandwidthSlots, overloadedShift1Analysts.length]);

  // Per-Analyst InProgress Alerts and Individual Bandwidth Utilization for Shift 1
  const shift1AnalystsWithBandwidth = useMemo(() => {
    return shift1HumanAnalysts.map((a) => {
      const wip = a.wip;
      const target = TARGET_ALERTS_PER_ANALYST; // 12
      const maxCeiling = MAX_ALERTS_CEILING; // 15
      const utilPct = Math.round((wip / target) * 100);
      const availableBuffer = target - wip; // positive means spare bandwidth, negative means over capacity
      const isOverloaded = wip >= 14 || a.slaRisk >= 2;
      const isNearCapacity = !isOverloaded && wip >= 10;
      const isOptimal = wip < 10 && a.slaRisk === 0;

      let statusCategory: 'overloaded' | 'near-capacity' | 'available' = 'near-capacity';
      if (isOverloaded) statusCategory = 'overloaded';
      else if (isOptimal) statusCategory = 'available';

      return {
        ...a,
        target,
        maxCeiling,
        utilPct,
        availableBuffer,
        statusCategory,
        isOverloaded,
        isNearCapacity,
        isOptimal,
      };
    });
  }, [shift1HumanAnalysts]);

  // Filtered & sorted analysts for the Operational Readiness card
  const filteredReadinessAnalysts = useMemo(() => {
    return shift1AnalystsWithBandwidth
      .filter((a) => {
        if (readinessFilter !== 'all' && a.statusCategory !== readinessFilter) return false;
        if (
          readinessSearch &&
          !a.name.toLowerCase().includes(readinessSearch.toLowerCase()) &&
          !a.client.toLowerCase().includes(readinessSearch.toLowerCase()) &&
          !a.tier.toLowerCase().includes(readinessSearch.toLowerCase()) &&
          !(a.currentFocus && a.currentFocus.toLowerCase().includes(readinessSearch.toLowerCase()))
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (readinessSort === 'wip-desc') return b.wip - a.wip;
        if (readinessSort === 'wip-asc') return a.wip - b.wip;
        if (readinessSort === 'headroom-desc') return b.availableBuffer - a.availableBuffer;
        if (readinessSort === 'headroom-asc') return a.availableBuffer - b.availableBuffer;
        return 0;
      });
  }, [shift1AnalystsWithBandwidth, readinessFilter, readinessSearch, readinessSort]);

  // Tier-level Bandwidth Breakdown
  const tierBandwidthBreakdown = useMemo(() => {
    const tierDefs: { tier: AnalystTier; label: string; desc: string }[] = [
      {
        tier: 'Tier 1 Triage',
        label: 'T1 Frontline Triage',
        desc: 'Alert classification, noise suppression & initial triage',
      },
      {
        tier: 'Tier 2 Incident Responder',
        label: 'T2 Incident Responders',
        desc: 'Deep payload analysis, containment & forensic scoping',
      },
      {
        tier: 'Tier 3 Threat Hunter',
        label: 'T3 Threat Hunters / IR Leads',
        desc: 'Complex campaign hunting, APT eradication & root cause analysis',
      },
    ];

    return tierDefs.map((def) => {
      const tierAnalysts = shift1HumanAnalysts.filter((a) => a.tier === def.tier);
      const count = tierAnalysts.length;
      const totalTierBandwidth = count * TARGET_ALERTS_PER_ANALYST;
      const tierWip = tierAnalysts.reduce((acc, a) => acc + a.wip, 0);
      const tierAvailable = totalTierBandwidth - tierWip;
      const tierUtilPct = totalTierBandwidth > 0 ? Math.round((tierWip / totalTierBandwidth) * 100) : 0;
      const tierOverloaded = tierAnalysts.filter((a) => a.wip >= 14).length;
      const tierSlaRisks = tierAnalysts.reduce((acc, a) => acc + a.slaRisk, 0);

      return {
        ...def,
        count,
        totalTierBandwidth,
        tierWip,
        tierAvailable,
        tierUtilPct,
        tierOverloaded,
        tierSlaRisks,
        analysts: tierAnalysts,
      };
    });
  }, [shift1HumanAnalysts]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === 'desc' ? (
      <ArrowDown className="w-3.5 h-3.5 text-cyan-400 font-bold" />
    ) : (
      <ArrowUp className="w-3.5 h-3.5 text-cyan-400 font-bold" />
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* SECTION 0: CLIENT SCOPE SELECTOR & OPERATIONAL CONTROL BAR               */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                  Analyst Operations Command
                </span>
                <span className="text-xs text-slate-500 font-mono">9 Analysts on Shift 1 • 3 Enterprise Pods</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                Shift Capacity, Dedicated Pod Allocation &amp; Alert Distribution
              </h2>
            </div>
          </div>

          {/* Client Dropdown Button & Selector */}
          <div className="flex items-center gap-2.5 relative" ref={clientDropdownRef}>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Select Client:</span>

            {/* Interactive Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClientDropdownOpen((prev) => !prev)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 border transition-all cursor-pointer shadow-sm ${
                  isClientScoped
                    ? 'bg-slate-950 border-cyan-500 text-white ring-2 ring-cyan-500/20'
                    : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-600'
                }`}
                title="Select client to view dedicated analyst data"
              >
                <Building2 className={`w-4 h-4 ${isClientScoped ? 'text-cyan-400' : 'text-slate-400'}`} />
                <div className="flex items-center gap-2 text-left">
                  {isClientScoped && activeClient ? (
                    <>
                      <span
                        className="w-2.5 h-2.5 rounded-full ring-2 ring-cyan-400/40 shrink-0"
                        style={{ backgroundColor: activeClient.logoColor || '#06b6d4' }}
                      />
                      <span className="font-bold text-white max-w-[160px] truncate">{activeClient.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 font-bold">
                        {displayShift1Human} Analysts
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                      <span>All Clients (3 Pods • 9 Analysts)</span>
                    </>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isClientDropdownOpen ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {/* Custom Dropdown Popover */}
              {isClientDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800 flex items-center justify-between">
                    <span>Client Pod Filter</span>
                    <span>Shift 1 Staffing</span>
                  </div>

                  {/* All Clients Option */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectClient('all');
                      setIsClientDropdownOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-lg text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      selectedClientId === 'all'
                        ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-slate-300">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">All Clients (Enterprise View)</div>
                        <div className="text-[10px] text-slate-400">All 3 client pods • 9 analysts on duty</div>
                      </div>
                    </div>
                    {selectedClientId === 'all' && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>

                  <div className="border-t border-slate-800/80 my-1" />

                  {/* Client List */}
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {clients.map((client) => {
                      const clientAnalystsCount = analysts.filter(
                        (a) => a.clientId === client.id && !a.isAiInvestigator
                      ).length;
                      const isSelected = selectedClientId === client.id;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            onSelectClient(client.id);
                            setIsClientDropdownOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-lg text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30'
                              : 'text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: client.logoColor || '#06b6d4' }}
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">{client.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{client.industry}</div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2">
                            <div className="font-mono font-bold text-cyan-300 text-[11px]">
                              {clientAnalystsCount} Analysts
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono">
                              {client.activeAlerts} alerts
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Native Select for Quick Access & Accessibility */}
            <select
              aria-label="Select client name"
              value={selectedClientId}
              onChange={(e) => onSelectClient(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer"
            >
              <option value="all">🏢 All Clients (All 3 Pods • 9 Analysts)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (3 Analysts on Duty)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Client Filter Switcher Pills */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold mr-1 shrink-0">
            Quick Scope:
          </span>
          <button
            type="button"
            onClick={() => onSelectClient('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedClientId === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Clients (9 Analysts)
          </button>
          {clients.map((client) => {
            const isSelected = selectedClientId === client.id;
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => onSelectClient(client.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500 font-bold shadow-sm shadow-cyan-950/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: client.logoColor || '#06b6d4' }}
                />
                <span>{client.name.split(' ')[0]}</span>
                <span className="text-[10px] font-mono text-slate-500">(3)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DEDICATED CLIENT SCOPE CURRENT SHIFT & ANALYST WORKLOAD SHOWCASE PANEL   */}
      {/* ========================================================================= */}
      {isClientScoped && activeClient && (
        <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-xl p-5 shadow-xl shadow-cyan-950/20 space-y-4">
          {/* Client Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: `${activeClient.logoColor}25`, border: `1.5px solid ${activeClient.logoColor}` }}
              >
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: activeClient.logoColor }} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{activeClient.name}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {activeClient.code}
                    </span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    {displayShift1Human} Dedicated Analysts Working on Shift 1 (Alpha)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Industry: <strong className="text-slate-300">{activeClient.industry}</strong> • Criticality:{' '}
                  <span className="text-rose-400 font-bold">{activeClient.criticality}</span> • Operating Hours:{' '}
                  <span className="text-slate-300 font-mono">Shift 1 (08:00 - 16:00 UTC)</span>
                </p>
              </div>
            </div>

            {/* Alert Count Sort Controls & Show All Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
                <span className="text-slate-400 text-xs px-2 font-medium flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  Sort Alert Count:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSortField('wip');
                    setSortDirection('desc');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sortField === 'wip' && sortDirection === 'desc'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                  title="Sort analysts from highest to lowest alert count"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>High to Low</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortField('wip');
                    setSortDirection('asc');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sortField === 'wip' && sortDirection === 'asc'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                  title="Sort analysts from lowest to highest alert count"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Low to High</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onSelectClient('all')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-all border border-slate-700 flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                <span>Show All Clients</span>
              </button>
            </div>
          </div>

          {/* 4 Client-Scoped Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Users2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Shift 1 Dedicated Staffing</span>
              </div>
              <div className="text-2xl font-mono font-bold text-white mt-1">
                {displayShift1Human}{' '}
                <span className="text-xs font-normal text-cyan-400 font-sans">Analysts on Duty</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">T1 Triage • T2 IR Lead • T3 Hunter</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-indigo-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Client InProgress Alerts</span>
              </div>
              <div className="text-2xl font-mono font-bold text-indigo-400 mt-1">
                {displayShift1Wip}{' '}
                <span className="text-xs font-normal text-slate-400 font-sans">Active Cases</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Avg {displayAvgShift1Wip} Alerts / Dedicated Analyst
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-rose-400 flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Overloaded Analysts</span>
              </div>
              <div className="text-2xl font-mono font-bold text-rose-400 mt-1">
                {displayOverloadedAnalysts.length}{' '}
                <span className="text-xs text-slate-400 font-normal">/ {displayShift1Human} Dedicated</span>
              </div>
              <div className="text-[10px] text-rose-400/80 mt-0.5">Alerts &ge; 14 or SLA Risk &ge; 2</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-amber-400 flex items-center gap-1.5 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>SLA Breach Pressures</span>
              </div>
              <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
                {displayTotalSlaRisks}{' '}
                <span className="text-xs font-normal text-slate-400 font-sans">Cases &lt;30m</span>
              </div>
              <div className="text-[10px] text-amber-400/80 mt-0.5">Immediate attention required</div>
            </div>
          </div>

          {/* Dedicated Analyst Cards for this Client */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>Analysts Assigned to {activeClient.name} on Current Shift</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                  Sorted: {sortDirection === 'desc' ? 'Alerts High → Low' : 'Alerts Low → High'}
                </span>
              </h4>
              <span className="text-slate-400 text-xs">
                Target: 12 cases / analyst • Max capacity: 15 cases
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredAnalysts.map((analyst, index) => {
                const isOverloaded = analyst.wip >= 14 || analyst.slaRisk >= 2;
                const isOptimal = analyst.wip <= 8 && analyst.slaRisk === 0;
                const capacityPct = Math.min(100, Math.round((analyst.wip / 15) * 100));

                return (
                  <div
                    key={analyst.id}
                    className={`rounded-xl p-4 border transition-all shadow-sm flex flex-col justify-between ${
                      isOverloaded
                        ? 'bg-rose-950/20 border-rose-500/50 shadow-rose-950/20'
                        : isOptimal
                        ? 'bg-slate-950 border-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top Row: Rank, Avatar, Name, Tier */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800/80">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            <img
                              src={analyst.avatar}
                              alt={analyst.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 shadow-sm shrink-0"
                            />
                            <span
                              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center text-white border border-slate-900 ${
                                index === 0
                                  ? 'bg-amber-500'
                                  : index === 1
                                  ? 'bg-slate-500'
                                  : 'bg-slate-700'
                              }`}
                              title={`Rank #${index + 1} by alert count`}
                            >
                              #{index + 1}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                              <span>{getAnalystDisplayName(analyst)}</span>
                            </div>
                            <div className="text-[11px] text-cyan-400 font-mono truncate">{analyst.tier}</div>
                            <div className="text-[10px] text-slate-500 truncate">{analyst.email}</div>
                          </div>
                        </div>

                        {/* Overloaded / Status Badge */}
                        {isOverloaded ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse shrink-0">
                            OVERLOADED
                          </span>
                        ) : isOptimal ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                            OPTIMAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            BALANCED
                          </span>
                        )}
                      </div>

                      {/* Prominent Alert Count Card */}
                      <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                              Active InProgress Cases
                            </span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span
                                className={`text-3xl font-mono font-bold ${
                                  isOverloaded ? 'text-rose-400' : 'text-cyan-300'
                                }`}
                              >
                                {analyst.wip}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">Alerts Under Analysis</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-mono block">Total Owned</span>
                            <span className="text-sm font-mono font-bold text-white">
                              {analyst.totalAlerts} cases
                            </span>
                          </div>
                        </div>

                        {/* Capacity Meter Bar */}
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                            <span>WIP Load Capacity</span>
                            <span className={isOverloaded ? 'text-rose-400 font-bold' : ''}>
                              {analyst.wip} / 12 target ({capacityPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
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

                        {/* Severity & SLA Risk Breakdown */}
                        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                              {analyst.critical} Crit
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                              {analyst.high} High
                            </span>
                          </div>

                          {analyst.slaRisk > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-rose-400" />
                              {analyst.slaRisk} SLA Risks (&lt;30m)
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                              <CheckCircle className="w-3 h-3" />
                              SLA Safe
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dual-Client Alert Load Breakdown */}
                      <DualClientAlertLoadBadge analyst={analyst} selectedClientId={selectedClientId} />

                      {/* Current Investigation Topic */}
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-cyan-400" />
                          <span>Active Focus:</span>
                        </div>
                        <p className="text-slate-200 line-clamp-2 leading-relaxed text-[11px]">
                          {analyst.currentFocus || 'Investigating correlated multi-platform alerts and telemetry.'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Inspect & My SOC Action Buttons */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAnalystForModal(analyst)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Inspect ({analyst.wip})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectAnalystPerspective(analyst.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Switch perspective to this analyst"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-indigo-300" />
                        <span>My SOC</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: SHIFT CAPACITY OVERVIEW PER SHIFT (54 TOTAL SOC ANALYSTS)      */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                SOC Shift Capacity Matrix &amp; 24/7 Roster (27 Total Analysts)
              </span>
              <span className="text-[11px] text-slate-400">
                Visualizing capacity headroom, staffing levels, and active workload across all 3 SOC operating shifts
              </span>
            </div>
          </div>

          {/* Current Active Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">CURRENT ACTIVE SHIFT:</span>
            <span className="font-mono font-bold text-white">Shift 1 — Alpha (08:00 - 16:00 UTC)</span>
          </div>
        </div>

        {/* 3 Shifts Capacity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5">
          {shiftCapacities.map((shift) => (
            <div
              key={shift.id}
              onClick={() => setActiveShiftId(shift.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                shift.isActive
                  ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/30'
                  : activeShiftId === shift.id
                  ? 'bg-slate-950 border-cyan-500/50 ring-1 ring-cyan-500/20'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-300">{shift.code}</span>
                    {shift.isActive ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active On Duty
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                        {shift.status}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-sm mt-1">{shift.name}</h4>
                  <div className="text-[11px] text-slate-400 font-mono">{shift.hours}</div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-mono font-bold text-cyan-300">
                    {shift.analystCount}
                    <span className="text-xs font-normal text-slate-400 font-sans ml-1">analysts</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">3 / client pod</div>
                </div>
              </div>

              {/* Shift Capacity Bar & Metrics */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                  <span className="text-slate-400">
                    {shift.isActive ? 'Active Shift Workload:' : 'Standby Capacity Target:'}
                  </span>
                  <span className={shift.isActive ? 'font-bold text-cyan-300' : 'text-slate-400'}>
                    {shift.isActive ? `${shift.currentWip} / ${shift.totalCapacity} cases` : `${shift.totalCapacity} cases max`}
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      shift.isActive
                        ? shift.utilizationPct > 80
                          ? 'bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500'
                          : 'bg-cyan-500'
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${Math.min(100, shift.isActive ? shift.utilizationPct : 0)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                  <span>
                    Utilization:{' '}
                    <strong className={shift.isActive ? 'text-amber-400' : 'text-slate-400'}>
                      {shift.isActive ? `${shift.utilizationPct}% (High)` : '0% (Standby)'}
                    </strong>
                  </span>
                  <span className="text-indigo-300">{shift.handoverStatus}</span>
                </div>
              </div>

              {/* Shift Lead & Staffing Breakdown */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 truncate max-w-[170px]" title={shift.supervisor}>
                  Lead: {shift.supervisor}
                </span>
                {shift.isActive && (
                  <span className="text-rose-400 font-mono font-bold text-[10px]">
                    {shift.overloadedCount} Overloaded
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1.5: OPERATIONAL READINESS CARD (CURRENT SHIFT BANDWIDTH & LOAD)   */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-indigo-500/40 rounded-xl overflow-hidden shadow-xl shadow-indigo-950/20">
        {/* Card Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-cyan-300 shadow-md shadow-indigo-950/40">
                <Gauge className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    Operational Readiness
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Active Shift Capacity &amp; Human Bandwidth
                    </span>
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 ${
                      isBandwidthCritical
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isBandwidthConstrained
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        isBandwidthCritical
                          ? 'bg-rose-400'
                          : isBandwidthConstrained
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    {isBandwidthCritical
                      ? 'CRITICAL DEFICIT (<5% BUFFER)'
                      : isBandwidthConstrained
                      ? 'CONSTRAINED BANDWIDTH (6.5% HEADROOM)'
                      : 'OPTIMAL HEADROOM (>20% BUFFER)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Summarizes active shift (<strong className="text-slate-200">Shift 1 — Alpha • 08:00–16:00 UTC</strong>) human bandwidth by calculating total vs. available capacity and tracking InProgress alerts managed per analyst.
                </p>
              </div>
            </div>

            {/* Quick Actions & Collapse Toggle */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenRebalanceModal}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>AI Rebalance Load</span>
              </button>

              <button
                onClick={() => setIsReadinessExpanded((prev) => !prev)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-all border border-slate-700"
                title={isReadinessExpanded ? 'Collapse Operational Readiness Card' : 'Expand Operational Readiness Card'}
              >
                <span className="text-[11px] font-mono">{isReadinessExpanded ? 'Hide Details' : 'Show Details'}</span>
                {isReadinessExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Bandwidth Metrics */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Human Bandwidth */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 relative overflow-hidden group hover:border-slate-700 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                  <Users2 className="w-3.5 h-3.5 text-cyan-400" />
                  Total Human Bandwidth
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  100% Ceiling
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-white tracking-tight">
                {totalHumanBandwidthSlots}{' '}
                <span className="text-sm font-sans font-normal text-slate-400">cases</span>
              </div>
              <div className="text-xs font-mono text-cyan-400 mt-0.5">
                {totalHumanBandwidthHours.toFixed(1)} <span className="font-sans text-slate-400">analyst-hours</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400 flex items-center justify-between">
                <span>{totalShift1Human} Human Analysts</span>
                <span className="font-mono text-slate-300">12 target / analyst</span>
              </div>
            </div>

            {/* Card 2: Utilized Human Bandwidth */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 relative overflow-hidden group hover:border-slate-700 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold flex items-center gap-1.5 text-indigo-300">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Utilized Bandwidth
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  {utilizedBandwidthPct}% Consumed
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-indigo-300 tracking-tight">
                {utilizedBandwidthSlots}{' '}
                <span className="text-sm font-sans font-normal text-slate-400">InProgress cases</span>
              </div>
              <div className="text-xs font-mono text-indigo-400 mt-0.5">
                {utilizedBandwidthHours} <span className="font-sans text-slate-400">committed hours</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Active Shift Workload</span>
                <span className="font-mono text-indigo-300 font-bold">Avg {avgShift1Wip} alerts / analyst</span>
              </div>
            </div>

            {/* Card 3: Available Human Bandwidth (Headroom) */}
            <div className={`p-3.5 rounded-xl bg-slate-950 border relative overflow-hidden group transition-colors ${
              availableBandwidthSlots <= 16 ? 'border-amber-500/40 hover:border-amber-500/60' : 'border-slate-800/90 hover:border-slate-700'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold flex items-center gap-1.5 text-emerald-300">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Available Human Bandwidth
                </span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    availableBandwidthSlots <= 16
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  +{availableBandwidthPct}% Headroom
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-300 tracking-tight">
                +{availableBandwidthSlots}{' '}
                <span className="text-sm font-sans font-normal text-slate-400">cases remaining</span>
              </div>
              <div className="text-xs font-mono text-emerald-400 mt-0.5">
                +{availableBandwidthHours} <span className="font-sans text-slate-400">available buffer hours</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Headroom Health</span>
                <span className={`font-mono font-bold ${availableBandwidthSlots <= 16 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {availableBandwidthSlots <= 16 ? 'Strained Buffer (<10%)' : 'Healthy Buffer'}
                </span>
              </div>
            </div>

            {/* Card 4: Operational Readiness Score */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 relative overflow-hidden group hover:border-slate-700 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold flex items-center gap-1.5 text-rose-300">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  Readiness Posture
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                  {overloadedShift1Analysts.length} Overloaded
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-white tracking-tight flex items-baseline gap-2">
                <span className={readinessScore < 75 ? 'text-amber-400' : 'text-emerald-400'}>{readinessScore}%</span>
                <span className="text-xs font-sans font-semibold text-slate-300 uppercase">{readinessStatus.label}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 truncate">
                {shift1HumanAnalysts.length - overloadedShift1Analysts.length} of {shift1HumanAnalysts.length} analysts within safe load
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400 flex items-center justify-between">
                <span>SLA Risk Exposure</span>
                <span className="font-mono text-rose-400 font-bold">{totalShift1SlaRisks} alerts under SLA pressure</span>
              </div>
            </div>
          </div>

          {/* Visual Bandwidth Allocation Spectrum Bar */}
          <div className="mt-3.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between text-xs mb-1.5 font-mono">
              <span className="text-slate-300 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold font-sans">Shift Human Bandwidth Spectrum:</span>
                <span className="text-indigo-300 font-bold">{utilizedBandwidthSlots} Cases Utilized ({utilizedBandwidthPct}%)</span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400 font-bold">+{availableBandwidthSlots} Cases Headroom ({availableBandwidthPct}%)</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                Total Nominal Capacity: <strong className="text-white">{totalHumanBandwidthSlots} Cases</strong> ({totalHumanBandwidthHours} hrs)
              </span>
            </div>

            {/* Multi-segmented Bar */}
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800 relative">
              <div
                style={{ width: `${Math.min(100, utilizedBandwidthPct)}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500 transition-all relative group"
                title={`Utilized Bandwidth: ${utilizedBandwidthSlots} cases (${utilizedBandwidthPct}%)`}
              />
              <div
                style={{ width: `${Math.max(0, 100 - Math.min(100, utilizedBandwidthPct))}%` }}
                className="h-full bg-emerald-500/60 transition-all border-l border-emerald-400/40 relative"
                title={`Available Human Bandwidth Headroom: ${availableBandwidthSlots} cases (${availableBandwidthPct}%)`}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Committed: {utilizedBandwidthSlots} Active Cases ({utilizedBandwidthHours} hrs)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Available Headroom: +{availableBandwidthSlots} Cases ({availableBandwidthHours} hrs)
                </span>
              </div>
              <div className="flex items-center gap-1 text-amber-300 font-sans">
                <Info className="w-3 h-3 text-amber-400" />
                <span>Headroom is {availableBandwidthPct}%. Rebalancing advised before incoming spike.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Section: Per-Analyst InProgress Alerts Breakdown & Tier Distribution */}
        {isReadinessExpanded && (
          <div className="p-4 bg-slate-900/90 space-y-4">
            {/* View Switcher: Analyst Roster vs Tier Distribution */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReadinessTab('roster')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    readinessTab === 'roster'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Users2 className="w-3.5 h-3.5" />
                  <span>InProgress Alerts Per Analyst ({shift1HumanAnalysts.length} Active Analysts)</span>
                </button>

                <button
                  onClick={() => setReadinessTab('tiers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    readinessTab === 'tiers'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Bandwidth Breakdown by SOC Tier (T1, T2, T3)</span>
                </button>
              </div>

              {/* Status breakdown pills */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Shift 1 Human Status:</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {overloadedShift1Analysts.length} Overloaded (0% buffer)
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {balancedShift1Analysts.length} Near Capacity
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {optimalShift1Analysts.length} Available Buffer
                </span>
              </div>
            </div>

            {/* TAB 1: PER-ANALYST IN-PROGRESS ALERTS ROSTER */}
            {readinessTab === 'roster' && (
              <div className="space-y-3">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Search Input */}
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search analyst by name, client, or investigation topic..."
                      value={readinessSearch}
                      onChange={(e) => setReadinessSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setReadinessFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        readinessFilter === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      All 9 Analysts ({shift1HumanAnalysts.length})
                    </button>
                    <button
                      onClick={() => setReadinessFilter('overloaded')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        readinessFilter === 'overloaded'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-950 text-rose-400 hover:text-rose-300 border border-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      Overloaded / Deficit ({overloadedShift1Analysts.length})
                    </button>
                    <button
                      onClick={() => setReadinessFilter('near-capacity')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        readinessFilter === 'near-capacity'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-950 text-amber-400 hover:text-amber-300 border border-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Near Capacity ({balancedShift1Analysts.length})
                    </button>
                    <button
                      onClick={() => setReadinessFilter('available')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        readinessFilter === 'available'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-950 text-emerald-400 hover:text-emerald-300 border border-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Available Buffer ({optimalShift1Analysts.length})
                    </button>
                  </div>

                  {/* Sort options */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setReadinessSort('wip-desc')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                        readinessSort === 'wip-desc' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Sort by highest InProgress alerts"
                    >
                      Highest InProgress
                    </button>
                    <button
                      onClick={() => setReadinessSort('wip-asc')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                        readinessSort === 'wip-asc' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Sort by lowest InProgress alerts"
                    >
                      Lowest InProgress
                    </button>
                    <button
                      onClick={() => setReadinessSort('headroom-desc')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                        readinessSort === 'headroom-desc' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Sort by most available bandwidth headroom"
                    >
                      Most Headroom
                    </button>
                  </div>
                </div>

                {/* 9 Analyst Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredReadinessAnalysts.map((analyst) => (
                    <div
                      key={analyst.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        analyst.isOverloaded
                          ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70 shadow-sm'
                          : analyst.isNearCapacity
                          ? 'bg-slate-950 border-amber-500/30 hover:border-amber-500/50'
                          : 'bg-slate-950 border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      {/* Top Row: Analyst Identity */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={analyst.avatar}
                            alt={analyst.name}
                            className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-white text-xs leading-none">{getAnalystDisplayName(analyst)}</h5>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-300">
                                {analyst.tier.replace('Tier ', 'T').split(' ')[0]}
                              </span>
                            </div>
                            <div className="text-[11px] text-cyan-400 font-mono mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[130px]" title={analyst.client}>{analyst.client}</span>
                            </div>
                          </div>
                        </div>

                        {/* InProgress Count Badge */}
                        <div className="text-right">
                          <div className={`text-base font-mono font-bold leading-tight ${
                            analyst.isOverloaded ? 'text-rose-400' : analyst.isNearCapacity ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {analyst.wip}
                            <span className="text-[11px] font-sans font-normal text-slate-400 ml-1">InProgress</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {analyst.utilPct}% capacity
                          </div>
                        </div>
                      </div>

                      {/* Bandwidth Headroom Bar & Buffer Metric */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="text-slate-400">Bandwidth Headroom:</span>
                          {analyst.availableBuffer < 0 ? (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              {Math.abs(analyst.availableBuffer)} Cases Over Cap
                            </span>
                          ) : analyst.availableBuffer === 0 ? (
                            <span className="text-amber-400 font-bold">At 100% Target Cap</span>
                          ) : (
                            <span className="text-emerald-400 font-bold">
                              +{analyst.availableBuffer} Slots Available
                            </span>
                          )}
                        </div>

                        {/* Individual Bandwidth Bar */}
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                          <div
                            style={{ width: `${Math.min(100, analyst.utilPct)}%` }}
                            className={`h-full rounded-full transition-all ${
                              analyst.isOverloaded
                                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                : analyst.isNearCapacity
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Severity Breakdown & SLA Pressure */}
                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                            {analyst.critical} Crit
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            {analyst.high} High
                          </span>
                          <span className="text-slate-500">
                            {analyst.medium + analyst.low} Med/Low
                          </span>
                        </div>

                        {analyst.slaRisk > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {analyst.slaRisk} SLA Risk
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            SLA Safe
                          </span>
                        )}
                      </div>

                      {/* Current Focus Topic */}
                      {analyst.currentFocus && (
                        <div className="mt-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800/60 truncate" title={analyst.currentFocus}>
                          <span className="text-indigo-400 font-semibold">Focus: </span>
                          {analyst.currentFocus}
                        </div>
                      )}

                      {/* Quick Inspect & Perspective Buttons */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedAnalystForModal(analyst)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Inspect ({analyst.wip})</span>
                        </button>

                        <button
                          onClick={() => onSelectAnalystPerspective(analyst.id)}
                          className="px-2 py-1 rounded bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-700/50 text-indigo-200 text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <UserCheck className="w-3 h-3 text-indigo-300" />
                          <span>My SOC Perspective</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredReadinessAnalysts.length === 0 && (
                  <div className="text-center py-8 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs">
                    No analysts found matching the current search &amp; filter criteria.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TIER BANDWIDTH DISTRIBUTION */}
            {readinessTab === 'tiers' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {tierBandwidthBreakdown.map((t) => (
                  <div key={t.tier} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                          {t.label}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5">{t.tier}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{t.desc}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-mono font-bold text-cyan-300">
                          {t.count} <span className="text-xs font-normal text-slate-400">analysts</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Total Tier Bandwidth:</span>
                        <span className="font-bold text-white">{t.totalTierBandwidth} cases</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-indigo-300">Active InProgress Cases:</span>
                        <span className="font-bold text-indigo-300">{t.tierWip} cases ({t.tierUtilPct}%)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-emerald-400">Available Headroom:</span>
                        <span className="font-bold text-emerald-400">
                          {t.tierAvailable >= 0 ? `+${t.tierAvailable} cases` : `${t.tierAvailable} deficit`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, t.tierUtilPct)}%` }}
                          className={`h-full rounded-full ${
                            t.tierUtilPct > 100
                              ? 'bg-rose-500'
                              : t.tierUtilPct > 85
                              ? 'bg-amber-500'
                              : 'bg-cyan-500'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                        <span className="text-rose-400 font-semibold">{t.tierOverloaded} Overloaded Analysts</span>
                        <span className="text-amber-400">{t.tierSlaRisks} SLA Risks</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: SUBTAB NAVIGATION                                              */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 flex-wrap">
        <button
          onClick={() => setActiveViewMode('inprogress')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeViewMode === 'inprogress'
              ? 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-cyan-950/40 border border-cyan-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Zap className="w-4 h-4 text-cyan-300" />
          <span>
            ⚡ Current Shift (Alpha): In-Progress Alerts {isClientScoped ? `for ${activeClient?.name}` : 'per Analyst'} ({displayShift1Wip} Active Cases • {displayShift1Human} Analysts)
          </span>
        </button>

        <button
          onClick={() => setActiveViewMode('shifts-roster')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeViewMode === 'shifts-roster'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Users2 className="w-4 h-4 text-slate-400" />
          <span>🏢 24/7 Shift Capacity &amp; Client Roster Matrix</span>
        </button>

        <button
          onClick={() => setActiveViewMode('workload-table')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeViewMode === 'workload-table'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-400" />
          <span>📋 9-Analyst Full Workload Table</span>
        </button>

        <button
          onClick={() => setActiveViewMode('maturity-matrix')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeViewMode === 'maturity-matrix'
              ? 'bg-gradient-to-r from-amber-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-amber-950/40 border border-amber-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>🎯 Analyst Alert &amp; Tool Maturity Matrix (Skills, Alerts Worked &amp; Tool Strengths)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: CURRENT SHIFT (SHIFT 1) IN-PROGRESS ALERTS PER ANALYST          */}
      {/* ========================================================================= */}
      {activeViewMode === 'inprogress' && (
        <div className="space-y-4">
          {/* Current Shift Operational KPI Banner */}
          <div className="bg-slate-900/90 border border-indigo-500/40 rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>
                      Shift 1 — Alpha Capacity: In-Progress Alerts {isClientScoped ? `— ${activeClient?.name}` : 'per Analyst'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      08:00 - 16:00 UTC
                    </span>
                    {isClientScoped && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Client Scope Active
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isClientScoped
                      ? `Showing ${displayShift1Human} dedicated analysts working on Shift 1 for ${activeClient?.name}, sorted by alert count.`
                      : 'Showing real-time InProgress case counts, SLA deadline pressures, and capacity meters for all 9 dedicated analysts on duty.'}
                  </p>
                </div>
              </div>

              {/* AI Workload Rebalance Trigger */}
              <button
                onClick={onOpenRebalanceModal}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-medium flex items-center gap-2 shadow-md shadow-amber-950/40 cursor-pointer transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>AI Rebalance Engine ({displayOverloadedAnalysts.length} Overloaded Analysts)</span>
              </button>
            </div>

            {/* 4 Summary Capacity Metric Cards for Current Shift */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Users2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Shift 1 Staffing {isClientScoped && `(${activeClient?.name})`}</span>
                </div>
                <div className="text-xl font-mono font-bold text-white mt-1">
                  {displayShift1Human}{' '}
                  <span className="text-xs font-normal text-cyan-400 font-sans">
                    {isClientScoped ? 'Dedicated' : '+ 1 Virtual FusionAI'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {isClientScoped ? `${activeClient?.industry}` : '3 Analysts / Enterprise Pod'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-indigo-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Total InProgress Alerts</span>
                </div>
                <div className="text-xl font-mono font-bold text-indigo-400 mt-1">{displayShift1Wip} Alerts</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Avg {displayAvgShift1Wip} Active Alerts / Analyst
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-rose-400 flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Overloaded Analysts</span>
                </div>
                <div className="text-xl font-mono font-bold text-rose-400 mt-1">
                  {displayOverloadedAnalysts.length}{' '}
                  <span className="text-xs text-slate-400 font-normal">/ {displayShift1Human} on Shift 1</span>
                </div>
                <div className="text-[10px] text-rose-400/80 mt-0.5">WIP &ge; 14 or SLA risk &ge; 2</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-amber-400 flex items-center gap-1.5 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>SLA Breach Risks</span>
                </div>
                <div className="text-xl font-mono font-bold text-amber-400 mt-1">{displayTotalSlaRisks} Alerts</div>
                <div className="text-[10px] text-amber-400/80 mt-0.5">&lt;30m until SLA breach on Shift 1</div>
              </div>
            </div>
          </div>

          {/* FILTER & VIEW LAYOUT TOOLBAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by analyst name, client, or investigation topic..."
                value={searchAnalyst}
                onChange={(e) => setSearchAnalyst(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Client Filter */}
              <select
                aria-label="Filter analysts by client"
                value={selectedClientId}
                onChange={(e) => onSelectClient(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none"
              >
                <option value="all">All Clients (3 Enterprise Pods)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Workload Status Filter */}
              <select
                aria-label="Filter analysts by load status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none"
              >
                <option value="all">All Capacity States</option>
                <option value="overloaded">🔴 Overloaded (WIP &ge; 14)</option>
                <option value="slarisk">⏱️ With SLA Risks (&gt;0)</option>
                <option value="optimal">🟢 Optimal Capacity (WIP &le; 8)</option>
              </select>

              {/* InProgress Visualization Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setInprogressLayout('pods')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    inprogressLayout === 'pods'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Group by Client Pods (3 dedicated analysts per client)"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Client Pods</span>
                </button>

                <button
                  onClick={() => setInprogressLayout('ranking')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    inprogressLayout === 'ranking'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="View horizontal capacity distribution ranking all 9 analysts"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Capacity Ranking</span>
                </button>

                <button
                  onClick={() => setInprogressLayout('cards')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    inprogressLayout === 'cards'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="View cards grid"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Cards Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* QUICK SORT BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-medium">Sort InProgress Alerts:</span>
              <button
                onClick={() => {
                  setSortField('wip');
                  setSortDirection('desc');
                }}
                className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  sortField === 'wip' && sortDirection === 'desc'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Highest InProgress Alerts (High → Low)</span>
              </button>

              <button
                onClick={() => {
                  setSortField('wip');
                  setSortDirection('asc');
                }}
                className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  sortField === 'wip' && sortDirection === 'asc'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lowest InProgress Alerts</span>
              </button>

              <button
                onClick={() => {
                  setSortField('slaRisk');
                  setSortDirection('desc');
                }}
                className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  sortField === 'slaRisk' && sortDirection === 'desc'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Most SLA Risks</span>
              </button>

              <button
                onClick={() => {
                  setSortField('name');
                  setSortDirection('asc');
                }}
                className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  sortField === 'name' && sortDirection === 'asc'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Analyst Name (A → Z)</span>
              </button>
            </div>

            <span className="text-slate-400 font-mono text-[11px]">
              Showing {filteredAnalysts.length} of {analysts.length} analysts on Shift 1
            </span>
          </div>

          {/* Dedicated Client Scope Active Banner */}
          {isClientScoped && activeClient && (
            <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full ring-2 ring-cyan-500/40" style={{ backgroundColor: activeClient.logoColor }} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{activeClient.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {displayShift1Human} Analysts Working on Current Shift (Shift 1 Alpha)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Total Client Alerts: <strong className="text-white font-mono">{activeClient.activeAlerts}</strong> • InProgress Cases: <strong className="text-indigo-300 font-mono">{displayShift1Wip}</strong> • SLA Risks: <strong className={displayTotalSlaRisks > 0 ? "text-rose-400 font-mono" : "text-emerald-400 font-mono"}>{displayTotalSlaRisks}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs">
                  <span className="text-slate-400 text-[10px] px-1.5 font-medium">Sort Alerts:</span>
                  <button
                    onClick={() => {
                      setSortField('wip');
                      setSortDirection('desc');
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      sortField === 'wip' && sortDirection === 'desc'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowDown className="w-3 h-3 text-cyan-400" />
                    <span>High to Low</span>
                  </button>
                  <button
                    onClick={() => {
                      setSortField('wip');
                      setSortDirection('asc');
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      sortField === 'wip' && sortDirection === 'asc'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowUp className="w-3 h-3 text-cyan-400" />
                    <span>Low to High</span>
                  </button>
                </div>

                <button
                  onClick={() => onSelectClient('all')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Show All Clients
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LAYOUT OPTION 1: CLIENT PODS (3 DEDICATED ANALYSTS PER CLIENT POD)        */}
          {/* ========================================================================= */}
          {inprogressLayout === 'pods' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientPods.map(({ client, podAnalysts, podWip, podSlaRisk, podCriticalHigh }) => (
                <div
                  key={client.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors"
                >
                  <div>
                    {/* Pod Header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: client.logoColor }}
                          />
                          <h4 className="font-bold text-white text-sm">{client.name}</h4>
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5 block">{client.industry}</span>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-400 mr-1.5">Pod InProgress</span>
                          <span className="text-lg font-mono font-bold text-cyan-400">{podWip}</span>
                          <span className="text-[10px] text-slate-500 font-mono ml-1">alerts</span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] font-mono">
                          <button
                            onClick={() => {
                              setSortField('wip');
                              setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                            }}
                            className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                            title="Toggle Alert Count Sorting High to Low / Low to High"
                          >
                            {sortDirection === 'desc' ? 'Alerts ↓ High' : 'Alerts ↑ Low'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 3 Dedicated Analysts Assigned on Shift 1 */}
                    <div className="mt-3 space-y-2.5">
                      {podAnalysts.map((analyst) => {
                        const isOverloaded = analyst.wip >= 14 || analyst.slaRisk >= 2;
                        const isOptimal = analyst.wip <= 8 && analyst.slaRisk === 0;
                        const capacityPct = Math.min(100, Math.round((analyst.wip / 15) * 100));

                        return (
                          <div
                            key={analyst.id}
                            className={`p-3 rounded-lg border text-xs transition-all ${
                              isOverloaded
                                ? 'bg-rose-950/20 border-rose-500/40'
                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={analyst.avatar}
                                  alt={analyst.name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-white text-xs truncate">
                                    {getAnalystDisplayName(analyst)}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">{analyst.tier}</div>
                                </div>
                              </div>

                              {/* Prominent In-Progress Alert Count Badge */}
                              <div className="text-right shrink-0">
                                <span
                                  className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs inline-flex items-center gap-1.5 ${
                                    isOverloaded
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : isOptimal
                                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                                  }`}
                                >
                                  <span className="text-sm">{analyst.wip}</span>
                                  <span className="text-[10px] font-sans font-normal text-slate-300">InProgress</span>
                                </span>
                              </div>
                            </div>

                            {/* Individual Analyst Capacity Progress Bar */}
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-0.5">
                                <span>Load: {analyst.wip} / 12 target</span>
                                <span className={isOverloaded ? 'text-rose-400 font-bold' : ''}>{capacityPct}%</span>
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

                            {/* Dual-Client Alert Load Breakdown */}
                            <DualClientAlertLoadBadge analyst={analyst} selectedClientId={client.id} compact />

                            {/* Active Investigation Topic */}
                            <div className="mt-2 text-[11px] text-slate-300 line-clamp-1 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800/80">
                              <span className="text-cyan-400 font-mono text-[10px]">Topic: </span>
                              {analyst.currentFocus}
                            </div>

                            {/* Action & SLA status */}
                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                              {analyst.slaRisk > 0 ? (
                                <span className="text-rose-400 font-semibold flex items-center gap-1 text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{analyst.slaRisk} SLA Risk</span>
                                </span>
                              ) : (
                                <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>SLA Healthy</span>
                                </span>
                              )}

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setSelectedAnalystForModal(analyst)}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium cursor-pointer"
                                >
                                  Inspect ({analyst.wip})
                                </button>
                                <button
                                  onClick={() => onSelectAnalystPerspective(analyst.id)}
                                  className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[11px] font-medium cursor-pointer"
                                  title="Switch to My SOC View"
                                >
                                  My SOC
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* LAYOUT OPTION 2: ANALYST CAPACITY RANKING & INPROGRESS DISTRIBUTION CHART */}
          {/* ========================================================================= */}
          {inprogressLayout === 'ranking' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>Current Shift (Shift 1) Analyst InProgress Workload Distribution</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Horizontal capacity chart ranking all analysts by number of InProgress alerts under active analysis against the 12-case target capacity line.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-500" />
                    <span className="text-slate-300">Overloaded (&ge;14)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-400" />
                    <span className="text-slate-300">Near Target (11-13)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-cyan-500" />
                    <span className="text-slate-300">Balanced (9-10)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-slate-300">Optimal (&le;8)</span>
                  </div>
                </div>
              </div>

              {/* Chart Rows */}
              <div className="space-y-3 pt-1">
                {filteredAnalysts.map((analyst) => {
                  const isOverloaded = analyst.wip >= 14 || analyst.slaRisk >= 2;
                  const isOptimal = analyst.wip <= 8 && analyst.slaRisk === 0;
                  const isNearTarget = analyst.wip >= 11 && analyst.wip <= 13;
                  // Max scale 20 alerts
                  const barWidthPercent = Math.min(100, Math.round((analyst.wip / 20) * 100));

                  return (
                    <div
                      key={analyst.id}
                      className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      {/* Analyst Identifier */}
                      <div className="flex items-center gap-3 w-full md:w-64 shrink-0">
                        {analyst.isAiInvestigator ? (
                          <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                        ) : (
                          <img
                            src={analyst.avatar}
                            alt={analyst.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate flex items-center gap-1.5">
                            <span>{getAnalystDisplayName(analyst)}</span>
                            {analyst.isAiInvestigator && (
                              <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300">
                                AI
                              </span>
                            )}
                          </div>
                          {analyst.assignedClients && analyst.assignedClients.length > 0 ? (
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {analyst.assignedClients.map((ac) => (
                                <span
                                  key={ac.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-medium"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ac.color }} />
                                  <span>{ac.shortName}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 truncate">{analyst.client}</div>
                          )}
                        </div>
                      </div>

                      {/* Capacity Bar Visualizer with InProgress Number & Dual-Client Split */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                          <span className="text-slate-400">
                            Tier: {analyst.tier.replace('Tier ', 'T')}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{analyst.wip}</span>
                            <span className="text-slate-400 text-[10px]">InProgress Alerts</span>
                            {analyst.slaRisk > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                {analyst.slaRisk} SLA Risk
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bar with 12 target marker */}
                        <div className="relative w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                          {/* Target line at 60% (12/20) */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
                            style={{ left: '60%' }}
                            title="Target Capacity: 12 alerts"
                          />
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOverloaded
                                ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                                : isNearTarget
                                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                : isOptimal
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                            }`}
                            style={{ width: `${barWidthPercent}%` }}
                          />
                        </div>

                        {/* Dual Client Load Breakdown Chips */}
                        {analyst.clientAlertLoads && analyst.clientAlertLoads.length > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            {analyst.clientAlertLoads.map((load) => (
                              <span
                                key={load.clientId}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-300"
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: load.color }} />
                                <span>{load.shortName}:</span>
                                <strong className="text-white">{load.alertsPicked}</strong>
                                <span className="text-[9px] text-slate-500">picked</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedAnalystForModal(analyst)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium cursor-pointer"
                        >
                          Inspect ({analyst.wip})
                        </button>
                        <button
                          onClick={() => onSelectAnalystPerspective(analyst.id)}
                          className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[11px] font-medium cursor-pointer"
                        >
                          My SOC
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LAYOUT OPTION 3: DETAILED CARDS GRID                                      */}
          {/* ========================================================================= */}
          {inprogressLayout === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAnalysts.map((analyst) => {
                const isOverloaded = analyst.wip >= 14 || analyst.slaRisk >= 2;
                const isOptimal = analyst.wip <= 8 && analyst.slaRisk === 0;
                const capacityPercent = Math.min(100, Math.round((analyst.wip / 15) * 100));

                return (
                  <div
                    key={analyst.id}
                    className={`bg-slate-900 border rounded-xl p-4 transition-all hover:border-slate-600 shadow-sm flex flex-col justify-between ${
                      analyst.isAiInvestigator
                        ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/20 to-slate-900'
                        : isOverloaded
                        ? 'border-rose-500/30'
                        : 'border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Top Row: Avatar, Name, Tier, Client */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {analyst.isAiInvestigator ? (
                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                              <Bot className="w-5 h-5 animate-pulse" />
                            </div>
                          ) : (
                            <img
                              src={analyst.avatar}
                              alt={analyst.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-700 shadow-sm"
                            />
                          )}

                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{getAnalystDisplayName(analyst)}</span>
                              {analyst.isAiInvestigator && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  VIRTUAL AI
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{analyst.tier}</div>
                          </div>
                        </div>

                        {/* Workload Status Badge */}
                        {isOverloaded ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                            OVERLOADED
                          </span>
                        ) : isOptimal ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            OPTIMAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            BALANCED
                          </span>
                        )}
                      </div>

                      {/* Client & Shift Tag */}
                      <div className="mt-3 flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{analyst.client}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Shift 1 — Alpha</span>
                      </div>

                      {/* Big Highlight: In-Progress Under Analysis Count */}
                      <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                              Under Active Analysis
                            </span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span
                                className={`text-2xl font-mono font-bold ${
                                  isOverloaded ? 'text-rose-400' : 'text-cyan-300'
                                }`}
                              >
                                {analyst.wip}
                              </span>
                              <span className="text-xs text-slate-400">In-Progress Alerts</span>
                            </div>
                          </div>

                          {/* SLA Risk Pill */}
                          {analyst.slaRisk > 0 ? (
                            <div className="text-right">
                              <span className="text-[10px] text-rose-400 font-bold block">SLA Risk</span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                {analyst.slaRisk} Alerts &lt;30m
                              </span>
                            </div>
                          ) : (
                            <div className="text-right text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>SLA Healthy</span>
                            </div>
                          )}
                        </div>

                        {/* Workload Capacity Meter */}
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                            <span>Analyst WIP Capacity</span>
                            <span>{analyst.wip} / 12 target ({capacityPercent}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                capacityPercent > 100
                                  ? 'bg-rose-500'
                                  : capacityPercent > 75
                                  ? 'bg-amber-400'
                                  : 'bg-cyan-500'
                              }`}
                              style={{ width: `${Math.min(100, capacityPercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dual-Client Alert Load Breakdown */}
                      <DualClientAlertLoadBadge analyst={analyst} selectedClientId={selectedClientId} />

                      {/* Current Investigation Focus */}
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-cyan-400" />
                          <span>Active Investigation Topic:</span>
                        </div>
                        <p className="text-slate-200 line-clamp-2 leading-relaxed text-[11px]">
                          {analyst.currentFocus || 'Investigating correlated multi-platform alerts and telemetry.'}
                        </p>
                      </div>

                      {/* Preview of In-Progress Cases */}
                      {analyst.activeInProgressCases && analyst.activeInProgressCases.length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          <div className="text-[10px] text-slate-500 uppercase font-mono">
                            Recent Cases Under Analysis ({analyst.activeInProgressCases.length}):
                          </div>
                          {analyst.activeInProgressCases.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className="p-1.5 rounded bg-slate-950 border border-slate-800 text-[10px] flex items-center justify-between gap-2"
                            >
                              <div className="truncate text-slate-300">
                                <span
                                  className={`px-1 py-0.2 rounded font-mono font-bold mr-1.5 ${
                                    item.severity === 'Critical'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : item.severity === 'High'
                                      ? 'bg-orange-500/20 text-orange-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}
                                >
                                  {item.severity}
                                </span>
                                {item.clientShort && (
                                  <span className="px-1.5 py-0.2 rounded font-mono font-bold mr-1.5 bg-cyan-950/80 text-cyan-300 border border-cyan-800 text-[9px]">
                                    {item.clientShort}
                                  </span>
                                )}
                                <span>{item.title}</span>
                              </div>
                              <span className="font-mono text-slate-400 shrink-0">{item.durationMinutes}m</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => setSelectedAnalystForModal(analyst)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Inspect InProgress ({analyst.wip})</span>
                      </button>

                      <button
                        onClick={() => onSelectAnalystPerspective(analyst.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>My SOC</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: 24/7 SHIFT CAPACITY & CLIENT ROSTER MATRIX                     */}
      {/* ========================================================================= */}
      {activeViewMode === 'shifts-roster' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SOC_SHIFTS.map((shift) => (
              <div
                key={shift.id}
                className={`p-4 rounded-xl border bg-slate-900 ${
                  shift.status === 'Active'
                    ? 'border-indigo-500/50 shadow-lg shadow-indigo-950/40'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-400">{shift.code}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      shift.status === 'Active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {shift.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mt-1">{shift.name}</h3>
                <div className="text-xs text-indigo-300 font-mono mt-0.5">{shift.hours}</div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Shift Analysts:</span>
                    <strong className="text-white font-mono">{shift.analystsCount} Analysts</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Pod Staffing Ratio:</span>
                    <strong className="text-cyan-400 font-mono">6 Analysts / Client (Dual-Assigned)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Clients Covered:</span>
                    <strong className="text-slate-200">3 Enterprise Accounts</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Shift Supervisor:</span>
                    <span className="text-slate-300 font-medium text-xs">{shift.leadSupervisor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Client Pod Staffing Allocation Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Shift 1 Dual-Client Analyst Allocation (6 Assigned Analysts per Client)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Each analyst is assigned to 2 clients for continuous coverage and alert load balancing, providing 6 active analysts per enterprise client account.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clients
                .filter((c) => selectedClientId === 'all' || c.id === selectedClientId)
                .map((c) => {
                  const clientAnalysts = analysts
                    .filter((a) => (a.clientId === c.id || a.clientIds?.includes(c.id)) && !a.isAiInvestigator)
                    .sort((a, b) => (sortDirection === 'desc' ? b.wip - a.wip : a.wip - b.wip));
                  const clientWip = clientAnalysts.reduce((sum, a) => {
                    const load = a.clientAlertLoads?.find((l) => l.clientId === c.id);
                    return sum + (load ? load.alertsPicked : a.wip);
                  }, 0);

                  return (
                    <div key={c.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: c.logoColor || '#06b6d4' }}
                          />
                          <h4 className="font-bold text-white text-xs">{c.name}</h4>
                        </div>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {clientWip} Pod Alerts
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-800">
                        {clientAnalysts.map((a) => {
                          const thisClientLoad = a.clientAlertLoads?.find((l) => l.clientId === c.id);
                          return (
                            <div
                              key={a.id}
                              className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <img src={a.avatar} alt={a.name} className="w-5 h-5 rounded-full object-cover" />
                                <div>
                                  <div className="text-slate-200 font-medium text-[11px]">{getAnalystDisplayName(a)}</div>
                                  <div className="text-[9px] text-slate-500">{a.tier.replace('Tier ', 'T')}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                    a.wip >= 14
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : a.wip >= 9
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {thisClientLoad ? `${thisClientLoad.alertsPicked} alerts` : `${a.wip} WIP`}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                                  {a.wip} total
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: 18-ANALYST FULL WORKLOAD TABLE                                 */}
      {/* ========================================================================= */}
      {activeViewMode === 'workload-table' && (
        <div className="space-y-4">
          {/* Quick Sort Buttons for Case Ownership */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-medium">Quick Sort Cases:</span>
              <button
                onClick={() => {
                  setSortField('totalAlerts');
                  setSortDirection('desc');
                }}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  sortField === 'totalAlerts' && sortDirection === 'desc'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Highest Cases Owned (High → Low)</span>
              </button>

              <button
                onClick={() => {
                  setSortField('totalAlerts');
                  setSortDirection('asc');
                }}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  sortField === 'totalAlerts' && sortDirection === 'asc'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lowest Cases Owned (Low → High)</span>
              </button>

              <button
                onClick={() => {
                  setSortField('wip');
                  setSortDirection('desc');
                }}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  sortField === 'wip' && sortDirection === 'desc'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Highest Active WIP (High → Low)</span>
              </button>

              <button
                onClick={() => {
                  setSortField('wip');
                  setSortDirection('asc');
                }}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  sortField === 'wip' && sortDirection === 'asc'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
                <span>Lowest Active WIP (Low → High)</span>
              </button>
            </div>
          </div>

          {/* Main 9-Analyst Workload Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-mono border-b border-slate-800 select-none">
                  <tr>
                    {/* Analyst Name */}
                    <th
                      onClick={() => handleSort('name')}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Analyst</span>
                        {getSortIcon('name')}
                      </div>
                    </th>

                    {/* Client Name */}
                    <th
                      onClick={() => handleSort('client')}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Assigned Client</span>
                        {getSortIcon('client')}
                      </div>
                    </th>

                    {/* Total Alerts / Cases Owned */}
                    <th
                      onClick={() => handleSort('totalAlerts')}
                      className="py-3 px-4 cursor-pointer hover:text-cyan-300 transition-colors group bg-slate-900/60"
                    >
                      <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                        <span>Total Cases Owned</span>
                        {getSortIcon('totalAlerts')}
                      </div>
                    </th>

                    {/* Active WIP / In Progress */}
                    <th
                      onClick={() => handleSort('wip')}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>WIP / In-Progress</span>
                        {getSortIcon('wip')}
                      </div>
                    </th>

                    {/* Queue Breakdown: Assigned / Pending / Escalated */}
                    <th className="py-3 px-4">Queue State</th>

                    {/* Critical & High */}
                    <th
                      onClick={() => handleSort('criticalHigh')}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Crit / High</span>
                        {getSortIcon('criticalHigh')}
                      </div>
                    </th>

                    {/* SLA Risk */}
                    <th
                      onClick={() => handleSort('slaRisk')}
                      className="py-3 px-4 cursor-pointer hover:text-rose-400 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5 text-rose-400">
                        <span>SLA Risk</span>
                        {getSortIcon('slaRisk')}
                      </div>
                    </th>

                    {/* Aging Distribution */}
                    <th className="py-3 px-4">Aging Breakdown</th>

                    {/* Status / Rebalance Recommendation */}
                    <th className="py-3 px-4 text-right">Workload Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredAnalysts.map((analyst) => {
                    const isOverloaded = analyst.wip >= 14 || analyst.slaRisk >= 2;
                    const isOptimal = analyst.wip <= 8 && analyst.slaRisk === 0;

                    return (
                      <tr
                        key={analyst.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          analyst.isAiInvestigator ? 'bg-cyan-950/20 border-l-2 border-cyan-400' : ''
                        }`}
                      >
                        {/* Analyst Avatar, Name & Tier */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {analyst.isAiInvestigator ? (
                              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                                <Bot className="w-4 h-4 animate-pulse" />
                              </div>
                            ) : (
                              <img
                                src={analyst.avatar}
                                alt={analyst.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-700"
                              />
                            )}

                            <div>
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                <span>{getAnalystDisplayName(analyst)}</span>
                                {analyst.isAiInvestigator && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                    VIRTUAL AI
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">{analyst.tier}</div>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Clients & Load Split */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {analyst.assignedClients && analyst.assignedClients.length > 0 ? (
                                analyst.assignedClients.map((c) => (
                                  <span
                                    key={c.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-medium"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                                    <span>{c.shortName}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="font-medium text-slate-300 text-xs">{analyst.client}</span>
                              )}
                            </div>
                            {analyst.clientAlertLoads && analyst.clientAlertLoads.length > 0 && (
                              <div className="text-[10px] font-mono text-cyan-400/90">
                                {analyst.clientAlertLoads.map((l) => `${l.shortName}: ${l.alertsPicked}`).join(' • ')}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Total Alerts / Cases Owned (Prominent Number) */}
                        <td className="py-3 px-4 whitespace-nowrap bg-slate-900/40">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-mono font-bold text-cyan-300">{analyst.totalAlerts}</span>
                            <span className="text-[10px] text-slate-500 font-mono">cases</span>
                          </div>
                        </td>

                        {/* WIP / In-Progress */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                                analyst.wip >= 14
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : analyst.wip >= 9
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {analyst.wip}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">WIP</span>
                          </div>
                        </td>

                        {/* Queue Breakdown */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300" title="Assigned">
                              {analyst.assigned} A
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300" title="Pending">
                              {analyst.pending} P
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300" title="Escalated">
                              {analyst.escalated} E
                            </span>
                          </div>
                        </td>

                        {/* Crit / High */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className="text-rose-400 font-bold">{analyst.critical} C</span>
                            <span className="text-slate-500">/</span>
                            <span className="text-amber-400 font-bold">{analyst.high} H</span>
                          </div>
                        </td>

                        {/* SLA Risk */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {analyst.slaRisk > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>{analyst.slaRisk} at risk</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Healthy</span>
                            </span>
                          )}
                        </td>

                        {/* Aging Breakdown */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            <span className="text-emerald-400" title="<2 hours">
                              {analyst.aging.lessThan2h}
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className="text-cyan-400" title="2-4 hours">
                              {analyst.aging.twoToFourH}
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className="text-amber-400" title="4-8 hours">
                              {analyst.aging.fourToEightH}
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className="text-orange-400" title="8-24 hours">
                              {analyst.aging.eightToTwentyFourH}
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className="text-rose-400 font-bold" title=">24 hours">
                              {analyst.aging.moreThan24h}
                            </span>
                          </div>
                        </td>

                        {/* Status / Rebalance Recommendation */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isOverloaded ? (
                              <button
                                onClick={onOpenRebalanceModal}
                                className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Sparkles className="w-3 h-3" />
                                Rebalance
                              </button>
                            ) : isOptimal ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                Available
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800">
                                Balanced
                              </span>
                            )}

                            {!analyst.isAiInvestigator && (
                              <button
                                onClick={() => onSelectAnalystPerspective(analyst.id)}
                                className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[10px] font-medium cursor-pointer"
                              >
                                View Queue
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: ANALYST ALERT & TOOL MATURITY MATRIX                            */}
      {/* ========================================================================= */}
      {activeViewMode === 'maturity-matrix' && (
        <AnalystMaturityMatrix
          analysts={analysts}
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClient={onSelectClient}
          onSelectAnalystPerspective={onSelectAnalystPerspective}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECT ALL IN-PROGRESS CASES FOR SELECTED ANALYST                */}
      {/* ========================================================================= */}
      {selectedAnalystForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedAnalystForModal.avatar}
                  alt={selectedAnalystForModal.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-700"
                />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{getAnalystDisplayName(selectedAnalystForModal)}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedAnalystForModal.tier}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedAnalystForModal.client} • {selectedAnalystForModal.shift}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAnalystForModal(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-Progress Summary KPIs */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">In-Progress Alerts</div>
                <div className="text-xl font-mono font-bold text-cyan-300 mt-0.5">
                  {selectedAnalystForModal.wip}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Total Cases Owned</div>
                <div className="text-xl font-mono font-bold text-slate-200 mt-0.5">
                  {selectedAnalystForModal.totalAlerts}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-rose-400 uppercase font-mono">SLA Risks</div>
                <div className="text-xl font-mono font-bold text-rose-400 mt-0.5">
                  {selectedAnalystForModal.slaRisk}
                </div>
              </div>
            </div>

            {/* Dual-Client Alert Allocation & Workload Split */}
            {selectedAnalystForModal.clientAlertLoads && selectedAnalystForModal.clientAlertLoads.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dual-Client Alert Allocation & Load Distribution</span>
                  </span>
                  <span className="text-slate-400">{selectedAnalystForModal.wip} Total InProgress Alerts</span>
                </div>

                {/* Proportional Split Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                  {selectedAnalystForModal.clientAlertLoads.map((load) => {
                    const pct =
                      selectedAnalystForModal.wip > 0
                        ? Math.round((load.alertsPicked / selectedAnalystForModal.wip) * 100)
                        : 50;
                    return (
                      <div
                        key={load.clientId}
                        style={{ width: `${pct}%`, backgroundColor: load.color }}
                        className="h-full transition-all"
                        title={`${load.shortName}: ${load.alertsPicked} alerts (${pct}%)`}
                      />
                    );
                  })}
                </div>

                {/* Client cards with breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedAnalystForModal.clientAlertLoads.map((load) => (
                    <div
                      key={load.clientId}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-white">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: load.color }} />
                          <span>{load.clientName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {load.critical} Critical • {load.high} High
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-lg font-bold text-cyan-300">{load.alertsPicked}</span>
                        <span className="text-[10px] text-slate-400 block">picked</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Active Investigation Topic */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-bold">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Current Active Investigation Focus</span>
              </div>
              <p className="text-slate-200 leading-relaxed">
                {selectedAnalystForModal.currentFocus ||
                  'Active threat analysis, correlation, and response execution.'}
              </p>
            </div>

            {/* Cases Under Active Analysis Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Active InProgress Alerts Under Analysis ({selectedAnalystForModal.activeInProgressCases?.length || selectedAnalystForModal.wip})
              </h4>

              <div className="space-y-2">
                {selectedAnalystForModal.activeInProgressCases &&
                selectedAnalystForModal.activeInProgressCases.length > 0 ? (
                  selectedAnalystForModal.activeInProgressCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              caseItem.severity === 'Critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : caseItem.severity === 'High'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {caseItem.severity}
                          </span>
                          {caseItem.clientShort && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-bold">
                              {caseItem.clientShort}
                            </span>
                          )}
                          <span className="font-mono text-slate-400">{caseItem.id}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {caseItem.platform}
                          </span>
                        </div>
                        <div className="font-medium text-slate-200">{caseItem.title}</div>
                      </div>

                      <div className="text-right whitespace-nowrap">
                        <div className="text-slate-400 text-[10px] font-mono">
                          {caseItem.durationMinutes}m elapsed
                        </div>
                        <div
                          className={`text-xs font-mono font-bold ${
                            caseItem.slaDeadlineMin <= 15 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {caseItem.slaDeadlineMin}m SLA left
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 text-center text-slate-400 text-xs">
                    {selectedAnalystForModal.wip} standard telemetry investigation items in queue.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400">
                Skills: {selectedAnalystForModal.skills.join(', ')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onSelectAnalystPerspective(selectedAnalystForModal.id);
                    setSelectedAnalystForModal(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer transition-colors"
                >
                  Switch to This Analyst View
                </button>
                <button
                  onClick={() => setSelectedAnalystForModal(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Fatigue & Detection Rule Tuning Analytics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Alert Fatigue Detection &amp; Rule Tuning Engine</h3>
              <p className="text-xs text-slate-400">
                Identifies noisy detection rules with high benign ratios and duplicate volumes to protect analyst attention.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">SOC Institutional Rule Quality Index: 88.2%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detectionRules.map((rule) => (
            <div key={rule.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {rule.platform}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{rule.ruleId}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 mt-1">{rule.ruleName}</h4>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-rose-400">{rule.noiseRatio}% Noise</div>
                  <div className="text-[10px] text-slate-500">{rule.totalAlerts24h.toLocaleString()} alerts/24h</div>
                </div>
              </div>

              {/* Disposition Bar */}
              <div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(rule.benignClosed / rule.totalAlerts24h) * 100}%` }}
                    className="bg-slate-600"
                    title={`Benign: ${rule.benignClosed}`}
                  />
                  <div
                    style={{ width: `${(rule.duplicates / rule.totalAlerts24h) * 100}%` }}
                    className="bg-amber-600"
                    title={`Duplicates: ${rule.duplicates}`}
                  />
                  <div
                    style={{ width: `${(rule.truePositives / rule.totalAlerts24h) * 100}%` }}
                    className="bg-emerald-500"
                    title={`True Positives: ${rule.truePositives}`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>Benign: {rule.benignClosed.toLocaleString()}</span>
                  <span>Duplicates: {rule.duplicates.toLocaleString()}</span>
                  <span className="text-emerald-400 font-bold">TP: {rule.truePositives.toLocaleString()}</span>
                </div>
              </div>

              {/* AI Recommendation */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI Tuning Recommendation:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{rule.aiRecommendation}</p>

                <div className="mt-2 p-2 rounded bg-slate-950 font-mono text-[10px] text-slate-400 border border-slate-800">
                  {rule.suggestedTuning}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end pt-1">
                {rule.tuningApplied ? (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 font-mono">
                    <Check className="w-3.5 h-3.5" />
                    Tuning Filter Applied
                  </span>
                ) : (
                  <button
                    onClick={() => onApplyRuleTuning(rule.id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-medium cursor-pointer transition-all"
                  >
                    Apply AI Tuning Filter
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
