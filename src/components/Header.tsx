import React from 'react';
import {
  ShieldAlert,
  Bot,
  Users,
  Building2,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
  ArrowRightLeft,
  CircleDot,
  Menu,
} from 'lucide-react';
import { Client, Analyst } from '../types/soc';
import { getAnalystDisplayName } from '../utils/analystUtils';
import { HeaderNotificationsDropdown, SystemNotification } from './HeaderNotificationsDropdown';

interface HeaderProps {
  clients: Client[];
  analysts: Analyst[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  selectedAnalystId: string;
  onSelectAnalyst: (analystId: string) => void;
  onNavigateToTab: (tab: string) => void;
  isSidebarVisible?: boolean;
  onToggleSidebar?: () => void;
  onOpenRebalanceModal?: () => void;
  onNavigateToInvestigation?: (incidentId?: string) => void;
  onShowToast?: (
    msg: string,
    durationMs?: number,
    meta?: {
      type?: 'new_alert' | 'alert_closed' | 'rebalance' | 'info';
      title?: string;
      alertId?: string;
      ticketNumber?: string;
      reason?: string;
      actionLabel?: string;
      onAction?: () => void;
    }
  ) => void;
  incomingNotification?: SystemNotification | null;
}

export const Header: React.FC<HeaderProps> = ({
  clients,
  analysts,
  selectedClientId,
  onSelectClient,
  selectedAnalystId,
  onSelectAnalyst,
  onNavigateToTab,
  isSidebarVisible = true,
  onToggleSidebar,
  onOpenRebalanceModal,
  onNavigateToInvestigation,
  onShowToast,
  incomingNotification,
}) => {
  const currentAnalyst = analysts.find((a) => a.id === selectedAnalystId);
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 select-none">
      {/* Top Banner: Severity Routing & Architecture Notice */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/70 px-4 py-1.5 border-b border-cyan-900/30 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-medium">
            <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Low & Med Severity:
          </span>
          <span className="text-slate-300">
            Auto-Acknowledged (&lt;3s) &amp; Deep-Triaged by{' '}
            <strong className="text-cyan-300 font-semibold">FusionAI</strong> (Ready for Analyst Pickup)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            High & Crit Severity:
          </span>
          <span className="text-slate-300">
            Dispatched directly to <strong className="text-rose-300 font-semibold">Shift 1 Human Analysts</strong>
          </span>

          <button
            onClick={() => onNavigateToTab('operations')}
            className="hidden md:flex items-center gap-1.5 text-slate-300 hover:text-cyan-300 border-l border-slate-700 pl-3 transition-colors cursor-pointer"
            title="Inspect Shift 1 In-Progress Cases by Analyst"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="font-mono text-[11px]">
              {selectedClientId === 'all' ? (
                <>Shift 1 - Alpha: <strong className="text-white">9 Analysts</strong> on duty ({analysts.filter(a => !a.isAiInvestigator).reduce((acc, c) => acc + c.wip, 0)} In-Progress) ↗</>
              ) : (
                <>Shift 1 - Alpha ({selectedClient?.name || 'Client'}): <strong className="text-white">{analysts.filter(a => !a.isAiInvestigator && (a.clientId === selectedClientId || a.clientIds?.includes(selectedClientId))).length} Analysts</strong> on duty ({analysts.filter(a => !a.isAiInvestigator && (a.clientId === selectedClientId || a.clientIds?.includes(selectedClientId))).reduce((acc, c) => {
                  const clientLoad = c.clientAlertLoads?.find(l => l.clientId === selectedClientId);
                  return acc + (clientLoad ? clientLoad.alertsPicked : c.wip);
                }, 0)} In-Progress) ↗</>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Tagline + SOC Menu Toggle */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isSidebarVisible
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800'
                  : 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/25 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
              }`}
              title={isSidebarVisible ? 'Hide SOC Menu' : 'Show SOC Menu (Side)'}
            >
              <Menu className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] font-mono">
                {isSidebarVisible ? 'Hide Menu' : 'Show Menu'}
              </span>
            </button>
          )}

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigateToTab('command')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                  SPECTRA <span className="text-cyan-400">AI SOC</span>
                </h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AUTONOMOUS CORE
                </span>
              </div>
              <p className="text-xs text-slate-400">Spectra Autonomous AI SOC • One Incident. Every Signal. One Investigation.</p>
            </div>
          </div>
        </div>

        {/* Global Controls: Client Filter & Persona Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Client Filter Dropdown */}
          <div className="relative flex items-center bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-colors">
            <Building2 className="w-4 h-4 text-cyan-400 mr-2" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Client Scope</div>
              <select
                aria-label="Filter by client scope"
                value={selectedClientId}
                onChange={(e) => onSelectClient(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-200 outline-none cursor-pointer pr-4"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  All Clients (3 Enterprise Accounts)
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.name} ({c.activeAlerts} alerts)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Perspective Switcher (Global vs Analyst View) */}
          <div className="relative flex items-center bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-colors">
            <Users className="w-4 h-4 text-indigo-400 mr-2" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Analyst Perspective</div>
              <select
                aria-label="Select active analyst perspective"
                value={selectedAnalystId}
                onChange={(e) => onSelectAnalyst(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-200 outline-none cursor-pointer pr-4"
              >
                <option value="global" className="bg-slate-900 text-cyan-300 font-bold">
                  ★ Global SOC Manager (All 9 Analysts)
                </option>
                <option value="fusionai" className="bg-slate-900 text-cyan-400 font-semibold">
                  🤖 FusionAI (Virtual AI Investigator)
                </option>
                <optgroup label="Shift 1 Human Analysts" className="bg-slate-900 text-slate-400">
                  {analysts
                    .filter((a) => !a.isAiInvestigator)
                    .map((a) => (
                      <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">
                        {getAnalystDisplayName(a)} ({a.tier.replace('Tier ', 'T')}) - {a.wip} WIP
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Quick Switch to My SOC View if Analyst Selected */}
          {selectedAnalystId !== 'global' && (
            <button
              onClick={() => onNavigateToTab('mysoc')}
              className="px-3 py-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-medium flex items-center gap-1.5 transition-all"
              title="Open My SOC personal workspace"
            >
              <CircleDot className="w-3.5 h-3.5 text-indigo-400" />
              <span>My SOC Queue</span>
            </button>
          )}

          {/* Real-Time System Event Notification Bell */}
          <HeaderNotificationsDropdown
            onNavigateToTab={onNavigateToTab}
            onOpenRebalanceModal={onOpenRebalanceModal}
            onNavigateToInvestigation={onNavigateToInvestigation}
            onShowToast={onShowToast}
            incomingNotification={incomingNotification}
          />
        </div>
      </div>
    </header>
  );
};
