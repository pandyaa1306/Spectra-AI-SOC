import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  ShieldAlert,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Check,
  Trash2,
  Radio,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  ChevronRight,
  Filter,
} from 'lucide-react';

export type SystemEventType =
  | 'high_alert'
  | 'critical_alert'
  | 'rebalance_request'
  | 'sla_warning'
  | 'automation_executed'
  | 'shift_handover';

export interface SystemNotification {
  id: string;
  type: SystemEventType;
  title: string;
  message: string;
  timestamp: string;
  createdAt: number;
  isRead: boolean;
  severity?: 'Critical' | 'High' | 'Medium' | 'Low';
  actionLabel?: string;
  actionType?: 'navigate_investigation' | 'open_rebalancer' | 'navigate_tab';
  targetTab?: string;
  metadata?: {
    caseId?: string;
    analystName?: string;
    clientName?: string;
    casesCount?: number;
  };
}

interface HeaderNotificationsDropdownProps {
  onNavigateToTab: (tab: string) => void;
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

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    type: 'critical_alert',
    title: '🚨 Critical Alert: Domain Controller DCSync Burst',
    message: 'Mimikatz DCSync credential dumping activity detected against DC-APX-01 (Apex Financial). Immediate containment active.',
    timestamp: 'Just now',
    createdAt: Date.now() - 45000,
    isRead: false,
    severity: 'Critical',
    actionLabel: 'Investigate Incident',
    actionType: 'navigate_investigation',
    metadata: { caseId: 'CASE-8840', clientName: 'Apex Financial' },
  },
  {
    id: 'notif-2',
    type: 'rebalance_request',
    title: '⚖️ Workload Rebalance Requested: Analyst Overcapacity',
    message: 'Elena Vance exceeded 95% WIP workload limit (5 active cases). Automated request submitted to rebalance 3 cases to Maya Lin.',
    timestamp: '3m ago',
    createdAt: Date.now() - 180000,
    isRead: false,
    actionLabel: 'Open Rebalancer',
    actionType: 'open_rebalancer',
    metadata: { analystName: 'Elena Vance', casesCount: 3 },
  },
  {
    id: 'notif-3',
    type: 'high_alert',
    title: '⚠️ High Severity: AeroTech SCADA Firmware Tamper',
    message: 'PLC sensor integrity check reported unauthorized firmware update attempt on turbine controller PLC-04.',
    timestamp: '8m ago',
    createdAt: Date.now() - 480000,
    isRead: false,
    severity: 'High',
    actionLabel: 'Investigate Alert',
    actionType: 'navigate_investigation',
    metadata: { caseId: 'ALT-1080', clientName: 'AeroTech Defense' },
  },
  {
    id: 'notif-4',
    type: 'sla_warning',
    title: '⏱️ SLA Breach Warning: Case TCK-8841-03',
    message: 'Containment margin is below 16 minutes for Apex credential investigation. Escalation commander alerted.',
    timestamp: '15m ago',
    createdAt: Date.now() - 900000,
    isRead: true,
    severity: 'High',
    actionLabel: 'View Incident',
    actionType: 'navigate_investigation',
  },
  {
    id: 'notif-5',
    type: 'rebalance_request',
    title: '✅ Shift Rebalance Executed',
    message: '3 cases reallocated from David Sterling to Maya Lin with lead supervisor sign-off.',
    timestamp: '28m ago',
    createdAt: Date.now() - 1680000,
    isRead: true,
    actionLabel: 'Inspect Roster',
    actionType: 'navigate_tab',
    targetTab: 'operations',
  },
  {
    id: 'notif-6',
    type: 'shift_handover',
    title: '📋 Shift Handover Dossier Dispatched',
    message: 'Cmdr. Rachel Hayes published the operational shift custody report to incoming Afternoon Lead Marcus Sterling.',
    timestamp: '42m ago',
    createdAt: Date.now() - 2520000,
    isRead: true,
    actionLabel: 'View Handover',
    actionType: 'navigate_tab',
    targetTab: 'dashboards',
  },
];

export const HeaderNotificationsDropdown: React.FC<HeaderNotificationsDropdownProps> = ({
  onNavigateToTab,
  onOpenRebalanceModal,
  onNavigateToInvestigation,
  onShowToast,
  incomingNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'alerts' | 'rebalance' | 'unread'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNewAlertAnimation, setHasNewAlertAnimation] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ingest incoming external notifications (e.g. Alert Closed event)
  useEffect(() => {
    if (!incomingNotification) return;
    setNotifications((prev) => [incomingNotification, ...prev]);
    setHasNewAlertAnimation(true);
    setTimeout(() => setHasNewAlertAnimation(false), 2500);
  }, [incomingNotification]);

  // Play subtle web audio chime on new notification
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // AudioContext policy suppression fallback
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Periodic real-time simulator: occasionally triggers a new live system event
  useEffect(() => {
    const interval = setInterval(() => {
      const randomAlertNum = Math.floor(1000 + Math.random() * 9000);
      const randomAlertId = `ALT-${randomAlertNum}`;

      const simulatedEvents = [
        {
          type: 'critical_alert' as SystemEventType,
          title: `🚨 Critical Alert: Ransomware Canary Triggered (${randomAlertId})`,
          message: `Canary honeypot file modified on AER-FS-01. Automated containment playbook triggered for Alert ID ${randomAlertId}.`,
          severity: 'Critical' as const,
          actionLabel: 'Investigate Alert',
          actionType: 'navigate_investigation' as const,
          metadata: { clientName: 'AeroTech Defense', caseId: randomAlertId },
        },
        {
          type: 'rebalance_request' as SystemEventType,
          title: '⚖️ Rebalance Alert: David Sterling Case Limit',
          message: 'Workload at 92%. Automated rebalance recommended 2 cases to Priya Sharma.',
          actionLabel: 'Open Rebalancer',
          actionType: 'open_rebalancer' as const,
          metadata: { analystName: 'David Sterling', casesCount: 2 },
        },
        {
          type: 'high_alert' as SystemEventType,
          title: `⚠️ High Severity: Suspicious OAuth Consent Grant (${randomAlertId})`,
          message: `Unverified external application granted Mail.ReadWrite in Nexus Health Systems for Alert ID ${randomAlertId}.`,
          severity: 'High' as const,
          actionLabel: 'Investigate Incident',
          actionType: 'navigate_investigation' as const,
          metadata: { clientName: 'Nexus Health Systems', caseId: randomAlertId },
        },
      ];

      const chosen = simulatedEvents[Math.floor(Math.random() * simulatedEvents.length)];
      const newNotif: SystemNotification = {
        id: `notif-live-${Date.now()}`,
        type: chosen.type,
        title: chosen.title,
        message: chosen.message,
        timestamp: 'Just now',
        createdAt: Date.now(),
        isRead: false,
        severity: chosen.severity,
        actionLabel: chosen.actionLabel,
        actionType: chosen.actionType,
        metadata: chosen.metadata,
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 14)]);
      setHasNewAlertAnimation(true);
      setTimeout(() => setHasNewAlertAnimation(false), 2500);
      playChime();

      if (onShowToast) {
        onShowToast(
          chosen.message,
          5000, // 5 seconds display time
          {
            type: 'new_alert',
            title: chosen.title,
            alertId: chosen.metadata?.caseId,
            actionLabel: chosen.actionLabel,
            onAction: () => {
              if (chosen.actionType === 'navigate_investigation') {
                onNavigateToInvestigation?.();
              } else if (chosen.actionType === 'open_rebalancer') {
                onOpenRebalanceModal?.();
              }
            },
          }
        );
      }
    }, 60000); // Trigger every 60s

    return () => clearInterval(interval);
  }, [soundEnabled, onShowToast, onNavigateToInvestigation, onOpenRebalanceModal]);

  // Manually trigger a simulated event
  const handleTriggerSimulatedEvent = () => {
    const isRebalance = Math.random() > 0.5;
    const randomAlertNum = Math.floor(1000 + Math.random() * 9000);
    const randomAlertId = `ALT-${randomAlertNum}`;

    const newNotif: SystemNotification = isRebalance
      ? {
          id: `notif-sim-${Date.now()}`,
          type: 'rebalance_request',
          title: '⚖️ Rebalance Request: Marcus Sterling Peak Load',
          message: 'Tier-3 escalation incident requires Marcus Sterling to hand off 2 standard triage cases to shift queue.',
          timestamp: 'Just now',
          createdAt: Date.now(),
          isRead: false,
          actionLabel: 'Open Rebalancer',
          actionType: 'open_rebalancer',
          metadata: { analystName: 'Marcus Sterling', casesCount: 2 },
        }
      : {
          id: `notif-sim-${Date.now()}`,
          type: 'critical_alert',
          title: `🚨 Critical Alert: Lateral SMB Packet Burst (${randomAlertId})`,
          message: `Unusual SMBv3 named pipe connection from compromised host to Tier-1 finance database for Alert ID ${randomAlertId}.`,
          timestamp: 'Just now',
          createdAt: Date.now(),
          isRead: false,
          severity: 'Critical',
          actionLabel: 'Investigate Alert',
          actionType: 'navigate_investigation',
          metadata: { caseId: randomAlertId, clientName: 'Apex Financial' },
        };

    setNotifications((prev) => [newNotif, ...prev]);
    setHasNewAlertAnimation(true);
    setTimeout(() => setHasNewAlertAnimation(false), 2500);
    playChime();

    if (onShowToast) {
      onShowToast(
        newNotif.message,
        5000, // 5 seconds display time
        {
          type: isRebalance ? 'rebalance' : 'new_alert',
          title: newNotif.title,
          alertId: newNotif.metadata?.caseId,
          actionLabel: newNotif.actionLabel,
          onAction: () => {
            if (newNotif.actionType === 'navigate_investigation') {
              onNavigateToInvestigation?.();
            } else if (newNotif.actionType === 'open_rebalancer') {
              onOpenRebalanceModal?.();
            }
          },
        }
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (onShowToast) onShowToast('All notifications marked as read.');
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    if (onShowToast) onShowToast('All notifications cleared.');
  };

  const handleNotificationClick = (notif: SystemNotification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );

    // Perform action
    if (notif.actionType === 'open_rebalancer') {
      if (onOpenRebalanceModal) onOpenRebalanceModal();
      else onNavigateToTab('operations');
      setIsOpen(false);
    } else if (notif.actionType === 'navigate_investigation') {
      if (onNavigateToInvestigation) onNavigateToInvestigation();
      else onNavigateToTab('investigation');
      setIsOpen(false);
    } else if (notif.actionType === 'navigate_tab' && notif.targetTab) {
      onNavigateToTab(notif.targetTab);
      setIsOpen(false);
    }
  };

  // Filtered list
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'alerts') return n.type === 'high_alert' || n.type === 'critical_alert';
    if (activeFilter === 'rebalance') return n.type === 'rebalance_request';
    if (activeFilter === 'unread') return !n.isRead;
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* The Bell Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Real-time System Notifications"
        title="Real-time System Event Notifications (Alerts & Rebalances)"
        className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/40'
            : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800'
        } ${hasNewAlertAnimation ? 'animate-bounce text-cyan-300' : ''}`}
      >
        <Bell className={`w-4 h-4 ${hasNewAlertAnimation ? 'animate-pulse text-cyan-400' : ''}`} />

        {/* Unread Badge / Pulse indicator */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-mono font-extrabold text-white shadow-lg shadow-rose-950 border border-rose-300 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 md:w-[420px] bg-slate-950/95 border border-slate-700 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-xl z-50 overflow-hidden animate-fadeIn flex flex-col max-h-[85vh]">
          {/* Dropdown Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-white text-xs sm:text-sm font-sans">
                    System Event Feed
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>LIVE</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {unreadCount} unread • Critical alerts &amp; rebalances
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  soundEnabled ? 'text-cyan-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
                }`}
                title={soundEnabled ? 'Sound alert enabled' : 'Sound alert muted'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-3.5 py-2 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-mono">
            <div className="flex items-center gap-1">
              {(['all', 'alerts', 'rebalance', 'unread'] as const).map((filterKey) => {
                const label =
                  filterKey === 'all'
                    ? `All (${notifications.length})`
                    : filterKey === 'alerts'
                    ? 'High / Crit'
                    : filterKey === 'rebalance'
                    ? 'Rebalance'
                    : `Unread (${unreadCount})`;

                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setActiveFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap font-semibold ${
                      activeFilter === filterKey
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer whitespace-nowrap pl-1"
                title="Mark all as read"
              >
                <Check className="w-3 h-3" />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[380px] scrollbar-thin">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-mono space-y-2">
                <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No system events in this view</p>
                <button
                  type="button"
                  onClick={handleTriggerSimulatedEvent}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs cursor-pointer inline-flex items-center gap-1.5 mt-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Simulate System Event</span>
                </button>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isCrit = notif.type === 'critical_alert';
                const isHigh = notif.type === 'high_alert';
                const isRebalance = notif.type === 'rebalance_request';
                const isSla = notif.type === 'sla_warning';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 sm:p-4 hover:bg-slate-900/80 transition-all cursor-pointer relative group ${
                      !notif.isRead ? 'bg-slate-900/40' : 'opacity-85'
                    }`}
                  >
                    {/* Unread Indicator Bar on left */}
                    {!notif.isRead && (
                      <span
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          isCrit ? 'bg-red-500' : isRebalance ? 'bg-indigo-500' : 'bg-cyan-500'
                        }`}
                      />
                    )}

                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 border shadow-sm ${
                          isCrit
                            ? 'bg-red-950/80 border-red-500/50 text-red-400'
                            : isHigh
                            ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                            : isRebalance
                            ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-400'
                            : isSla
                            ? 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                            : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400'
                        }`}
                      >
                        {isCrit ? (
                          <Flame className="w-4 h-4 text-red-400" />
                        ) : isHigh ? (
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                        ) : isRebalance ? (
                          <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                        ) : isSla ? (
                          <Clock className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Bell className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`text-xs font-bold truncate ${
                              !notif.isRead ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {notif.timestamp}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>

                        {/* Footer tags and inline action button */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap text-[10px] font-mono">
                          <div className="flex items-center gap-1.5">
                            {notif.metadata?.clientName && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                {notif.metadata.clientName}
                              </span>
                            )}
                            {notif.metadata?.caseId && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-300 font-bold">
                                {notif.metadata.caseId}
                              </span>
                            )}
                            {notif.metadata?.casesCount && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800 text-indigo-300 font-bold">
                                {notif.metadata.casesCount} Cases
                              </span>
                            )}
                          </div>

                          {notif.actionLabel && (
                            <span className="text-cyan-400 group-hover:text-cyan-300 font-semibold flex items-center gap-1 underline underline-offset-2">
                              <span>{notif.actionLabel}</span>
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer Actions */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={handleTriggerSimulatedEvent}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Simulate a real-time event arriving right now"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Simulate Live Event</span>
            </button>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer p-1"
                title="Clear all notifications"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
