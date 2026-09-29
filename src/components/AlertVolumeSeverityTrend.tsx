import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  Layers,
  BarChart3,
  LineChart as LineChartIcon,
  Download,
  Filter,
  Maximize2,
  Sparkles,
  Flame,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { Alert, Client, SeverityLevel } from '../types/soc';
import { DrilldownFilterContext } from './DrilldownResultsModal';

export interface AlertVolumeSeverityTrendProps {
  alerts: Alert[];
  selectedClientId: string;
  clients: Client[];
  onOpenDrilldown?: (context: DrilldownFilterContext) => void;
  onShowToast?: (msg: string) => void;
}

export interface DailySeverityData {
  date: string; // "Sep 01"
  fullDate: string; // "2026-09-01"
  dayOfWeek: string; // "Tue"
  isWeekend: boolean;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
  incidentHighlight?: string;
  criticalPct: number;
  highPct: number;
}

export const AlertVolumeSeverityTrend: React.FC<AlertVolumeSeverityTrendProps> = ({
  alerts,
  selectedClientId,
  clients,
  onOpenDrilldown,
  onShowToast,
}) => {
  // Chart view configurations
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [isStacked, setIsStacked] = useState(true);
  const [timeRange, setTimeRange] = useState<'30d' | '14d' | '7d'>('30d');
  const [selectedDay, setSelectedDay] = useState<DailySeverityData | null>(null);

  // Severity visibility toggles
  const [visibleSeverities, setVisibleSeverities] = useState<Record<'Critical' | 'High' | 'Medium' | 'Low', boolean>>({
    Critical: true,
    High: true,
    Medium: true,
    Low: true,
  });

  const toggleSeverity = (sev: 'Critical' | 'High' | 'Medium' | 'Low') => {
    setVisibleSeverities((prev) => {
      // Don't disable all
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (activeCount === 1 && prev[sev]) return prev;
      return { ...prev, [sev]: !prev[sev] };
    });
  };

  // Generate deterministic, realistic 30-day trend data based on client and active alerts
  const full30DayData: DailySeverityData[] = useMemo(() => {
    const data: DailySeverityData[] = [];
    const clientMultiplier =
      selectedClientId === 'all'
        ? 1.0
        : selectedClientId === 'c1' // Apex
        ? 0.28
        : selectedClientId === 'c3' // AeroTech
        ? 0.31
        : selectedClientId === 'c2' // Nexus
        ? 0.18
        : 0.12;

    const baseAnchorDate = new Date('2026-09-28T00:00:00Z');

    // Incident spikes calendar highlights
    const incidentDays: Record<number, string> = {
      6: 'Apex DC DCSync & Golden Ticket Burst', // Sep 22
      14: 'Cross-Tenant Ransomware Lateral Scan', // Sep 14
      20: 'Phishing Credential Harvester Campaign', // Sep 08
      1: 'SCADA PLC Firmware Tamper Alert', // Sep 27
    };

    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseAnchorDate);
      d.setUTCDate(d.getUTCDate() - i);

      const dayOfMonth = d.getUTCDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = monthNames[d.getUTCMonth()];
      const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeek = dayOfWeekNames[d.getUTCDay()];
      const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;

      const dateLabel = `${monthStr} ${dayOfMonth.toString().padStart(2, '0')}`;
      const fullDateStr = d.toISOString().split('T')[0];

      // Base volume curve with realistic variance
      let baseVolume = isWeekend ? 52 : 92;

      // Deterministic pseudo-random variation based on date
      const hash = (dayOfMonth * 17 + d.getUTCMonth() * 31 + i * 7) % 23;
      baseVolume += hash - 10;

      // Inject known incident spikes
      let incidentHighlight: string | undefined = undefined;
      if (incidentDays[i]) {
        incidentHighlight = incidentDays[i];
        baseVolume += 45;
      }

      // Apply client scaling factor
      const scaledTotal = Math.max(12, Math.round(baseVolume * clientMultiplier));

      // Calculate realistic severity breakdown
      let critRatio = isWeekend ? 0.08 : 0.11;
      let highRatio = 0.26;
      let medRatio = 0.42;

      if (incidentHighlight) {
        critRatio = 0.18;
        highRatio = 0.32;
        medRatio = 0.35;
      }

      const critical = Math.max(1, Math.round(scaledTotal * critRatio));
      const high = Math.max(2, Math.round(scaledTotal * highRatio));
      const medium = Math.max(3, Math.round(scaledTotal * medRatio));
      const low = Math.max(1, scaledTotal - (critical + high + medium));
      const total = critical + high + medium + low;

      const criticalPct = Math.round((critical / total) * 100);
      const highPct = Math.round((high / total) * 100);

      data.push({
        date: dateLabel,
        fullDate: fullDateStr,
        dayOfWeek,
        isWeekend,
        critical,
        high,
        medium,
        low,
        total,
        incidentHighlight,
        criticalPct,
        highPct,
      });
    }

    return data;
  }, [selectedClientId]);

  // Filtered dataset according to time range
  const chartData = useMemo(() => {
    if (timeRange === '7d') return full30DayData.slice(-7);
    if (timeRange === '14d') return full30DayData.slice(-14);
    return full30DayData;
  }, [full30DayData, timeRange]);

  // Compute aggregate metrics for the 30-day window
  const summaryMetrics = useMemo(() => {
    const totalVolume = full30DayData.reduce((acc, d) => acc + d.total, 0);
    const totalCritical = full30DayData.reduce((acc, d) => acc + d.critical, 0);
    const totalHigh = full30DayData.reduce((acc, d) => acc + d.high, 0);
    const totalMedium = full30DayData.reduce((acc, d) => acc + d.medium, 0);
    const totalLow = full30DayData.reduce((acc, d) => acc + d.low, 0);

    const dailyAvg = (totalVolume / full30DayData.length).toFixed(1);

    // Find peak day
    const peakDay = [...full30DayData].sort((a, b) => b.total - a.total)[0];

    // Calculate 7-day momentum vs previous 7-day
    const last7Sum = full30DayData.slice(-7).reduce((acc, d) => acc + d.total, 0);
    const prev7Sum = full30DayData.slice(-14, -7).reduce((acc, d) => acc + d.total, 0);
    const momentumPct = prev7Sum > 0 ? (((last7Sum - prev7Sum) / prev7Sum) * 100).toFixed(1) : '+4.2';
    const isMomentumUp = parseFloat(momentumPct) >= 0;

    return {
      totalVolume,
      totalCritical,
      totalHigh,
      totalMedium,
      totalLow,
      dailyAvg,
      peakDay,
      momentumPct,
      isMomentumUp,
      criticalPct: Math.round((totalCritical / totalVolume) * 100),
      highPct: Math.round((totalHigh / totalVolume) * 100),
      mediumPct: Math.round((totalMedium / totalVolume) * 100),
      lowPct: Math.round((totalLow / totalVolume) * 100),
    };
  }, [full30DayData]);

  // Client Scope Display Name
  const clientName =
    selectedClientId === 'all'
      ? 'All 3 Enterprise Client Pods'
      : clients.find((c) => c.id === selectedClientId)?.name || selectedClientId;

  // Export 30-Day Trend Data as CSV
  const handleExportCsv = () => {
    const headers = ['Date', 'Day of Week', 'Critical', 'High', 'Medium', 'Low', 'Total Alerts', 'Special Incident'];
    const rows = full30DayData.map((d) => [
      d.fullDate,
      d.dayOfWeek,
      d.critical,
      d.high,
      d.medium,
      d.low,
      d.total,
      d.incidentHighlight ? `"${d.incidentHighlight}"` : 'None',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `soc_alert_volume_severity_trend_30d_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('30-Day Severity Trend data exported as CSV');
    }
  };

  // Custom SOC Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem: DailySeverityData = payload[0]?.payload;
    if (!dataItem) return null;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md font-mono text-xs z-50 min-w-[240px]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <span className="text-white font-bold">{dataItem.date}</span>
            <span className="text-slate-400 text-[11px] ml-1.5">({dataItem.dayOfWeek})</span>
          </div>
          <span className="text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
            {dataItem.total} Alerts
          </span>
        </div>

        {dataItem.incidentHighlight && (
          <div className="mt-2 p-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-[10px] text-red-300 flex items-start gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-tight font-sans font-medium">{dataItem.incidentHighlight}</span>
          </div>
        )}

        <div className="mt-2.5 space-y-1.5">
          {visibleSeverities.Critical && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Critical:</span>
              </span>
              <span className="font-bold text-white">
                {dataItem.critical}{' '}
                <span className="text-slate-500 text-[10px]">({dataItem.criticalPct}%)</span>
              </span>
            </div>
          )}

          {visibleSeverities.High && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>High:</span>
              </span>
              <span className="font-bold text-white">
                {dataItem.high}{' '}
                <span className="text-slate-500 text-[10px]">({dataItem.highPct}%)</span>
              </span>
            </div>
          )}

          {visibleSeverities.Medium && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-yellow-400">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Medium:</span>
              </span>
              <span className="font-bold text-white">
                {dataItem.medium}{' '}
                <span className="text-slate-500 text-[10px]">
                  ({Math.round((dataItem.medium / dataItem.total) * 100)}%)
                </span>
              </span>
            </div>
          )}

          {visibleSeverities.Low && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Low:</span>
              </span>
              <span className="font-bold text-white">
                {dataItem.low}{' '}
                <span className="text-slate-500 text-[10px]">
                  ({Math.round((dataItem.low / dataItem.total) * 100)}%)
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 text-center">
          Click data point to inspect daily breakdown
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>30-Day Alert Volume &amp; Severity Distribution Trend</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  RECHARTS TELEMETRY
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Longitudinal surveillance across all ingested security platforms categorized by threat severity tier • Scope: <strong className="text-slate-200">{clientName}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time range selector */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold">
            {(['30d', '14d', '7d'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Chart type switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                chartType === 'area' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Stacked Area Chart"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold hidden sm:inline">Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                chartType === 'bar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold hidden sm:inline">Bar</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                chartType === 'line' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Monotone Line Chart"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold hidden sm:inline">Line</span>
            </button>
          </div>

          {/* Stacked Toggle */}
          {chartType !== 'line' && (
            <button
              type="button"
              onClick={() => setIsStacked(!isStacked)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                isStacked
                  ? 'bg-slate-800 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Toggle Stacked vs Grouped layout"
            >
              {isStacked ? 'Stacked' : 'Grouped'}
            </button>
          )}

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Export 30-day severity data table to CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Headline Metric KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Ingested */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400">30-DAY INGESTION</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {summaryMetrics.totalVolume.toLocaleString()}
          </div>
          <div className="text-[10px] text-cyan-400 font-mono mt-1 flex items-center gap-1">
            {summaryMetrics.isMomentumUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{summaryMetrics.momentumPct}% vs prev period</span>
          </div>
        </div>

        {/* Critical Alerts */}
        <div
          onClick={() => toggleSeverity('Critical')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            visibleSeverities.Critical
              ? 'bg-red-950/30 border-red-500/50 shadow-sm'
              : 'bg-slate-950/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-red-400">
            <span>CRITICAL</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {summaryMetrics.totalCritical.toLocaleString()}
          </div>
          <div className="text-[10px] text-red-300 font-mono mt-1">
            {summaryMetrics.criticalPct}% of total volume
          </div>
        </div>

        {/* High Alerts */}
        <div
          onClick={() => toggleSeverity('High')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            visibleSeverities.High
              ? 'bg-orange-950/30 border-orange-500/50 shadow-sm'
              : 'bg-slate-950/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-orange-400">
            <span>HIGH</span>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <div className="text-xl font-bold font-mono text-orange-400 mt-1">
            {summaryMetrics.totalHigh.toLocaleString()}
          </div>
          <div className="text-[10px] text-orange-300 font-mono mt-1">
            {summaryMetrics.highPct}% of total volume
          </div>
        </div>

        {/* Medium Alerts */}
        <div
          onClick={() => toggleSeverity('Medium')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            visibleSeverities.Medium
              ? 'bg-yellow-950/20 border-yellow-500/40 shadow-sm'
              : 'bg-slate-950/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-yellow-400">
            <span>MEDIUM</span>
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
          </div>
          <div className="text-xl font-bold font-mono text-yellow-300 mt-1">
            {summaryMetrics.totalMedium.toLocaleString()}
          </div>
          <div className="text-[10px] text-yellow-400 font-mono mt-1">
            {summaryMetrics.mediumPct}% of total volume
          </div>
        </div>

        {/* Low Alerts */}
        <div
          onClick={() => toggleSeverity('Low')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            visibleSeverities.Low
              ? 'bg-blue-950/20 border-blue-500/40 shadow-sm'
              : 'bg-slate-950/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-blue-400">
            <span>LOW</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-300 mt-1">
            {summaryMetrics.totalLow.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-400 font-mono mt-1">
            {summaryMetrics.lowPct}% of total volume
          </div>
        </div>

        {/* Daily Average & Peak */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400">DAILY RUN RATE</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {summaryMetrics.dailyAvg}{' '}
            <span className="text-xs text-slate-400 font-normal">/ day</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 truncate" title={`Peak: ${summaryMetrics.peakDay.date} (${summaryMetrics.peakDay.total} alerts)`}>
            Peak: <span className="text-white font-semibold">{summaryMetrics.peakDay.date}</span> ({summaryMetrics.peakDay.total})
          </div>
        </div>
      </div>

      {/* Severity filter legend toggles */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-bold uppercase">Toggle Severity Layer:</span>
          {(['Critical', 'High', 'Medium', 'Low'] as const).map((sev) => {
            const isVisible = visibleSeverities[sev];
            const colorClass =
              sev === 'Critical'
                ? isVisible
                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
                : sev === 'High'
                ? isVisible
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
                : sev === 'Medium'
                ? isVisible
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
                : isVisible
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800';

            return (
              <button
                key={sev}
                type="button"
                onClick={() => toggleSeverity(sev)}
                className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${colorClass}`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      sev === 'Critical'
                        ? '#ef4444'
                        : sev === 'High'
                        ? '#f97316'
                        : sev === 'Medium'
                        ? '#eab308'
                        : '#3b82f6',
                    opacity: isVisible ? 1 : 0.3,
                  }}
                />
                <span>{sev}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Interactive Tooltip Active</span>
          </span>
          <span className="text-slate-600">•</span>
          <span>Click point to view day details</span>
        </div>
      </div>

      {/* Main Recharts Container */}
      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart
              data={chartData}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  setSelectedDay(e.activePayload[0].payload);
                }
              }}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
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
              <Tooltip content={<CustomTooltip />} />

              {/* Peak indicator reference line */}
              <ReferenceLine
                x={summaryMetrics.peakDay.date}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: 'PEAK SPIKE',
                  fill: '#ef4444',
                  fontSize: 9,
                  fontFamily: 'monospace',
                  position: 'top',
                }}
              />

              {visibleSeverities.Low && (
                <Area
                  type="monotone"
                  dataKey="low"
                  name="Low"
                  stackId={isStacked ? '1' : undefined}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLow)"
                />
              )}

              {visibleSeverities.Medium && (
                <Area
                  type="monotone"
                  dataKey="medium"
                  name="Medium"
                  stackId={isStacked ? '1' : undefined}
                  stroke="#eab308"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMedium)"
                />
              )}

              {visibleSeverities.High && (
                <Area
                  type="monotone"
                  dataKey="high"
                  name="High"
                  stackId={isStacked ? '1' : undefined}
                  stroke="#f97316"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHigh)"
                />
              )}

              {visibleSeverities.Critical && (
                <Area
                  type="monotone"
                  dataKey="critical"
                  name="Critical"
                  stackId={isStacked ? '1' : undefined}
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCritical)"
                />
              )}
            </AreaChart>
          ) : chartType === 'bar' ? (
            <BarChart
              data={chartData}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  setSelectedDay(e.activePayload[0].payload);
                }
              }}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
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
              <Tooltip content={<CustomTooltip />} />

              {visibleSeverities.Low && (
                <Bar
                  dataKey="low"
                  name="Low"
                  stackId={isStacked ? '1' : undefined}
                  fill="#3b82f6"
                  radius={isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
              )}

              {visibleSeverities.Medium && (
                <Bar
                  dataKey="medium"
                  name="Medium"
                  stackId={isStacked ? '1' : undefined}
                  fill="#eab308"
                  radius={isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
              )}

              {visibleSeverities.High && (
                <Bar
                  dataKey="high"
                  name="High"
                  stackId={isStacked ? '1' : undefined}
                  fill="#f97316"
                  radius={isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
              )}

              {visibleSeverities.Critical && (
                <Bar
                  dataKey="critical"
                  name="Critical"
                  stackId={isStacked ? '1' : undefined}
                  fill="#ef4444"
                  radius={isStacked ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                />
              )}
            </BarChart>
          ) : (
            <LineChart
              data={chartData}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  setSelectedDay(e.activePayload[0].payload);
                }
              }}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
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
              <Tooltip content={<CustomTooltip />} />

              {visibleSeverities.Critical && (
                <Line
                  type="monotone"
                  dataKey="critical"
                  name="Critical"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ef4444' }}
                  activeDot={{ r: 6, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleSeverities.High && (
                <Line
                  type="monotone"
                  dataKey="high"
                  name="High"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f97316' }}
                  activeDot={{ r: 6, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleSeverities.Medium && (
                <Line
                  type="monotone"
                  dataKey="medium"
                  name="Medium"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#eab308' }}
                  activeDot={{ r: 5, fill: '#eab308', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleSeverities.Low && (
                <Line
                  type="monotone"
                  dataKey="low"
                  name="Low"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#3b82f6' }}
                  activeDot={{ r: 5, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Selected Day Inspector Banner (when user clicks any day) */}
      {selectedDay && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/40 animate-fadeIn flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
              {selectedDay.date.split(' ')[1]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">
                  {selectedDay.date}, 2026 ({selectedDay.dayOfWeek})
                </span>
                {selectedDay.incidentHighlight && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                    {selectedDay.incidentHighlight}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 font-mono flex items-center gap-3 mt-0.5">
                <span>Total: <strong className="text-white">{selectedDay.total}</strong> alerts</span>
                <span>•</span>
                <span className="text-red-400">Critical: <strong>{selectedDay.critical}</strong></span>
                <span>•</span>
                <span className="text-orange-400">High: <strong>{selectedDay.high}</strong></span>
                <span>•</span>
                <span className="text-yellow-400">Medium: <strong>{selectedDay.medium}</strong></span>
                <span>•</span>
                <span className="text-blue-400">Low: <strong>{selectedDay.low}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDrilldown && (
              <button
                type="button"
                onClick={() =>
                  onOpenDrilldown({
                    type: 'severity',
                    value: 'critical',
                    label: `${selectedDay.date} Critical Incident Audit`,
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold font-mono transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Drilldown Criticals</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
