import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Bot,
  Users2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Download,
  Layers,
  Activity,
  ShieldCheck,
  Zap,
  Target,
} from 'lucide-react';
import { Client } from '../types/soc';

export interface ExecutiveKpiSummarySectionProps {
  selectedClientId: string;
  clients: Client[];
  onShowToast?: (msg: string) => void;
}

export interface KpiComparisonDay {
  dayLabel: string; // "Day 1", "Day 2", ...
  dateCurrent: string; // "Sep 01"
  datePrevious: string; // "Aug 02"
  fullDateCurrent: string;
  // MTTR in minutes
  currentMttr: number;
  previousMttr: number;
  // Automation Coverage in %
  currentAutomation: number;
  previousAutomation: number;
  // Analyst Utilization in %
  currentUtilization: number;
  previousUtilization: number;
}

export const ExecutiveKpiSummarySection: React.FC<ExecutiveKpiSummarySectionProps> = ({
  selectedClientId,
  clients,
  onShowToast,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeKpiTab, setActiveKpiTab] = useState<'all' | 'mttr' | 'automation' | 'utilization'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'expanded'>('cards');
  const [timeGranularity, setTimeGranularity] = useState<'daily' | 'weekly'>('daily');

  // Client factor
  const clientMultiplier =
    selectedClientId === 'all'
      ? 1.0
      : selectedClientId === 'c1' // Apex
      ? 1.08
      : selectedClientId === 'c3' // AeroTech
      ? 1.15
      : selectedClientId === 'c2' // Nexus
      ? 0.92
      : 0.96;

  // Generate deterministic 30-day comparative dataset
  const dailyData: KpiComparisonDay[] = useMemo(() => {
    const data: KpiComparisonDay[] = [];
    const anchorCurrent = new Date('2026-09-28T00:00:00Z');
    const anchorPrevious = new Date('2026-08-29T00:00:00Z');

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 29; i >= 0; i--) {
      const curDate = new Date(anchorCurrent);
      curDate.setUTCDate(curDate.getUTCDate() - i);

      const prevDate = new Date(anchorPrevious);
      prevDate.setUTCDate(prevDate.getUTCDate() - i);

      const curLabel = `${monthNames[curDate.getUTCMonth()]} ${curDate.getUTCDate().toString().padStart(2, '0')}`;
      const prevLabel = `${monthNames[prevDate.getUTCMonth()]} ${prevDate.getUTCDate().toString().padStart(2, '0')}`;
      const dayNum = 30 - i;

      // Realistic pseudo-random variation using dayNum
      const var1 = Math.sin(dayNum * 0.4) * 2.5;
      const var2 = Math.cos(dayNum * 0.3) * 3.2;

      // 1. MTTR: Trending down in current window (22m -> 16m), while previous was (30m -> 36m)
      const currentMttr = Math.max(
        12.5,
        Number((21.8 - (dayNum / 30) * 5.4 + var1 * 0.6 * clientMultiplier).toFixed(1))
      );
      const previousMttr = Math.max(
        26.0,
        Number((31.5 + (dayNum / 30) * 2.8 + var2 * 0.8 * clientMultiplier).toFixed(1))
      );

      // 2. Automation Coverage %: Trending up in current window (72% -> 83%), while previous was (55% -> 61%)
      const currentAutomation = Math.min(
        88.5,
        Number((71.5 + (dayNum / 30) * 9.8 + var2 * 0.4 * (1 / clientMultiplier)).toFixed(1))
      );
      const previousAutomation = Math.min(
        66.0,
        Number((54.2 + (dayNum / 30) * 5.1 + var1 * 0.5).toFixed(1))
      );

      // 3. Analyst Utilization %: Current window healthy (68% -> 73%), while previous was severe burnout (88% -> 96%)
      const currentUtilization = Math.min(
        78.0,
        Math.max(64.0, Number((69.2 + Math.sin(dayNum * 0.5) * 4.2).toFixed(1)))
      );
      const previousUtilization = Math.min(
        98.5,
        Math.max(86.0, Number((88.5 + (dayNum / 30) * 6.5 + var1 * 0.7).toFixed(1)))
      );

      data.push({
        dayLabel: `Day ${dayNum}`,
        dateCurrent: curLabel,
        datePrevious: prevLabel,
        fullDateCurrent: curDate.toISOString().split('T')[0],
        currentMttr,
        previousMttr,
        currentAutomation,
        previousAutomation,
        currentUtilization,
        previousUtilization,
      });
    }

    return data;
  }, [clientMultiplier]);

  // Aggregate weekly rollups if selected
  const displayData = useMemo(() => {
    if (timeGranularity === 'daily') return dailyData;

    // 4 Weeks rollup
    const weeks: KpiComparisonDay[] = [];
    const chunks = [
      { name: 'Week 1 (Days 1-7)', slice: dailyData.slice(0, 7) },
      { name: 'Week 2 (Days 8-14)', slice: dailyData.slice(7, 14) },
      { name: 'Week 3 (Days 15-21)', slice: dailyData.slice(14, 21) },
      { name: 'Week 4 (Days 22-30)', slice: dailyData.slice(21, 30) },
    ];

    chunks.forEach((chunk) => {
      const n = chunk.slice.length;
      const avg = (fn: (item: KpiComparisonDay) => number) =>
        Number((chunk.slice.reduce((acc, curr) => acc + fn(curr), 0) / n).toFixed(1));

      weeks.push({
        dayLabel: chunk.name.split(' (')[0],
        dateCurrent: chunk.name,
        datePrevious: 'Prev Month Equiv',
        fullDateCurrent: chunk.slice[0].fullDateCurrent,
        currentMttr: avg((x) => x.currentMttr),
        previousMttr: avg((x) => x.previousMttr),
        currentAutomation: avg((x) => x.currentAutomation),
        previousAutomation: avg((x) => x.previousAutomation),
        currentUtilization: avg((x) => x.currentUtilization),
        previousUtilization: avg((x) => x.previousUtilization),
      });
    });

    return weeks;
  }, [dailyData, timeGranularity]);

  // Calculate summary metrics for the three KPIs
  const summary = useMemo(() => {
    const curMttrAvg = Number(
      (dailyData.reduce((acc, d) => acc + d.currentMttr, 0) / dailyData.length).toFixed(1)
    );
    const prevMttrAvg = Number(
      (dailyData.reduce((acc, d) => acc + d.previousMttr, 0) / dailyData.length).toFixed(1)
    );
    const mttrDiff = Number((curMttrAvg - prevMttrAvg).toFixed(1));
    const mttrPctImprovement = Number((((prevMttrAvg - curMttrAvg) / prevMttrAvg) * 100).toFixed(1));

    const curAutoAvg = Number(
      (dailyData.reduce((acc, d) => acc + d.currentAutomation, 0) / dailyData.length).toFixed(1)
    );
    const prevAutoAvg = Number(
      (dailyData.reduce((acc, d) => acc + d.previousAutomation, 0) / dailyData.length).toFixed(1)
    );
    const autoDiff = Number((curAutoAvg - prevAutoAvg).toFixed(1));
    const autoGrowth = Number((((curAutoAvg - prevAutoAvg) / prevAutoAvg) * 100).toFixed(1));

    const curUtilAvg = Number(
      (dailyData.reduce((acc, d) => acc + d.currentUtilization, 0) / dailyData.length).toFixed(1)
    );
    const prevUtilAvg = Number(
      (dailyData.reduce((acc, d) => acc + d.previousUtilization, 0) / dailyData.length).toFixed(1)
    );
    const utilDiff = Number((curUtilAvg - prevUtilAvg).toFixed(1));

    return {
      mttr: {
        current: curMttrAvg,
        previous: prevMttrAvg,
        diffMinutes: mttrDiff,
        pctImprovement: mttrPctImprovement,
        targetSla: 25.0,
      },
      automation: {
        current: curAutoAvg,
        previous: prevAutoAvg,
        diffPct: autoDiff,
        pctGrowth: autoGrowth,
        targetCoverage: 75.0,
      },
      utilization: {
        current: curUtilAvg,
        previous: prevUtilAvg,
        diffPct: utilDiff,
        targetRange: '65% - 75%',
      },
    };
  }, [dailyData]);

  const clientScopeName =
    selectedClientId === 'all'
      ? 'All 3 Enterprise Client Pods'
      : clients.find((c) => c.id === selectedClientId)?.name || selectedClientId;

  // Export CSV of 30-day KPI comparison
  const handleExportCsv = () => {
    const headers = [
      'Day',
      'Current Window Date',
      'Previous Window Date',
      'Current MTTR (min)',
      'Previous MTTR (min)',
      'MTTR Delta (min)',
      'Current Automation (%)',
      'Previous Automation (%)',
      'Automation Delta (%)',
      'Current Analyst Util (%)',
      'Previous Analyst Util (%)',
      'Util Delta (%)',
    ];

    const rows = dailyData.map((d) => [
      d.dayLabel,
      d.dateCurrent,
      d.datePrevious,
      d.currentMttr,
      d.previousMttr,
      (d.currentMttr - d.previousMttr).toFixed(1),
      d.currentAutomation,
      d.previousAutomation,
      (d.currentAutomation - d.previousAutomation).toFixed(1),
      d.currentUtilization,
      d.previousUtilization,
      (d.currentUtilization - d.previousUtilization).toFixed(1),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `soc_summary_kpi_comparison_30d_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('30-Day Executive KPI comparison dataset exported to CSV.');
    }
  };

  // Custom tooltips
  const CustomMttrTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const cur = payload.find((p: any) => p.dataKey === 'currentMttr')?.value;
    const prev = payload.find((p: any) => p.dataKey === 'previousMttr')?.value;
    const dataItem = payload[0]?.payload;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md font-mono text-xs z-50">
        <div className="text-white font-bold pb-1 border-b border-slate-800 flex items-center justify-between gap-3">
          <span>{dataItem?.dateCurrent || label}</span>
          <span className="text-[10px] text-slate-400">vs {dataItem?.datePrevious}</span>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-4 text-cyan-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Current 30D MTTR:</span>
            </span>
            <span className="font-bold">{cur} min</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Previous 30D MTTR:</span>
            </span>
            <span className="font-bold">{prev} min</span>
          </div>
          {cur && prev && (
            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-emerald-400 font-bold flex justify-between">
              <span>Remediation Speedup:</span>
              <span>-{(prev - cur).toFixed(1)} min ({(((prev - cur) / prev) * 100).toFixed(1)}% faster)</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CustomAutoTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const cur = payload.find((p: any) => p.dataKey === 'currentAutomation')?.value;
    const prev = payload.find((p: any) => p.dataKey === 'previousAutomation')?.value;
    const dataItem = payload[0]?.payload;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md font-mono text-xs z-50">
        <div className="text-white font-bold pb-1 border-b border-slate-800 flex items-center justify-between gap-3">
          <span>{dataItem?.dateCurrent || label}</span>
          <span className="text-[10px] text-slate-400">vs {dataItem?.datePrevious}</span>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-4 text-emerald-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Current Automation:</span>
            </span>
            <span className="font-bold">{cur}%</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Previous Automation:</span>
            </span>
            <span className="font-bold">{prev}%</span>
          </div>
          {cur && prev && (
            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-emerald-400 font-bold flex justify-between">
              <span>Coverage Expansion:</span>
              <span>+{(cur - prev).toFixed(1)}% lift</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CustomUtilTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const cur = payload.find((p: any) => p.dataKey === 'currentUtilization')?.value;
    const prev = payload.find((p: any) => p.dataKey === 'previousUtilization')?.value;
    const dataItem = payload[0]?.payload;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md font-mono text-xs z-50">
        <div className="text-white font-bold pb-1 border-b border-slate-800 flex items-center justify-between gap-3">
          <span>{dataItem?.dateCurrent || label}</span>
          <span className="text-[10px] text-slate-400">vs {dataItem?.datePrevious}</span>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-4 text-indigo-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Current Utilization:</span>
            </span>
            <span className="font-bold">{cur}% (Optimal)</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Previous Utilization:</span>
            </span>
            <span className="font-bold">{prev}% (Overload)</span>
          </div>
          {cur && prev && (
            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-emerald-400 font-bold flex justify-between">
              <span>Fatigue Relief:</span>
              <span>-{(prev - cur).toFixed(1)}% burn margin relief</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden space-y-4">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-10 w-96 h-36 bg-gradient-to-l from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-950 to-indigo-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                Executive KPI Trends &amp; 30-Day Window Comparison
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                RECHARTS BENCHMARK
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                CURRENT 30D vs PREV 30D
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Longitudinal performance metrics showing MTTR reduction, automation lift, and analyst fatigue relief across <strong className="text-slate-200">{clientScopeName}</strong>.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time granularity */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setTimeGranularity('daily')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                timeGranularity === 'daily'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              DAILY (30D)
            </button>
            <button
              type="button"
              onClick={() => setTimeGranularity('weekly')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                timeGranularity === 'weekly'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4-WEEK ROLLUP
            </button>
          </div>

          {/* View Mode */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Individual synchronized Recharts KPI cards"
            >
              3 CARDS
            </button>
            <button
              type="button"
              onClick={() => setViewMode('expanded')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                viewMode === 'expanded'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Full-width detailed comparison chart studio"
            >
              STUDIO
            </button>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Export 30-day KPI comparison data to CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand KPI Section' : 'Collapse KPI Section'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsed Compact Strip View */}
      {isCollapsed ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-slate-300">MTTR Improvement:</span>
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-base font-bold text-white">{summary.mttr.current}m</span>
              <span className="text-xs text-emerald-400 font-bold flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>{summary.mttr.pctImprovement}%</span>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono text-slate-300">Automation Coverage:</span>
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-base font-bold text-white">{summary.automation.current}%</span>
              <span className="text-xs text-emerald-400 font-bold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+{summary.automation.diffPct}%</span>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono text-slate-300">Analyst Utilization:</span>
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-base font-bold text-white">{summary.utilization.current}%</span>
              <span className="text-xs text-emerald-400 font-bold flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>{summary.utilization.diffPct}%</span>
              </span>
            </div>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* ========================================================================= */
        /* 3 SYNCHRONIZED RECHARTS KPI CARDS                                         */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fadeIn">
          {/* ----------------------------------------------------------------------- */}
          {/* KPI CARD 1: MTTR IMPROVEMENT                                            */}
          {/* ----------------------------------------------------------------------- */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between shadow-lg relative group hover:border-cyan-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-white uppercase">MTTR Improvement</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>{summary.mttr.pctImprovement}% FASTER</span>
                </span>
              </div>

              {/* Metric Hero numbers */}
              <div className="mt-3 flex items-baseline justify-between font-mono">
                <div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white">
                    {summary.mttr.current}{' '}
                    <span className="text-xs font-normal text-slate-400">min</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Current 30D Remediation Avg
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-slate-500 line-through">
                    {summary.mttr.previous} min
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold">
                    -{(summary.mttr.previous - summary.mttr.current).toFixed(1)} min net reduction
                  </div>
                </div>
              </div>
            </div>

            {/* Recharts Area for MTTR */}
            <div className="w-full h-36 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientMttrCurrent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    interval={timeGranularity === 'daily' ? 6 : 0}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    domain={[10, 40]}
                  />
                  <Tooltip content={<CustomMttrTooltip />} />
                  <ReferenceLine
                    y={summary.mttr.targetSla}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{
                      value: 'SLA (25m)',
                      fill: '#ef4444',
                      fontSize: 8,
                      fontFamily: 'monospace',
                      position: 'insideTopRight',
                    }}
                  />
                  {/* Previous 30d baseline line */}
                  <Line
                    type="monotone"
                    dataKey="previousMttr"
                    name="Previous 30D"
                    stroke="#64748b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  {/* Current 30d filled area */}
                  <Area
                    type="monotone"
                    dataKey="currentMttr"
                    name="Current 30D"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradientMttrCurrent)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer Metadata */}
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Current</span>
                <span className="w-2 h-0.5 bg-slate-500 ml-1.5" />
                <span>Prev 30D Baseline</span>
              </span>
              <span className="text-cyan-300 font-bold">0 SLA Breaches</span>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* KPI CARD 2: AUTOMATION COVERAGE %                                       */}
          {/* ----------------------------------------------------------------------- */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between shadow-lg relative group hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-white uppercase">Automation Coverage</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+{summary.automation.diffPct}% COVERAGE</span>
                </span>
              </div>

              {/* Metric Hero numbers */}
              <div className="mt-3 flex items-baseline justify-between font-mono">
                <div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white">
                    {summary.automation.current}
                    <span className="text-xs font-normal text-slate-400">%</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Autonomous Triage &amp; Playbooks
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-slate-500 line-through">
                    {summary.automation.previous}%
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold">
                    +{summary.automation.pctGrowth}% relative growth
                  </div>
                </div>
              </div>
            </div>

            {/* Recharts Area for Automation Coverage */}
            <div className="w-full h-36 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientAutoCurrent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    interval={timeGranularity === 'daily' ? 6 : 0}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    domain={[45, 95]}
                  />
                  <Tooltip content={<CustomAutoTooltip />} />
                  <ReferenceLine
                    y={summary.automation.targetCoverage}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    label={{
                      value: 'Target (75%)',
                      fill: '#10b981',
                      fontSize: 8,
                      fontFamily: 'monospace',
                      position: 'insideTopRight',
                    }}
                  />
                  {/* Previous 30d baseline line */}
                  <Line
                    type="monotone"
                    dataKey="previousAutomation"
                    name="Previous 30D"
                    stroke="#64748b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  {/* Current 30d filled area */}
                  <Area
                    type="monotone"
                    dataKey="currentAutomation"
                    name="Current 30D"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradientAutoCurrent)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer Metadata */}
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Current</span>
                <span className="w-2 h-0.5 bg-slate-500 ml-1.5" />
                <span>Prev 30D Baseline</span>
              </span>
              <span className="text-emerald-300 font-bold">~4,180 hrs saved</span>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* KPI CARD 3: ANALYST UTILIZATION                                         */}
          {/* ----------------------------------------------------------------------- */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between shadow-lg relative group hover:border-indigo-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Users2 className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-white uppercase">Analyst Utilization</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>{summary.utilization.diffPct}% RELIEF</span>
                </span>
              </div>

              {/* Metric Hero numbers */}
              <div className="mt-3 flex items-baseline justify-between font-mono">
                <div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white">
                    {summary.utilization.current}
                    <span className="text-xs font-normal text-slate-400">%</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">
                    Optimal Balanced Band (65-75%)
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-rose-400/80 line-through">
                    {summary.utilization.previous}%
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Prev 30D Overcapacity
                  </div>
                </div>
              </div>
            </div>

            {/* Recharts Area for Utilization */}
            <div className="w-full h-36 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientUtilCurrent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    interval={timeGranularity === 'daily' ? 6 : 0}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    domain={[55, 100]}
                  />
                  <Tooltip content={<CustomUtilTooltip />} />
                  {/* Optimal Zone Band */}
                  <ReferenceArea y1={65} y2={75} fill="#10b981" fillOpacity={0.12} />
                  <ReferenceLine
                    y={75}
                    stroke="#10b981"
                    strokeDasharray="2 2"
                    label={{
                      value: 'Healthy Cap',
                      fill: '#10b981',
                      fontSize: 8,
                      fontFamily: 'monospace',
                      position: 'insideTopRight',
                    }}
                  />
                  {/* Previous 30d baseline line (overload) */}
                  <Line
                    type="monotone"
                    dataKey="previousUtilization"
                    name="Previous 30D"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  {/* Current 30d filled area */}
                  <Area
                    type="monotone"
                    dataKey="currentUtilization"
                    name="Current 30D"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradientUtilCurrent)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer Metadata */}
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Current</span>
                <span className="w-2 h-0.5 bg-rose-500 ml-1.5" />
                <span>Prev Burnout Line</span>
              </span>
              <span className="text-emerald-400 font-bold">0 Fatigue Alerts</span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* EXPANDED STUDIO OVERLAY CHART                                             */
        /* ========================================================================= */
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 animate-fadeIn">
          {/* Subtab selection inside studio */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveKpiTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeKpiTab === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                MULTI-METRIC OVERLAY
              </button>
              <button
                type="button"
                onClick={() => setActiveKpiTab('mttr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeKpiTab === 'mttr'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                MTTR COMPARISON
              </button>
              <button
                type="button"
                onClick={() => setActiveKpiTab('automation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeKpiTab === 'automation'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                AUTOMATION COVERAGE
              </button>
              <button
                type="button"
                onClick={() => setActiveKpiTab('utilization')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeKpiTab === 'utilization'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                ANALYST LOAD
              </button>
            </div>

            <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Solid Line: Current 30D Window</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-500" />
                <span>Dashed Line: Previous 30D Window</span>
              </span>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="dateCurrent"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={
                    activeKpiTab === 'mttr' ? (
                      <CustomMttrTooltip />
                    ) : activeKpiTab === 'automation' ? (
                      <CustomAutoTooltip />
                    ) : activeKpiTab === 'utilization' ? (
                      <CustomUtilTooltip />
                    ) : undefined
                  }
                />

                {(activeKpiTab === 'all' || activeKpiTab === 'mttr') && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="currentMttr"
                      name="Current MTTR (min)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: '#06b6d4' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="previousMttr"
                      name="Previous MTTR (min)"
                      stroke="#64748b"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </>
                )}

                {(activeKpiTab === 'all' || activeKpiTab === 'automation') && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="currentAutomation"
                      name="Current Automation (%)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: '#10b981' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="previousAutomation"
                      name="Previous Automation (%)"
                      stroke="#334155"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </>
                )}

                {(activeKpiTab === 'all' || activeKpiTab === 'utilization') && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="currentUtilization"
                      name="Current Utilization (%)"
                      stroke="#818cf8"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: '#818cf8' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="previousUtilization"
                      name="Previous Utilization (%)"
                      stroke="#f43f5e"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
