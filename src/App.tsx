import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommandCenter } from './components/CommandCenter';
import { AnalystOperations } from './components/AnalystOperations';
import { DashboardsAndReports } from './components/DashboardsAndReports';
import { RuleTuningDashboard } from './components/RuleTuningDashboard';
import { InvestigationWorkspace } from './components/InvestigationWorkspace';
import { AttackGraph } from './components/AttackGraph';
import { MySocView } from './components/MySocView';
import { DrilldownResultsModal, DrilldownFilterContext } from './components/DrilldownResultsModal';
import { ExecutiveAiTriageSummary } from './components/ExecutiveAiTriageSummary';
import { RebalanceModal } from './components/RebalanceModal';
import { ServiceNowModal } from './components/ServiceNowModal';
import { SwimlaneModal } from './components/SwimlaneModal';
import { NotificationToast, ToastData } from './components/NotificationToast';
import { SystemNotification } from './components/HeaderNotificationsDropdown';

import {
  INITIAL_CLIENTS,
  INITIAL_ANALYSTS,
  INITIAL_ALERTS,
  MASTER_INCIDENT,
  ATTACK_GRAPH_NODES,
  ATTACK_GRAPH_EDGES,
  DETECTION_RULE_FATIGUE_DATA,
  INITIAL_SWIMLANE_ACTIONS,
  INITIAL_SERVICENOW_DRAFT,
} from './data/mockSocData';
import { Alert, Analyst, Client, Incident, SwimlaneAction, DetectionRuleFatigue } from './types/soc';
import { getAlertTicketNumber, getAlertCaseNumber, formatTicketNumber, formatCaseNumber } from './utils/ticketUtils';
import { CheckCircle2, Menu, X, Shield, Bell, Sliders, ChevronRight } from 'lucide-react';

export default function App() {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);

  // Ensure every analyst and their in-progress cases have ticket/case numbers
  const [analysts, setAnalysts] = useState<Analyst[]>(() =>
    INITIAL_ANALYSTS.map((an) => ({
      ...an,
      activeInProgressCases: an.activeInProgressCases?.map((c) => ({
        ...c,
        ticketNumber: c.ticketNumber || formatTicketNumber(c.id, 'TCK'),
        caseNumber: c.caseNumber || formatCaseNumber(c.id),
      })),
    }))
  );

  // Ensure every alert has ticketNumber and caseNumber
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    INITIAL_ALERTS.map((a) => ({
      ...a,
      ticketNumber: a.ticketNumber || getAlertTicketNumber(a),
      caseNumber: a.caseNumber || getAlertCaseNumber(a),
    }))
  );

  const [incident, setIncident] = useState<Incident>(() => ({
    ...MASTER_INCIDENT,
    servicenowCaseId: MASTER_INCIDENT.servicenowCaseId || 'CS-APX-8841-01',
  }));

  const [nodes, setNodes] = useState(ATTACK_GRAPH_NODES);
  const [edges, setEdges] = useState(ATTACK_GRAPH_EDGES);
  const [detectionRules, setDetectionRules] = useState<DetectionRuleFatigue[]>(DETECTION_RULE_FATIGUE_DATA);
  const [swimlaneActions, setSwimlaneActions] = useState<SwimlaneAction[]>(INITIAL_SWIMLANE_ACTIONS);
  const [serviceNowDraft, setServiceNowDraft] = useState(INITIAL_SERVICENOW_DRAFT);

  // Load live clients/alerts from the server when a database is configured (HTTP 204 = keep bundled demo data)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/bootstrap')
      .then((res) => (res.status === 200 ? res.json() : null))
      .then((data: { clients?: Client[]; alerts?: Alert[] } | null) => {
        if (cancelled || !data) return;
        if (data.clients?.length) setClients(data.clients);
        if (data.alerts?.length)
          setAlerts(
            data.alerts.map((a) => ({
              ...a,
              ticketNumber: a.ticketNumber || getAlertTicketNumber(a),
              caseNumber: a.caseNumber || getAlertCaseNumber(a),
            }))
          );
      })
      .catch(() => {
        /* offline / no API — stay on demo data */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<string>('command');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedAnalystId, setSelectedAnalystId] = useState<string>('a2'); // Default to David Sterling (Tier 2 Apex)

  // Sidebar Layout States (in side by default: isSidebarVisible = true)
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Interactive Drilldown Results Modal (User requirement: click user name or total count link -> results)
  const [drilldownContext, setDrilldownContext] = useState<DrilldownFilterContext | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState<boolean>(false);
  const [drilldownSelectedAlertForReport, setDrilldownSelectedAlertForReport] = useState<Alert | null>(null);

  // Modals
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState<boolean>(false);
  const [isServiceNowModalOpen, setIsServiceNowModalOpen] = useState<boolean>(false);
  const [isSwimlaneModalOpen, setIsSwimlaneModalOpen] = useState<boolean>(false);

  // Toast notification banner with 5-second countdown timer
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);
  const [incomingNotification, setIncomingNotification] = useState<SystemNotification | null>(null);

  const showToast = (
    msg: string,
    durationMs: number = 5000,
    meta?: {
      type?: 'new_alert' | 'alert_closed' | 'rebalance' | 'info';
      title?: string;
      alertId?: string;
      ticketNumber?: string;
      reason?: string;
      actionLabel?: string;
      onAction?: () => void;
    }
  ) => {
    setActiveToast({
      id: `toast-${Date.now()}`,
      type: meta?.type || 'info',
      title: meta?.title,
      message: msg,
      alertId: meta?.alertId,
      ticketNumber: meta?.ticketNumber,
      reason: meta?.reason,
      durationMs,
      actionLabel: meta?.actionLabel,
      onAction: meta?.onAction,
    });
  };

  // Determine current active analyst
  const currentAnalyst =
    analysts.find((a) => a.id === selectedAnalystId) ||
    analysts.find((a) => !a.isAiInvestigator) ||
    analysts[1];

  // Open drilldown results modal handler
  const handleOpenDrilldown = (context: DrilldownFilterContext) => {
    setDrilldownContext(context);
    setIsDrilldownOpen(true);
  };

  // Claim Alert Handler (Low & Med alerts analyzed by FusionAI can be manually claimed by analyst)
  const handleClaimAlert = (alertId: string) => {
    const alertToClaim = alerts.find((a) => a.id === alertId);
    if (!alertToClaim) return;

    const claimingAnalyst = currentAnalyst;

    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id === alertId) {
          return {
            ...a,
            status: 'In Progress (Analyst Claimed)',
            assignedTo: claimingAnalyst.name,
            assignedToId: claimingAnalyst.id,
            claimedByAnalystId: claimingAnalyst.id,
            claimedByAnalystName: claimingAnalyst.name,
            claimedTimestamp: new Date().toLocaleTimeString() + ' UTC',
          };
        }
        return a;
      })
    );

    // Update claiming analyst WIP and Total cases
    setAnalysts((prev) =>
      prev.map((an) => {
        if (an.id === claimingAnalyst.id) {
          const updatedLoads = an.clientAlertLoads?.map((l) =>
            l.clientId === alertToClaim.clientId ? { ...l, alertsPicked: l.alertsPicked + 1 } : l
          );
          return {
            ...an,
            wip: an.wip + 1,
            totalAlerts: an.totalAlerts + 1,
            assigned: an.assigned + 1,
            clientAlertLoads: updatedLoads || an.clientAlertLoads,
          };
        }
        // Decrement FusionAI WIP
        if (an.id === 'fusionai') {
          const updatedLoads = an.clientAlertLoads?.map((l) =>
            l.clientId === alertToClaim.clientId ? { ...l, alertsPicked: Math.max(0, l.alertsPicked - 1) } : l
          );
          return {
            ...an,
            wip: Math.max(0, an.wip - 1),
            clientAlertLoads: updatedLoads || an.clientAlertLoads,
          };
        }
        return an;
      })
    );

    showToast(`Alert "${alertToClaim.title}" claimed by ${claimingAnalyst.name}. Dossier transferred.`);
  };

  // Send Alert Detection Rule to Tuning Engine (User requirement)
  const handleSendToTuning = (alertId: string, reason?: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return;

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, tuningFlagged: true, tuningReason: reason || 'High benign duplicate pattern' }
          : a
      )
    );

    // Add or flag in detectionRules
    setDetectionRules((prev) => {
      const existing = prev.find(
        (r) =>
          (r.name && r.name.toLowerCase().includes(alert.title.toLowerCase())) ||
          r.ruleName.toLowerCase().includes(alert.title.toLowerCase()) ||
          r.platform === alert.source_platform
      );

      if (existing) {
        return prev.map((r) =>
          r.id === existing.id
            ? {
                ...r,
                duplicates: r.duplicates + 1,
                totalAlerts24h: r.totalAlerts24h + 1,
                noiseRatio: Math.min(99, r.noiseRatio + 2),
                triggerCount7d: (r.triggerCount7d || 100) + 1,
                falsePositiveRate: Math.min(99, (r.falsePositiveRate || 80) + 4),
              }
            : r
        );
      }

      const newRule: DetectionRuleFatigue = {
        id: `rule-custom-${Date.now()}`,
        ruleId: `RULE-${alert.source_platform.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        ruleName: `Ingestion Tuning: ${alert.title}`,
        name: `Ingestion Tuning: ${alert.title}`,
        platform: alert.source_platform,
        totalAlerts24h: 38,
        benignClosed: 32,
        duplicates: 18,
        truePositives: 2,
        noiseRatio: 89,
        aiRecommendation: `Apply exclusion rule for client ${alert.client} to suppress repeated benign triggers.`,
        suggestedTuning: `ADD_EXCLUSION: process.name NOT IN ("trusted_updater.exe") AND host.domain == "${alert.client.split(' ')[0].toLowerCase()}.internal"`,
        tuningApplied: false,
        category: alert.mitreTactic || 'Defense Evasion',
        severity: alert.severity,
        triggerCount7d: 148,
        falsePositiveRate: 86,
        noiseScore: 92,
        tuningRecommendation: `Add exclusion rule for client ${alert.client} to suppress repeated benign triggers.`,
      };

      return [newRule, ...prev];
    });

    showToast(`Alert ${getAlertTicketNumber(alert)} flagged & sent to Alert Fatigue / Rule Tuning Engine.`);
  };

  // Close Alert as Benign or False Positive (User requirement)
  const handleCloseAlert = (
    alertId: string,
    reason: 'Benign' | 'False Positive' | 'True Positive',
    notes?: string
  ) => {
    const targetAlert = alerts.find((a) => a.id === alertId);
    if (!targetAlert) return;

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'Closed',
              closureReason: reason,
              resolutionNotes: notes || `Dispositioned as ${reason} by ${currentAnalyst.name}`,
            }
          : a
      )
    );

    const alertIdStr = targetAlert.id.toUpperCase();
    const ticketStr = targetAlert.ticketNumber || getAlertTicketNumber(targetAlert);
    const closureMessage = `Alert ID ${alertIdStr} (${ticketStr}) got closed — Marked as ${reason} by ${currentAnalyst.name}.`;

    showToast(closureMessage, 5000, {
      type: 'alert_closed',
      title: `Alert ID ${alertIdStr} Got Closed`,
      alertId: alertIdStr,
      ticketNumber: ticketStr,
      reason: `Closed as ${reason}`,
    });

    setIncomingNotification({
      id: `closed-${Date.now()}`,
      type: 'automation_executed',
      title: `✅ Alert ID ${alertIdStr} Got Closed`,
      message: `Alert ID ${alertIdStr} (${ticketStr}) got closed as ${reason} by ${currentAnalyst.name}.`,
      timestamp: 'Just now',
      createdAt: Date.now(),
      isRead: false,
      metadata: { caseId: alertIdStr, clientName: targetAlert.client },
    });
  };

  // Escalate Alert Handler (User requirement: alert escalation options for Client Team or T3/SME across all severity cases)
  const handleEscalateAlert = (
    alertId: string,
    target: 'Client Team' | 'T3 / SME',
    details: {
      recipient?: string;
      reason: string;
      urgency: 'Standard' | 'High' | 'Emergency';
      actionRequired?: string;
    }
  ) => {
    const targetAlert = alerts.find((a) => a.id === alertId);
    if (!targetAlert) return;

    const timeStr = new Date().toLocaleTimeString() + ' UTC';

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'Escalated',
              escalatedTo: target,
              escalationTarget: details.recipient,
              escalationReason: details.reason,
              escalationUrgency: details.urgency,
              escalationActionRequired: details.actionRequired,
              escalationTimestamp: timeStr,
            }
          : a
      )
    );

    showToast(
      `Case ${getAlertTicketNumber(targetAlert)} successfully escalated to ${target} (${details.recipient || 'Designated Lead'}) with ${details.urgency} priority.`
    );
  };

  // Workload Rebalancing Execution Handler
  const handleExecuteRebalance = (sourceId: string, targetId: string, count: number) => {
    setAnalysts((prev) =>
      prev.map((a) => {
        if (a.id === sourceId) {
          return {
            ...a,
            wip: Math.max(0, a.wip - count),
            totalAlerts: Math.max(0, a.totalAlerts - count),
            slaRisk: Math.max(0, a.slaRisk - 1),
          };
        }
        if (a.id === targetId) {
          return {
            ...a,
            wip: a.wip + count,
            totalAlerts: a.totalAlerts + count,
          };
        }
        return a;
      })
    );

    showToast(`Rebalanced: ${count} cases safely reallocated to Maya Lin with manager sign-off.`);
  };

  // Detection rule tuning applied
  const handleApplyRuleTuning = (ruleId: string) => {
    setDetectionRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, tuningApplied: true } : r))
    );
    showToast('AI tuning filter applied. Suppressing benign duplicates at ingestion layer.');
  };

  // ServiceNow Case Created
  const handleCaseCreated = (ticketNumber: string) => {
    setIncident((prev) => ({
      ...prev,
      servicenowCaseId: ticketNumber,
    }));
    showToast(`ServiceNow ticket ${ticketNumber} synchronized with CMDB asset APX-CMDB-0928.`);
  };

  // Swimlane SOAR Action Executed
  const handleSwimlaneActionExecuted = (actionId: string) => {
    setSwimlaneActions((prev) =>
      prev.map((act) => (act.id === actionId ? { ...act, status: 'Completed' } : act))
    );
    showToast('Playbook executed successfully. Containment verified by sensor receipt.');
  };

  const unclaimedFusionAiAlertsCount = alerts.filter(
    (a) => a.routedTo === 'FusionAI' && a.status.includes('FusionAI Investigating')
  ).length;

  const totalSlaRisks = analysts
    .filter((a) => !a.isAiInvestigator)
    .reduce((acc, curr) => acc + curr.slaRisk, 0);

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-row font-sans overflow-hidden">
      {/* Real-Time Toast Notification Banner with 5-Second Timer & Progress Bar */}
      <NotificationToast toast={activeToast} onDismiss={() => setActiveToast(null)} />

      {/* Desktop Left-Side Menu (Permanently docked in side by default, stays locked when scrolling alerts/analysts) */}
      {isSidebarVisible && (
        <div className="hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30 animate-fadeIn">
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
            }}
            unclaimedCount={unclaimedFusionAiAlertsCount}
            slaBreachCount={totalSlaRisks}
            userEmail="soc.analyst@spectra.local"
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onHideSidebar={() => setIsSidebarVisible(false)}
          />
        </div>
      )}

      {/* Floating Left Edge Button when SOC Menu is hidden */}
      {!isSidebarVisible && (
        <button
          type="button"
          onClick={() => setIsSidebarVisible(true)}
          className="hidden lg:flex fixed left-0 top-24 z-40 bg-slate-900/95 hover:bg-cyan-950 border-r border-y border-cyan-500/40 text-cyan-300 px-2 py-3.5 rounded-r-xl shadow-2xl shadow-cyan-950/80 flex-col items-center gap-2 transition-all cursor-pointer group hover:pl-3"
          title="Show SOC Side Menu"
        >
          <Menu className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-mono font-bold [writing-mode:vertical-lr] tracking-widest text-slate-300 group-hover:text-cyan-300">
            SHOW MENU
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-72 bg-slate-950 flex flex-col h-full border-r border-slate-800 shadow-2xl">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white text-sm">Spectra Autonomous AI SOC</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setIsMobileMenuOpen(false);
                }}
                unclaimedCount={unclaimedFusionAiAlertsCount}
                slaBreachCount={totalSlaRisks}
                userEmail="soc.analyst@spectra.local"
                isCollapsed={false}
                onHideSidebar={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Right Content Layout Area - Independent vertical scrolling */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-slate-950 scrollbar-thin">
        {/* Mobile Top Header with Hamburger Toggle */}
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-bold font-mono">SOC MENU</span>
          </button>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="font-bold text-white">Spectra Autonomous AI SOC</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800">
              {activeTab.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Global Master Header with Hide/Show SOC Menu button */}
        <Header
          clients={clients}
          analysts={analysts}
          selectedClientId={selectedClientId}
          onSelectClient={setSelectedClientId}
          selectedAnalystId={selectedAnalystId}
          onSelectAnalyst={setSelectedAnalystId}
          onNavigateToTab={setActiveTab}
          isSidebarVisible={isSidebarVisible}
          onToggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
          onOpenRebalanceModal={() => setIsRebalanceModalOpen(true)}
          onNavigateToInvestigation={() => setActiveTab('investigation')}
          onShowToast={showToast}
          incomingNotification={incomingNotification}
        />

        {/* Main Content Dynamic Router by activeTab */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6">
          {/* 1. SOC Command Center */}
          {activeTab === 'command' && (
            <CommandCenter
              clients={clients}
              alerts={alerts}
              analysts={analysts}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onNavigateToInvestigation={() => {
                setActiveTab('investigation');
              }}
              onClaimAlert={handleClaimAlert}
              onSendToTuning={handleSendToTuning}
              onCloseAlert={handleCloseAlert}
              onEscalateAlert={handleEscalateAlert}
              onOpenDrilldown={handleOpenDrilldown}
              currentAnalystName={currentAnalyst.name}
              onNavigateToTab={setActiveTab}
              onSelectAnalystPerspective={(analystId) => {
                setSelectedAnalystId(analystId);
                setActiveTab('mysoc');
              }}
            />
          )}

          {/* 2. Analyst Operations (Includes Alert & Tool Maturity Matrix) */}
          {activeTab === 'operations' && (
            <AnalystOperations
              analysts={analysts}
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onOpenRebalanceModal={() => setIsRebalanceModalOpen(true)}
              detectionRules={detectionRules}
              onApplyRuleTuning={handleApplyRuleTuning}
              onSelectAnalystPerspective={(analystId) => {
                setSelectedAnalystId(analystId);
                setActiveTab('mysoc');
              }}
            />
          )}

          {/* 3. Dashboards & Reports (New unified dashboard requested by user) */}
          {(activeTab === 'dashboards-reports' || activeTab === 'exec-reports') && (
            <DashboardsAndReports
              alerts={alerts}
              analysts={analysts}
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onSelectAnalystPerspective={(analystId) => {
                setSelectedAnalystId(analystId);
                setActiveTab('mysoc');
              }}
              onNavigateToInvestigation={() => setActiveTab('investigation')}
              onNavigateToTab={setActiveTab}
              onOpenDrilldown={handleOpenDrilldown}
              userEmail="soc.analyst@spectra.local"
              onShowToast={showToast}
            />
          )}

          {/* 4. Alert Fatigue Detection & Rule Tuning Engine (User requirement: new dashboard tab) */}
          {activeTab === 'rule-tuning' && (
            <RuleTuningDashboard
              detectionRules={detectionRules}
              onApplyRuleTuning={handleApplyRuleTuning}
              flaggedAlerts={alerts.filter((a) => a.tuningFlagged)}
              onSelectClient={setSelectedClientId}
              onShowToast={showToast}
            />
          )}

          {/* 5. FusionAI Autonomous SOC Investigation */}
          {activeTab === 'investigation' && (
            <InvestigationWorkspace
              incident={incident}
              onOpenServiceNowModal={() => setIsServiceNowModalOpen(true)}
              onOpenSwimlaneModal={() => setIsSwimlaneModalOpen(true)}
              onNavigateToAttackGraph={() => setActiveTab('attackgraph')}
              currentAnalystName={currentAnalyst.name}
            />
          )}

          {/* 6. Multi-Entity Attack Graph */}
          {activeTab === 'attackgraph' && (
            <AttackGraph
              nodes={nodes}
              edges={edges}
              onOpenSwimlaneModal={() => setIsSwimlaneModalOpen(true)}
            />
          )}

          {/* 7. My SOC Personal Workspace & Claimed Queue */}
          {activeTab === 'mysoc' && (
            <MySocView
              currentAnalyst={currentAnalyst}
              alerts={alerts}
              onClaimAlert={handleClaimAlert}
              onSendToTuning={handleSendToTuning}
              onCloseAlert={handleCloseAlert}
              onEscalateAlert={handleEscalateAlert}
              onNavigateToInvestigation={() => setActiveTab('investigation')}
            />
          )}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>
              FusionAI Security Operations Center • 3 Enterprise Client Pods • 9 Shift Analysts on Morning Shift
            </span>
            <span className="font-mono text-[11px] text-cyan-400">
              Autonomous Investigation &amp; Common Security Event Model (CEM)
            </span>
          </div>
        </footer>
      </div>

      {/* Interactive Drilldown Results Modal (User requirement: click user name or total count link -> results) */}
      <DrilldownResultsModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        filterContext={drilldownContext}
        alerts={alerts}
        analysts={analysts}
        clients={clients}
        onSelectAlertForReport={(alert) => {
          setDrilldownSelectedAlertForReport(alert);
        }}
        onClaimAlert={handleClaimAlert}
        onSendToTuning={handleSendToTuning}
        onCloseAlert={handleCloseAlert}
        onDrilldownAgain={(newContext) => {
          setDrilldownContext(newContext);
        }}
        currentAnalystName={currentAnalyst.name}
      />

      {/* Executive AI Triage Summary Modal for Drilldown Alerts */}
      {drilldownSelectedAlertForReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                  AI Triage Dossier • {getAlertTicketNumber(drilldownSelectedAlertForReport)}
                </span>
                <h3 className="text-base font-bold text-white">
                  {drilldownSelectedAlertForReport.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownSelectedAlertForReport(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ExecutiveAiTriageSummary
              alert={drilldownSelectedAlertForReport}
              allAlerts={alerts}
              currentAnalystName={currentAnalyst.name}
              onClaimAlert={(id) => {
                handleClaimAlert(id);
                setDrilldownSelectedAlertForReport(null);
              }}
              onSendToTuning={(id, reason) => {
                handleSendToTuning(id, reason);
                setDrilldownSelectedAlertForReport(null);
              }}
              onCloseAlert={(id, reason, notes) => {
                handleCloseAlert(id, reason, notes);
                setDrilldownSelectedAlertForReport(null);
              }}
              onEscalateAlert={(id, target, details) => {
                handleEscalateAlert(id, target, details);
                setDrilldownSelectedAlertForReport(null);
              }}
              isModalView={true}
            />
          </div>
        </div>
      )}

      {/* Workload Rebalance Modal */}
      <RebalanceModal
        isOpen={isRebalanceModalOpen}
        onClose={() => setIsRebalanceModalOpen(false)}
        onExecuteRebalance={handleExecuteRebalance}
        analysts={analysts}
      />

      {/* ServiceNow Incident Modal */}
      <ServiceNowModal
        isOpen={isServiceNowModalOpen}
        onClose={() => setIsServiceNowModalOpen(false)}
        draft={serviceNowDraft}
        onCaseCreated={handleCaseCreated}
      />

      {/* Swimlane SOAR Modal */}
      <SwimlaneModal
        isOpen={isSwimlaneModalOpen}
        onClose={() => setIsSwimlaneModalOpen(false)}
        actions={swimlaneActions}
        onActionExecuted={handleSwimlaneActionExecuted}
        currentAnalystName={currentAnalyst.name}
      />
    </div>
  );
}
