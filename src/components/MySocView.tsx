import React, { useState } from 'react';
import {
  UserCheck,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Bot,
  Check,
  ArrowRight,
  Sparkles,
  Inbox,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Analyst, Alert, Client } from '../types/soc';
import { ExecutiveAiTriageSummary } from './ExecutiveAiTriageSummary';
import { getAnalystDisplayName } from '../utils/analystUtils';

interface MySocViewProps {
  currentAnalyst: Analyst;
  alerts: Alert[];
  onClaimAlert: (alertId: string) => void;
  onNavigateToInvestigation: (incidentId?: string) => void;
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
  onSendToTuning?: (alertId: string, reason?: string) => void;
  onCloseAlert?: (alertId: string, reason: 'Benign' | 'False Positive' | 'True Positive', notes?: string) => void;
}

export const MySocView: React.FC<MySocViewProps> = ({
  currentAnalyst,
  alerts,
  onClaimAlert,
  onNavigateToInvestigation,
  onEscalateAlert,
  onSendToTuning,
  onCloseAlert,
}) => {
  const [selectedQueueTab, setSelectedQueueTab] = useState<'mywork' | 'fusionai_unclaimed'>('mywork');
  const [selectedAlertForDossier, setSelectedAlertForDossier] = useState<Alert | null>(null);

  // My direct alerts
  const myAlerts = alerts.filter(
    (a) => a.assignedToId === currentAnalyst.id || a.claimedByAnalystId === currentAnalyst.id
  );

  // Alerts analyzed by FusionAI ready for manual claim by this analyst
  const fusionAiUnclaimedAlerts = alerts.filter(
    (a) => a.routedTo === 'FusionAI' && (!a.claimedByAnalystId || a.assignedTo === 'FusionAI')
  );

  return (
    <div className="space-y-6">
      {/* Analyst Header Profile & Shift Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentAnalyst.avatar}
              alt={currentAnalyst.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">{getAnalystDisplayName(currentAnalyst)}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentAnalyst.tier}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  On Duty
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Assigned Client: <strong className="text-slate-200">{currentAnalyst.client}</strong> • Morning Shift (08:00 - 16:00 UTC)
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {currentAnalyst.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-slate-400">Average Case Resolution</div>
            <div className="text-xl font-mono font-bold text-cyan-400 mt-0.5">
              {currentAnalyst.avgResolutionTimeMin} mins
            </div>
            <div className="text-[10px] text-slate-500">Based on last 30 resolved tickets</div>
          </div>
        </div>

        {/* My Work Queue KPI Cards (Matching User Prompt Requirements) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-5 pt-4 border-t border-slate-800">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Assigned to Me</div>
            <div className="text-xl font-mono font-bold text-white mt-1">{currentAnalyst.totalAlerts}</div>
            <div className="text-[9px] text-slate-500">Total Ownership</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-indigo-400 uppercase font-semibold">In Progress</div>
            <div className="text-xl font-mono font-bold text-indigo-300 mt-1">{currentAnalyst.wip}</div>
            <div className="text-[9px] text-slate-500">Active WIP</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Pending</div>
            <div className="text-xl font-mono font-bold text-slate-300 mt-1">{currentAnalyst.pending}</div>
            <div className="text-[9px] text-slate-500">Awaiting Info</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-purple-400 uppercase font-semibold">Escalated</div>
            <div className="text-xl font-mono font-bold text-purple-300 mt-1">{currentAnalyst.escalated}</div>
            <div className="text-[9px] text-slate-500">Tier 3 / IR Lead</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-rose-400 uppercase font-semibold flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              SLA Risk
            </div>
            <div className="text-xl font-mono font-bold text-rose-400 mt-1">{currentAnalyst.slaRisk}</div>
            <div className="text-[9px] text-rose-400/80">&lt;30m threshold</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-rose-300 uppercase font-semibold">Critical</div>
            <div className="text-xl font-mono font-bold text-rose-300 mt-1">{currentAnalyst.critical}</div>
            <div className="text-[9px] text-slate-500">P1 Severity</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-orange-400 uppercase font-semibold">High</div>
            <div className="text-xl font-mono font-bold text-orange-300 mt-1">{currentAnalyst.high}</div>
            <div className="text-[9px] text-slate-500">P2 Severity</div>
          </div>
        </div>
      </div>

      {/* Aging Distribution Breakdown (Matching User Prompt Dimensions) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Incident Aging Distribution (My Assigned Cases)
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-mono">0 – 2 hours</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
              {currentAnalyst.aging.lessThan2h}
            </div>
            <div className="text-[9px] text-slate-500">Fresh Triage</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-mono">2 – 4 hours</div>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
              {currentAnalyst.aging.twoToFourH}
            </div>
            <div className="text-[9px] text-slate-500">Active Investigation</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-mono">4 – 8 hours</div>
            <div className="text-lg font-mono font-bold text-amber-400 mt-1">
              {currentAnalyst.aging.fourToEightH}
            </div>
            <div className="text-[9px] text-slate-500">Mid-Shift Queue</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-mono">8 – 24 hours</div>
            <div className="text-lg font-mono font-bold text-orange-400 mt-1">
              {currentAnalyst.aging.eightToTwentyFourH}
            </div>
            <div className="text-[9px] text-slate-500">Handover Risk</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-rose-400 font-mono font-semibold">« &gt; 24 hours »</div>
            <div
              className={`text-lg font-mono font-bold mt-1 ${
                currentAnalyst.aging.moreThan24h > 0 ? 'text-rose-400 font-black animate-pulse' : 'text-slate-400'
              }`}
            >
              {currentAnalyst.aging.moreThan24h}
            </div>
            <div className="text-[9px] text-rose-400/80">Aged Backlog</div>
          </div>
        </div>
      </div>

      {/* Queue View Switcher: My Assigned Queue vs FusionAI Ready-to-Claim Pool */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedQueueTab('mywork')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedQueueTab === 'mywork'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Active Queue ({myAlerts.length})
            </button>

            <button
              onClick={() => setSelectedQueueTab('fusionai_unclaimed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedQueueTab === 'fusionai_unclaimed'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>FusionAI Triaged Pool ({fusionAiUnclaimedAlerts.length} Ready to Claim)</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {selectedQueueTab === 'fusionai_unclaimed'
              ? 'Low & Med alerts pre-analyzed by FusionAI; pick manually under your name'
              : 'Directly assigned to you'}
          </span>
        </div>

        {/* Tab 1: My Direct Queue */}
        {selectedQueueTab === 'mywork' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-mono border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Severity &amp; Time</th>
                  <th className="py-3 px-4">Alert Name</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Target</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {myAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            alert.severity === 'Critical'
                              ? 'bg-rose-500 animate-ping'
                              : alert.severity === 'High'
                              ? 'bg-orange-500'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-mono font-bold text-slate-200">{alert.severity}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{alert.timestamp}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{alert.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{alert.description}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                      {alert.source_platform}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-200 border border-slate-700">
                        {alert.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono">
                      <span className={alert.slaRisk ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {alert.slaDeadline}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedAlertForDossier(alert)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-medium cursor-pointer flex items-center gap-1 transition-all"
                          title="View Executive AI Triage Summary"
                        >
                          <Bot className="w-3.5 h-3.5 text-cyan-400" />
                          <span>AI Triage</span>
                        </button>
                        <button
                          onClick={() => onNavigateToInvestigation(alert.correlatedIncidentId || 'FUS-INC-2026-8841')}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-medium cursor-pointer transition-all"
                        >
                          Investigate
                        </button>
                        {onCloseAlert && alert.status !== 'Closed' && (
                          <button
                            onClick={() => onCloseAlert(alert.id, 'Benign', `Dispositioned as Benign by ${currentAnalyst.name} from My SOC Queue`)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition-all"
                            title={`Close Alert ID ${alert.id}`}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: FusionAI Ready to Claim Pool */}
        {selectedQueueTab === 'fusionai_unclaimed' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-900/40 text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>
                  These Low &amp; Medium alerts were auto-acknowledged by <strong className="text-cyan-300">FusionAI</strong>,
                  enriched with multi-source evidence, and generated with an Analysis Report.
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">Click &quot;Claim Alert&quot; to take ownership</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fusionAiUnclaimedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
                          {alert.id}
                        </span>
                        <span className="text-xs text-slate-400">{alert.source_platform}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white mt-1">{alert.title}</h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-emerald-400 block">
                        Ack: {alert.initialAckTimestamp?.split(' ')[1] || '< 2s'}
                      </span>
                      <span className="text-[10px] text-slate-500">{alert.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{alert.description}</p>

                  {/* AI Report Card Preview */}
                  {alert.aiReport && (
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          FusionAI Threat Score: {alert.aiReport.riskScore}/100
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Platforms: {alert.aiReport.correlatedPlatforms.join(', ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{alert.aiReport.summary}</p>
                      <button
                        onClick={() => setSelectedAlertForDossier(alert)}
                        className="mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>View Executive AI Triage Report (When, Key Indicators, Impact, Forensics, Actions)</span>
                      </button>
                    </div>
                  )}

                  {/* Action: Claim Alert */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-slate-400">Client: {alert.client}</span>

                    <button
                      onClick={() => onClaimAlert(alert.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Claim Alert (Assign to {getAnalystDisplayName(currentAnalyst)})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Executive AI Triage Summary Modal for MySocView */}
      {selectedAlertForDossier && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl shadow-cyan-950/70 max-h-[92vh] overflow-y-auto">
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
                      {selectedAlertForDossier.aiReport?.generatedAt || selectedAlertForDossier.timestamp}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      ID: {selectedAlertForDossier.id}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{selectedAlertForDossier.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertForDossier(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="my-4">
              <ExecutiveAiTriageSummary
                alert={selectedAlertForDossier}
                allAlerts={alerts}
                currentAnalystName={currentAnalyst.name}
                onClaimAlert={(id) => {
                  onClaimAlert(id);
                  setSelectedAlertForDossier(null);
                }}
                onSendToTuning={(id, reason) => {
                  if (onSendToTuning) onSendToTuning(id, reason);
                  setSelectedAlertForDossier(null);
                }}
                onCloseAlert={(id, reason, notes) => {
                  if (onCloseAlert) onCloseAlert(id, reason, notes);
                  setSelectedAlertForDossier(null);
                }}
                onEscalateAlert={(id, target, details) => {
                  if (onEscalateAlert) onEscalateAlert(id, target, details);
                  setSelectedAlertForDossier(null);
                }}
                isModalView={true}
              />
            </div>

            <div className="flex items-center justify-end border-t border-slate-800 pt-4 gap-2">
              <button
                onClick={() => setSelectedAlertForDossier(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
              {selectedAlertForDossier.assignedTo === 'FusionAI' && (
                <button
                  onClick={() => {
                    onClaimAlert(selectedAlertForDossier.id);
                    setSelectedAlertForDossier(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  <Check className="w-4 h-4" />
                  <span>Claim Alert (Assign to {getAnalystDisplayName(currentAnalyst)})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
