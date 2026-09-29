import React from 'react';
import {
  LayoutDashboard,
  Users2,
  Cpu,
  Network,
  UserCheck,
  Flame,
  ArrowUpDown,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unclaimedCount: number;
  slaBreachCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  unclaimedCount,
  slaBreachCount,
}) => {
  const tabs = [
    {
      id: 'command',
      label: 'SOC Command Center',
      description: 'Unified multi-platform telemetry & live stream',
      icon: LayoutDashboard,
    },
    {
      id: 'operations',
      label: 'Analyst Operations',
      description: '9-Analyst workload, WIP & sorting by cases',
      icon: Users2,
      badge: slaBreachCount > 0 ? `${slaBreachCount} SLA Risk` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
    {
      id: 'investigation',
      label: 'FusionAI Investigation',
      description: 'Explainable AI, correlation & attack narrative',
      icon: Cpu,
      highlight: true,
    },
    {
      id: 'attackgraph',
      label: 'Attack Graph',
      description: 'Interactive multi-entity visual topology',
      icon: Network,
    },
    {
      id: 'mysoc',
      label: 'My SOC Workspace',
      description: 'Personal queue & claim FusionAI-analyzed alerts',
      icon: UserCheck,
      badge: unclaimedCount > 0 ? `${unclaimedCount} Ready to Claim` : undefined,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    },
  ];

  return (
    <nav className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-1 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap relative ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-cyan-400'
                      : tab.highlight
                      ? 'text-indigo-400'
                      : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>

                {tab.badge && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full border font-mono font-semibold ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}

                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
