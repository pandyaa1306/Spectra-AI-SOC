import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users2,
  Cpu,
  Network,
  UserCheck,
  Shield,
  FileText,
  Sliders,
  Globe,
  Radio,
  Clock,
  ChevronDown,
  ChevronRight,
  Flame,
  Activity,
  Layers,
  Sparkles,
  ChevronLeft,
  Menu,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unclaimedCount: number;
  slaBreachCount: number;
  userEmail?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onHideSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  unclaimedCount,
  slaBreachCount,
  userEmail = 'soc.analyst@spectra.local',
  isCollapsed = false,
  onToggleCollapse,
  onHideSidebar,
}) => {
  // Live ticking UTC time clock matching 01.jpeg: "Time: 12:20:03 UTC"
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Section collapse states
  const [isOperationsOpen, setIsOperationsOpen] = useState(true);

  return (
    <aside
      className={`bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-64 md:w-72'
      }`}
    >
      {/* Top Header: Brand Logo & Title */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/50 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-tight truncate">Spectra</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AUTONOMOUS
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 truncate">Spectra Autonomous AI SOC</p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md">
            <Shield className="w-5 h-5" />
          </div>
        )}

        {/* Controls: Collapse & Hide */}
        {!isCollapsed ? (
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Collapse SOC Menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {onHideSidebar && (
              <button
                type="button"
                onClick={onHideSidebar}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 text-[11px] font-mono border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                title="Hide SOC Menu from side"
              >
                Hide
              </button>
            )}
          </div>
        ) : (
          onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 cursor-pointer transition-colors mx-auto"
              title="Expand SOC Menu"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Main Navigation Items (Categorized matching 01.jpeg and image.png) */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-4 scrollbar-thin">
        {/* ========================================================================= */}
        {/* GROUP: SOC OPERATIONS (CORE DASHBOARDS & WORKFLOWS)                       */}
        {/* ========================================================================= */}
        <div>
          {!isCollapsed && (
            <button
              onClick={() => setIsOperationsOpen(!isOperationsOpen)}
              className="w-full flex items-center justify-between text-[11px] font-mono uppercase font-bold text-slate-400 px-2 py-1.5 hover:text-slate-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>SOC Operations</span>
              </span>
              {isOperationsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}

          {(!isCollapsed ? isOperationsOpen : true) && (
            <div className="mt-1 space-y-1">
              {/* Dashboards & Reports (Moved under SOC Operations as requested) */}
              <button
                onClick={() => onTabChange('dashboards-reports')}
                title="Dashboards & Reports - Operational metrics, throughput, client scorecards, and reports generator"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboards-reports'
                    ? 'bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 text-white border border-cyan-500/50 shadow-md shadow-cyan-950/40'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboards-reports' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">Dashboards &amp; Reports</span>}
                </div>
                {!isCollapsed && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    HUB
                  </span>
                )}
              </button>

              {/* SOC Command Center */}
              <button
                onClick={() => onTabChange('command')}
                title="SOC Command Center"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'command'
                    ? 'bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 text-white border border-cyan-500/50 shadow-md shadow-cyan-950/40'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Activity className={`w-4 h-4 shrink-0 ${activeTab === 'command' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">SOC Command Center</span>}
                </div>
                {!isCollapsed && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live Stream Active" />
                )}
              </button>

              {/* Analyst Operations */}
              <button
                onClick={() => onTabChange('operations')}
                title="Analyst Operations"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'operations'
                    ? 'bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 text-white border border-cyan-500/50 shadow-md'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users2 className={`w-4 h-4 shrink-0 ${activeTab === 'operations' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">Analyst Operations</span>}
                </div>
                {!isCollapsed && slaBreachCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {slaBreachCount} SLA
                  </span>
                )}
              </button>

              {/* Rule Tuning & Fatigue (AI tuning name removed from tab as requested) */}
              <button
                onClick={() => onTabChange('rule-tuning')}
                title="Alert Fatigue & Rule Tuning Engine"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'rule-tuning'
                    ? 'bg-gradient-to-r from-amber-600/30 to-indigo-600/30 text-amber-300 border border-amber-500/50 shadow-md'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sliders className={`w-4 h-4 shrink-0 ${activeTab === 'rule-tuning' ? 'text-amber-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">Rule Tuning &amp; Fatigue</span>}
                </div>
                {!isCollapsed && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    TUNING
                  </span>
                )}
              </button>

              {/* FusionAI Investigation */}
              <button
                onClick={() => onTabChange('investigation')}
                title="FusionAI Investigation"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'investigation'
                    ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-600/30 text-white border border-indigo-500/50 shadow-md'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Cpu className={`w-4 h-4 shrink-0 ${activeTab === 'investigation' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">FusionAI Investigation</span>}
                </div>
              </button>

              {/* Attack Graph */}
              <button
                onClick={() => onTabChange('attackgraph')}
                title="Attack Graph"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'attackgraph'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Network className={`w-4 h-4 shrink-0 ${activeTab === 'attackgraph' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">Attack Graph</span>}
                </div>
              </button>

              {/* My SOC Workspace */}
              <button
                onClick={() => onTabChange('mysoc')}
                title="My SOC Workspace"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'mysoc'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserCheck className={`w-4 h-4 shrink-0 ${activeTab === 'mysoc' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">My SOC Workspace</span>}
                </div>
                {!isCollapsed && unclaimedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {unclaimedCount} New
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SIDEBAR FOOTER                                                            */}
      {/* ========================================================================= */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/90 text-xs font-mono space-y-2">
        {!isCollapsed ? (
          <>
            {/* Live UTC Clock */}
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Time:</span>
              </span>
              <span className="font-bold text-white tracking-wider">{utcTime || '12:20:03 UTC'}</span>
            </div>

            {/* SOC Engine Live Indicator */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>SOC Engine:</span>
              </span>
              <span className="text-emerald-400 font-bold tracking-wider">ACTIVE</span>
            </div>

            {/* User Profile Badge */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate text-[11px]">{userEmail}</div>
                  <div className="text-[10px] text-slate-500">SOC Principal Analyst</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span title="SOC Engine Active">
              <Activity className="w-4 h-4 text-emerald-400" />
            </span>
            <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
              {userEmail[0].toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
