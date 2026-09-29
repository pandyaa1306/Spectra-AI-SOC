import React, { useState, useMemo } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Layers,
  Printer,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
  ArrowUpDown,
  BookOpen,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Activity,
  X,
  Target,
  Briefcase,
  Crosshair,
  Building2,
  Calendar,
} from 'lucide-react';
import { Analyst, Client, SecurityPlatform } from '../types/soc';
import {
  ALERT_CATEGORIES_METADATA,
  SECURITY_TOOLS_METADATA,
  AnalystMaturityProfile,
  AlertCategory,
  getAnalystMaturityProfile,
} from '../data/analystMaturityData';
import { getAnalystOperationsDisplayName } from '../utils/analystUtils';

interface AnalystMaturityMatrixProps {
  analysts: Analyst[];
  clients: Client[];
  selectedClientId: string;
  onSelectClient?: (clientId: string) => void;
  onSelectAnalystPerspective?: (analystId: string) => void;
}

type MatrixViewMode = 'analyst-dossier' | 'matrix-table' | 'tool-distribution' | 'alert-distribution';

export const AnalystMaturityMatrix: React.FC<AnalystMaturityMatrixProps> = ({
  analysts,
  clients,
  selectedClientId,
  onSelectClient,
  onSelectAnalystPerspective,
}) => {
  // Filter out pure AI investigator for human competency profiling (keep focused on human talent maturity)
  const humanAnalysts = useMemo(() => {
    return analysts.filter((a) => !a.isAiInvestigator);
  }, [analysts]);

  // Selected Analyst for Deep Dive Dossier
  const [selectedAnalystId, setSelectedAnalystId] = useState<string>(
    humanAnalysts[0]?.id || 'a1'
  );

  // Active View Mode inside this subtab
  const [viewMode, setViewMode] = useState<MatrixViewMode>('analyst-dossier');

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedToolFilter, setSelectedToolFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'maturity' | 'alerts' | 'mttr' | 'accuracy'>('maturity');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Compute all profiles
  const allProfiles = useMemo(() => {
    return humanAnalysts.map((a) => ({
      analyst: a,
      profile: getAnalystMaturityProfile(a),
    }));
  }, [humanAnalysts]);

  // Filtered profiles for tables and views
  const filteredProfiles = useMemo(() => {
    return allProfiles
      .filter(({ analyst, profile }) => {
        // Client filtering
        if (selectedClientId !== 'all') {
          const isAssigned = analyst.clientId === selectedClientId || analyst.clientIds?.includes(selectedClientId);
          if (!isAssigned) return false;
        }

        // Tier filter
        if (tierFilter !== 'all' && analyst.tier !== tierFilter) return false;

        // Alert category filter
        if (selectedCategoryFilter !== 'all' && profile.topAlertCategory !== selectedCategoryFilter) {
          const hasWorkedCategory = profile.alertCategoryStats.some(
            (c) => c.category === selectedCategoryFilter && c.alertsWorked > 0
          );
          if (!hasWorkedCategory) return false;
        }

        // Tool filter
        if (selectedToolFilter !== 'all') {
          const hasWorkedTool = profile.toolStats.some(
            (t) => (t.tool === selectedToolFilter || t.shortName === selectedToolFilter) && t.alertsHandled > 0
          );
          if (!hasWorkedTool) return false;
        }

        // Search text
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = profile.name.toLowerCase().includes(q);
          const matchClient = profile.client.toLowerCase().includes(q);
          const matchStrengths = profile.primaryStrengths.some((s) => s.toLowerCase().includes(q));
          const matchCategory = profile.topAlertCategory.toLowerCase().includes(q);
          const matchTool = profile.topTool.toLowerCase().includes(q);
          if (!matchName && !matchClient && !matchStrengths && !matchCategory && !matchTool) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortField === 'maturity') {
          valA = a.profile.maturityScore;
          valB = b.profile.maturityScore;
        } else if (sortField === 'alerts') {
          valA = a.profile.totalAlertsWorked30d;
          valB = b.profile.totalAlertsWorked30d;
        } else if (sortField === 'mttr') {
          valA = a.profile.avgResolutionTimeOverallMin;
          valB = b.profile.avgResolutionTimeOverallMin;
        } else if (sortField === 'accuracy') {
          valA = a.profile.overallAccuracyRate;
          valB = b.profile.overallAccuracyRate;
        }

        if (sortDirection === 'desc') {
          return valB - valA;
        }
        return valA - valB;
      });
  }, [allProfiles, selectedClientId, tierFilter, selectedCategoryFilter, selectedToolFilter, searchQuery, sortField, sortDirection]);

  // Currently inspected analyst profile
  const activePair = useMemo(() => {
    const found = allProfiles.find((p) => p.analyst.id === selectedAnalystId);
    return found || allProfiles[0];
  }, [allProfiles, selectedAnalystId]);

  const activeAnalyst = activePair?.analyst;
  const activeProfile = activePair?.profile;

  // Aggregate Metrics across the filtered cohort
  const cohortMetrics = useMemo(() => {
    const count = filteredProfiles.length;
    if (count === 0) {
      return {
        totalAlerts: 0,
        avgMaturity: 0,
        avgMttr: 0,
        avgAccuracy: 0,
        readyForPromotion: 0,
      };
    }

    const totalAlerts = filteredProfiles.reduce((acc, p) => acc + p.profile.totalAlertsWorked30d, 0);
    const avgMaturity = Math.round(
      filteredProfiles.reduce((acc, p) => acc + p.profile.maturityScore, 0) / count
    );
    const avgMttr = parseFloat(
      (filteredProfiles.reduce((acc, p) => acc + p.profile.avgResolutionTimeOverallMin, 0) / count).toFixed(1)
    );
    const avgAccuracy = parseFloat(
      (filteredProfiles.reduce((acc, p) => acc + p.profile.overallAccuracyRate, 0) / count).toFixed(1)
    );
    const readyForPromotion = filteredProfiles.filter(
      (p) => p.profile.promotionReadiness.includes('Ready for Promotion')
    ).length;

    return {
      totalAlerts,
      avgMaturity,
      avgMttr,
      avgAccuracy,
      readyForPromotion,
    };
  }, [filteredProfiles]);

  // Copy Executive 1-on-1 Mentoring Summary
  const handleCopyReport = () => {
    if (!activeProfile || !activeAnalyst) return;
    const text = `
SOC ANALYST COMPETENCY & MATURITY DOSSIER
======================================================
Analyst: ${activeProfile.name} (${activeProfile.tier})
Shift: ${activeProfile.shift}
Client Accounts: ${activeProfile.client}
Overall Maturity Score: ${activeProfile.maturityScore}/100 (${activeProfile.maturityLevel})
Promotion Readiness: ${activeProfile.promotionReadiness}
Total Alerts Handled (30d): ${activeProfile.totalAlertsWorked30d} cases
Average MTTR: ${activeProfile.avgResolutionTimeOverallMin} mins (Team Benchmark: 18.2m)
Overall Accuracy / True-Positive Precision: ${activeProfile.overallAccuracyRate}%

PRIMARY STRENGTHS & SPECIALIZATIONS:
${activeProfile.primaryStrengths.map((s) => `• ${s}`).join('\n')}

TOP ALERT CATEGORIES TAKEN:
${activeProfile.alertCategoryStats
  .slice(0, 3)
  .map(
    (c) =>
      `• ${c.category}: ${c.alertsWorked} alerts (${c.percentageOfTotal}%) | MTTR: ${c.avgResolutionMin}m | Precision: ${c.accuracyRate}% | Level: ${c.proficiencyLevel}`
  )
  .join('\n')}

PRIMARY SECURITY TOOLS USED:
${activeProfile.toolStats
  .slice(0, 3)
  .map(
    (t) =>
      `• ${t.tool}: ${t.alertsHandled} alerts | ${t.hoursSpent} hrs | Proficiency: ${t.proficiencyScore}% (${t.skillLevel})`
  )
  .join('\n')}

GROWTH AREAS FOR SUPERVISORY COACHING:
${activeProfile.growthAreas.map((g) => `• ${g}`).join('\n')}

MENTORING & 90-DAY DEVELOPMENT RECOMMENDATION:
${activeProfile.mentoringRecommendation}

RECOMMENDED TRAINING TRACKS:
${activeProfile.recommendedTrainingTracks.map((t) => `• ${t}`).join('\n')}
======================================================
Generated from SOC Operations Command Center
`.trim();

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Download JSON report
  const handleDownloadJson = () => {
    if (!activeProfile) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeProfile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `soc-analyst-maturity-${activeProfile.analystId}-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-5">
      {/* ========================================================================= */}
      {/* SECTION 1: HEADER & OPERATIONAL COHORT KPIS                               */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 via-indigo-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                  Talent Development &amp; Competency Intelligence
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {humanAnalysts.length} Analysts Profiled Across 7 Threat Domains &amp; 8 Security Tools
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                Analyst Alert &amp; Tool Maturity Profiler (Strengths, Alerts Worked &amp; Tool Expertise)
              </h2>
            </div>
          </div>

          {/* Pull Maturity Report Action Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-amber-600 hover:from-cyan-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer transition-all border border-cyan-400/30"
              title="Pull full printable analyst maturity report & development roadmap"
            >
              <FileText className="w-4 h-4 text-cyan-200" />
              <span>Pull Analyst Maturity Report</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            </button>
          </div>
        </div>

        {/* 4 Summary Cohort KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3.5">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Active Cohort</span>
            </div>
            <div className="text-xl font-mono font-bold text-white mt-1">
              {filteredProfiles.length}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">Analysts</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {selectedClientId === 'all' ? 'Morning Shift Full Roster' : 'Dedicated Client Pod'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-amber-300 flex items-center gap-1.5 font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Avg Maturity Score</span>
            </div>
            <div className="text-xl font-mono font-bold text-amber-400 mt-1">
              {cohortMetrics.avgMaturity} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>+6.4 pts last 90 days</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-indigo-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Total Alerts Worked (30d)</span>
            </div>
            <div className="text-xl font-mono font-bold text-indigo-400 mt-1">
              {cohortMetrics.totalAlerts.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">Cases</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Across 8 integrated security tools
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Avg Triage MTTR</span>
            </div>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
              {cohortMetrics.avgMttr} <span className="text-xs font-normal text-slate-400">min</span>
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span>Benchmark: 18.2 min (-18%)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 col-span-2 md:col-span-1">
            <div className="text-[11px] text-cyan-300 flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Promotion Ready</span>
            </div>
            <div className="text-xl font-mono font-bold text-cyan-300 mt-1">
              {cohortMetrics.readyForPromotion}{' '}
              <span className="text-xs font-normal text-slate-400">Analysts</span>
            </div>
            <div className="text-[10px] text-cyan-400/90 mt-0.5">
              Eligible for Tier 2 or Tier 3 advancement
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: VIEW MODE SELECTOR & FILTER CONTROLS                           */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 4 Mode Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setViewMode('analyst-dossier')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'analyst-dossier'
                  ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Analyst Deep-Dive Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('matrix-table')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'matrix-table'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All-Analyst Competency Matrix ({filteredProfiles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('tool-distribution')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'tool-distribution'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Tool-Wise Distribution (8 Platforms)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('alert-distribution')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'alert-distribution'
                  ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Alert-Wise Specialization (7 Vectors)</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search analyst, tool, or strength..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filters Row: Tier, Alert Type, Security Tool, Sort */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold mr-1">Filter by:</span>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Tiers (T1, T2, T3)</option>
            <option value="Tier 1 Triage">Tier 1 Triage</option>
            <option value="Tier 2 Incident Responder">Tier 2 Incident Responder</option>
            <option value="Tier 3 Threat Hunter">Tier 3 Threat Hunter</option>
          </select>

          {/* Alert Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Alert Categories</option>
            {ALERT_CATEGORIES_METADATA.map((cat) => (
              <option key={cat.category} value={cat.category}>
                {cat.category}
              </option>
            ))}
          </select>

          {/* Tool Filter */}
          <select
            value={selectedToolFilter}
            onChange={(e) => setSelectedToolFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Security Tools</option>
            {SECURITY_TOOLS_METADATA.map((tm) => (
              <option key={tm.name} value={tm.name}>
                {tm.name} ({tm.category})
              </option>
            ))}
          </select>

          {/* Sort Controls */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
            >
              <option value="maturity">Maturity Score</option>
              <option value="alerts">Alerts Worked</option>
              <option value="mttr">Triage MTTR</option>
              <option value="accuracy">Accuracy %</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}
            >
              {sortDirection === 'desc' ? <TrendingDown className="w-3.5 h-3.5 text-cyan-400" /> : <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: INDIVIDUAL ANALYST DEEP-DIVE DOSSIER                          */}
      {/* ========================================================================= */}
      {viewMode === 'analyst-dossier' && activeAnalyst && activeProfile && (
        <div className="space-y-4">
          {/* Analyst Quick Switcher Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {humanAnalysts.map((a) => {
              const prof = getAnalystMaturityProfile(a);
              const isSelected = a.id === selectedAnalystId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAnalystId(a.id)}
                  className={`px-3 py-2 rounded-xl border text-left shrink-0 transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/40 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={a.avatar}
                    alt={a.name}
                    className="w-7 h-7 rounded-full border border-slate-700 object-cover shrink-0"
                  />
                  <div className="min-w-0 pr-1">
                    <div className="text-xs font-bold text-white truncate max-w-[120px]">{a.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <span>{a.tier.replace('Tier ', 'T').split(' ')[0]}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">{prof.maturityScore} pts</span>
                    </div>
                  </div>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Main Analyst Dossier Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
            {/* Top Row: Analyst Identity, Maturity Badge & Actions */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={activeAnalyst.avatar}
                    alt={activeAnalyst.name}
                    className="w-16 h-16 rounded-2xl border-2 border-indigo-500/60 object-cover shadow-lg shadow-indigo-950/50"
                  />
                  <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 border border-amber-300">
                    {activeProfile.maturityScore} pts
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {getAnalystOperationsDisplayName(activeAnalyst)}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                      {activeAnalyst.tier}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                        activeProfile.promotionReadiness.includes('Promotion')
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                          : activeProfile.promotionReadiness.includes('Mentor')
                          ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                          : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {activeProfile.promotionReadiness}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5 font-mono">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{activeAnalyst.client}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{activeProfile.shift}</span>
                    </span>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold">{activeProfile.maturityLevel}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: My SOC, Copy Mentoring Notes, Pull Report */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
                  title="Copy 1-on-1 performance review summary to clipboard"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedSuccess ? 'Notes Copied!' : 'Copy 1-on-1 Notes'}</span>
                </button>

                {onSelectAnalystPerspective && (
                  <button
                    type="button"
                    onClick={() => onSelectAnalystPerspective(activeAnalyst.id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Switch to My SOC</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4 Summary Stats Ribbon for Active Analyst */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Total Alerts Worked (30d)</div>
                <div className="text-xl font-mono font-bold text-white mt-1">
                  {activeProfile.totalAlertsWorked30d}{' '}
                  <span className="text-xs font-normal text-slate-400">alerts</span>
                </div>
                <div className="text-[10px] text-cyan-400 mt-0.5">
                  Top Category: <strong>{activeProfile.topAlertCategory}</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Avg Resolution Speed (MTTR)</div>
                <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                  {activeProfile.avgResolutionTimeOverallMin}{' '}
                  <span className="text-xs font-normal text-slate-400">mins / case</span>
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  Benchmark: 18.2m (
                  {activeProfile.avgResolutionTimeOverallMin < 18.2 ? 'Faster than team' : 'Within normal range'})
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">True Positive Accuracy</div>
                <div className="text-xl font-mono font-bold text-indigo-400 mt-1">
                  {activeProfile.overallAccuracyRate}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  High precision in alert validation
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Primary Security Platform</div>
                <div className="text-base font-mono font-bold text-amber-300 mt-1 truncate" title={activeProfile.topTool}>
                  {activeProfile.topTool}
                </div>
                <div className="text-[10px] text-amber-400/80 mt-0.5">
                  {activeProfile.toolStats[0]?.skillLevel || 'Master'}
                </div>
              </div>
            </div>

            {/* Core Strengths & Where He/She Is Strong (User Key Requirement!) */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/20 via-slate-950 to-slate-950 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Core Strengths &amp; High-Specialization Areas (Where He/She Excels)
                  </h4>
                </div>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  SME Rating: 94%+ Proficiency
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {activeProfile.primaryStrengths.map((str, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">{str}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Grid: 1. Alert Types Worked Breakdown | 2. Tools Worked & Proficiency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Box 1: Alert Categories Worked */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-rose-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Alert Types Worked (Volume &amp; MTTR Breakdown)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Total: {activeProfile.totalAlertsWorked30d}</span>
                </div>

                <div className="space-y-3">
                  {activeProfile.alertCategoryStats.map((cat) => {
                    const isFaster = cat.avgResolutionMin <= cat.benchmarkAvgMin;
                    return (
                      <div
                        key={cat.category}
                        className={`p-3 rounded-xl border transition-all ${
                          cat.isPrimaryStrength
                            ? 'bg-slate-900/90 border-cyan-500/40 shadow-sm'
                            : 'bg-slate-900/40 border-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="font-semibold text-white">{cat.category}</span>
                            {cat.isPrimaryStrength && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                                Top Strength
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-white">{cat.alertsWorked} alerts</span>
                            <span className="text-[11px] text-slate-400">({cat.percentageOfTotal}%)</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${cat.percentageOfTotal}%`,
                              backgroundColor: cat.color,
                            }}
                          />
                        </div>

                        {/* Metrics: MTTR vs Benchmark, Precision, SLA */}
                        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-slate-400">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">MTTR Speed</span>
                            <span className={isFaster ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                              {cat.avgResolutionMin} min
                            </span>{' '}
                            <span className="text-[9px] text-slate-500">(bench: {cat.benchmarkAvgMin}m)</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">Precision</span>
                            <span className="text-indigo-300 font-bold">{cat.accuracyRate}% TP</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 block text-[9px] uppercase">Level</span>
                            <span className="text-cyan-300 font-semibold text-[10px]">{cat.proficiencyLevel.split(' ')[0]}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Box 2: Security Tools Worked & Hands-on Hours */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Security Tools Worked (Platform Telemetry &amp; Hours)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Hands-on Telemetry</span>
                </div>

                <div className="space-y-3">
                  {activeProfile.toolStats.map((t) => (
                    <div
                      key={t.tool}
                      className={`p-3 rounded-xl border transition-all ${
                        t.isPrimaryTool
                          ? 'bg-slate-900/90 border-amber-500/40 shadow-sm'
                          : 'bg-slate-900/40 border-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="font-semibold text-white">{t.tool}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {t.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-white">{t.alertsHandled} alerts</span>
                          <span className="text-slate-400 text-[11px]">({t.hoursSpent} hrs)</span>
                        </div>
                      </div>

                      {/* Tool Proficiency Bar */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${t.proficiencyScore}%`,
                              backgroundColor: t.color,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-cyan-300 shrink-0">
                          {t.proficiencyScore}%
                        </span>
                      </div>

                      {/* Certifications & Level */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/50">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Skill Tier:</span>
                          <span className="text-emerald-400 font-semibold">{t.skillLevel}</span>
                        </div>
                        {t.certifications.length > 0 && (
                          <div className="flex items-center gap-1 text-amber-300 font-medium">
                            <Award className="w-3 h-3 text-amber-400" />
                            <span>{t.certifications[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Growth Areas & Supervisory Mentoring Plan */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Supervisory Coaching &amp; Maturation Plan (To Advance to Next Tier)
                  </h4>
                </div>
                <span className="text-xs font-mono text-cyan-400">90-Day Developmental Target</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Growth Areas */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Identified Growth Opportunities
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activeProfile.growthAreas.map((g, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Training Tracks */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-mono uppercase text-cyan-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Recommended Training &amp; Labs
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activeProfile.recommendedTrainingTracks.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Lead Coach Assessment Quote */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-indigo-500/30 text-xs text-slate-300 leading-relaxed font-sans">
                <span className="font-bold text-indigo-300 uppercase font-mono text-[10px] mr-2">
                  SOC Supervisor Assessment:
                </span>
                "{activeProfile.mentoringRecommendation}"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: ALL-ANALYST COMPETENCY MATRIX TABLE                          */}
      {/* ========================================================================= */}
      {viewMode === 'matrix-table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>SOC Analyst Talent Matrix &amp; Comparative Proficiency Table</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {filteredProfiles.length} Analysts
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare alert volumes, top specializations, primary tools, and promotion eligibility across the entire team.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Cohort JSON</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 bg-slate-950">
                  <th className="py-2.5 px-3">Analyst</th>
                  <th className="py-2.5 px-3">Tier &amp; Client</th>
                  <th className="py-2.5 px-3">Top Alert Category</th>
                  <th className="py-2.5 px-3">Primary Tool</th>
                  <th className="py-2.5 px-3 text-center">Alerts (30d)</th>
                  <th className="py-2.5 px-3 text-center">MTTR</th>
                  <th className="py-2.5 px-3 text-center">Accuracy</th>
                  <th className="py-2.5 px-3 text-center">Maturity Score</th>
                  <th className="py-2.5 px-3">Promotion Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProfiles.map(({ analyst, profile }) => {
                  const isSelected = analyst.id === selectedAnalystId;
                  return (
                    <tr
                      key={analyst.id}
                      className={`hover:bg-slate-850/60 transition-colors ${
                        isSelected ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={analyst.avatar}
                            alt={analyst.name}
                            className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                          />
                          <div>
                            <span className="font-bold text-white block hover:text-cyan-400 cursor-pointer" onClick={() => { setSelectedAnalystId(analyst.id); setViewMode('analyst-dossier'); }}>
                              {analyst.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">{analyst.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[11px] font-mono text-slate-200 block font-semibold">
                          {analyst.tier.replace('Tier ', 'T').split(' ')[0]}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[130px] block" title={analyst.client}>
                          {analyst.client.split('&')[0]}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-950 border border-slate-800 text-cyan-300 font-semibold">
                          {profile.topAlertCategory}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-950 border border-slate-800 text-amber-300 font-medium">
                          {profile.topTool}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-white">
                        {profile.totalAlertsWorked30d}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-emerald-400">
                        {profile.avgResolutionTimeOverallMin}m
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-indigo-300">
                        {profile.overallAccuracyRate}%
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {profile.maturityScore} pts
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            profile.promotionReadiness.includes('Promotion')
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {profile.promotionReadiness.replace('Ready for Promotion to ', 'Promote to ')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAnalystId(analyst.id);
                            setViewMode('analyst-dossier');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 3: TOOL-WISE COMPETENCY DISTRIBUTION                             */}
      {/* ========================================================================= */}
      {viewMode === 'tool-distribution' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Security Platform &amp; Tool Coverage Across 9 Analysts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Identify which analysts are the dedicated power users and SMEs for each security telemetry product.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {SECURITY_TOOLS_METADATA.map((tm) => {
              // Find power users for this tool
              const toolSpecialists = allProfiles
                .filter(({ profile }) => {
                  const stat = profile.toolStats.find((s) => s.tool === tm.name || s.shortName === tm.shortName);
                  return stat && stat.proficiencyScore >= 80;
                })
                .sort((a, b) => {
                  const statA = a.profile.toolStats.find((s) => s.tool === tm.name || s.shortName === tm.shortName)?.proficiencyScore || 0;
                  const statB = b.profile.toolStats.find((s) => s.tool === tm.name || s.shortName === tm.shortName)?.proficiencyScore || 0;
                  return statB - statA;
                });

              const totalAlertsOnTool = allProfiles.reduce((acc, { profile }) => {
                const stat = profile.toolStats.find((s) => s.tool === tm.name || s.shortName === tm.shortName);
                return acc + (stat?.alertsHandled || 0);
              }, 0);

              return (
                <div
                  key={tm.name}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tm.color }} />
                      <h4 className="text-xs font-bold text-white truncate">{tm.name}</h4>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {tm.category}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Total Cases</span>
                      <span className="text-white font-bold">{totalAlertsOnTool}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Certified SMEs</span>
                      <span className="text-cyan-400 font-bold">{toolSpecialists.length} Analysts</span>
                    </div>
                  </div>

                  {/* Top 3 Specialists for this tool */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold block">
                      Lead Analysts on {tm.shortName}:
                    </span>
                    {toolSpecialists.slice(0, 3).map(({ analyst, profile }) => {
                      const stat = profile.toolStats.find((s) => s.tool === tm.name || s.shortName === tm.shortName);
                      return (
                        <div
                          key={analyst.id}
                          onClick={() => {
                            setSelectedAnalystId(analyst.id);
                            setViewMode('analyst-dossier');
                          }}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800/80 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={analyst.avatar}
                              alt={analyst.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="text-white font-medium truncate max-w-[100px]">{analyst.name}</span>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-cyan-300">
                            {stat?.proficiencyScore}% score
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 4: ALERT-WISE SPECIALIZATION GRID                                */}
      {/* ========================================================================= */}
      {viewMode === 'alert-distribution' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-rose-400" />
              <span>Threat Category Specialization &amp; Investigation Volume</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Analyze where your team is handling the highest volume and who the designated incident leads are for each attack vector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALERT_CATEGORIES_METADATA.map((cat) => {
              // Top leads for this category
              const categorySpecialists = allProfiles
                .filter(({ profile }) => {
                  const stat = profile.alertCategoryStats.find((s) => s.category === cat.category);
                  return stat && stat.alertsWorked > 0;
                })
                .sort((a, b) => {
                  const statA = a.profile.alertCategoryStats.find((s) => s.category === cat.category)?.alertsWorked || 0;
                  const statB = b.profile.alertCategoryStats.find((s) => s.category === cat.category)?.alertsWorked || 0;
                  return statB - statA;
                });

              const totalCatAlerts = allProfiles.reduce((acc, { profile }) => {
                const stat = profile.alertCategoryStats.find((s) => s.category === cat.category);
                return acc + (stat?.alertsWorked || 0);
              }, 0);

              return (
                <div
                  key={cat.category}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <h4 className="text-xs font-bold text-white">{cat.category}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                      {cat.code}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed min-h-[32px]">{cat.desc}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Total Alerts</span>
                      <span className="text-white font-bold">{totalCatAlerts}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Bench MTTR</span>
                      <span className="text-emerald-400 font-bold">{cat.benchmarkAvgMin}m</span>
                    </div>
                  </div>

                  {/* Top 3 Analysts in this Category */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold block">
                      Top Responders in Category:
                    </span>
                    {categorySpecialists.slice(0, 3).map(({ analyst, profile }) => {
                      const stat = profile.alertCategoryStats.find((s) => s.category === cat.category);
                      return (
                        <div
                          key={analyst.id}
                          onClick={() => {
                            setSelectedAnalystId(analyst.id);
                            setViewMode('analyst-dossier');
                          }}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800/80 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={analyst.avatar}
                              alt={analyst.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="text-white font-medium truncate max-w-[100px]">{analyst.name}</span>
                          </div>
                          <div className="text-right font-mono text-[11px]">
                            <span className="font-bold text-white">{stat?.alertsWorked} alerts</span>
                            <span className="text-emerald-400 ml-1.5 font-normal">({stat?.avgResolutionMin}m)</span>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL: PULL ANALYST MATURITY & DEVELOPMENT DOSSIER                        */}
      {/* ========================================================================= */}
      {isReportModalOpen && activeProfile && activeAnalyst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 text-amber-300">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Official SOC Analyst Competency &amp; Maturity Report
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Evaluation Dossier for {activeProfile.name} • {activeProfile.tier}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedSuccess ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Complete Report Layout */}
            <div className="p-6 space-y-6 text-slate-300 text-xs">
              {/* Report Header Block */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={activeAnalyst.avatar}
                    alt={activeProfile.name}
                    className="w-14 h-14 rounded-xl border border-slate-700 object-cover"
                  />
                  <div>
                    <h4 className="text-base font-bold text-white">{activeProfile.name}</h4>
                    <span className="text-xs font-mono text-cyan-400">{activeProfile.tier}</span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Client Accounts: {activeProfile.client}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-amber-400">
                    {activeProfile.maturityScore} / 100
                  </div>
                  <div className="text-xs font-semibold text-white">{activeProfile.maturityLevel}</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{activeProfile.promotionReadiness}</div>
                </div>
              </div>

              {/* Core Strengths Section */}
              <div className="space-y-2">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider text-amber-300">
                  1. Primary Strengths &amp; High-Performance Competencies
                </h5>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  {activeProfile.primaryStrengths.map((str, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-200">{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert Types Table */}
              <div className="space-y-2">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-300">
                  2. Alert Types Worked &amp; Historical Performance Breakdown
                </h5>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs bg-slate-950">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                        <th className="py-2 px-3">Alert Category</th>
                        <th className="py-2 px-3">Alerts Taken</th>
                        <th className="py-2 px-3">Share</th>
                        <th className="py-2 px-3">Avg MTTR</th>
                        <th className="py-2 px-3">Accuracy</th>
                        <th className="py-2 px-3">Proficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {activeProfile.alertCategoryStats.map((c) => (
                        <tr key={c.category}>
                          <td className="py-2.5 px-3 font-sans font-semibold text-white">{c.category}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{c.alertsWorked}</td>
                          <td className="py-2.5 px-3 text-slate-400">{c.percentageOfTotal}%</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-semibold">{c.avgResolutionMin}m</td>
                          <td className="py-2.5 px-3 text-indigo-300">{c.accuracyRate}%</td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] text-cyan-300 font-sans">{c.proficiencyLevel}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tools Worked Table */}
              <div className="space-y-2">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-300">
                  3. Security Tools Hands-On Experience &amp; Certifications
                </h5>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs bg-slate-950">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                        <th className="py-2 px-3">Security Platform</th>
                        <th className="py-2 px-3">Domain</th>
                        <th className="py-2 px-3">Cases Handled</th>
                        <th className="py-2 px-3">Hours</th>
                        <th className="py-2 px-3">Proficiency</th>
                        <th className="py-2 px-3">Certifications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {activeProfile.toolStats.map((t) => (
                        <tr key={t.tool}>
                          <td className="py-2.5 px-3 font-sans font-semibold text-white">{t.tool}</td>
                          <td className="py-2.5 px-3 text-slate-400">{t.category}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{t.alertsHandled}</td>
                          <td className="py-2.5 px-3 text-slate-400">{t.hoursSpent}h</td>
                          <td className="py-2.5 px-3 text-amber-300 font-bold">{t.proficiencyScore}% ({t.skillLevel})</td>
                          <td className="py-2.5 px-3 text-cyan-300 font-sans text-[10px]">
                            {t.certifications.length > 0 ? t.certifications.join(', ') : 'In Progress'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Supervisory Mentoring Guidance */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider text-amber-300">
                  4. Supervisory Recommendation &amp; Developmental Actions
                </h5>
                <p className="text-slate-200 leading-relaxed font-sans text-xs">
                  "{activeProfile.mentoringRecommendation}"
                </p>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <strong className="text-slate-300">Targeted 90-day focus:</strong>{' '}
                  {activeProfile.recommendedTrainingTracks.join(' • ')}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">
                Report Generated by FusionAI SOC Intelligence Engine
              </span>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
