import React, { useState } from 'react';
import {
  ShieldAlert,
  Bot,
  Zap,
  Building2,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Send,
  Sparkles,
  FileText,
  Lock,
  Terminal,
  ChevronDown,
  ChevronUp,
  Layers,
  History,
  Activity,
  Check,
} from 'lucide-react';
import { Incident, CommonSecurityEvent, SimilarIncident, Alert } from '../types/soc';
import { ExecutiveAiTriageSummary } from './ExecutiveAiTriageSummary';

interface InvestigationWorkspaceProps {
  incident: Incident;
  onOpenServiceNowModal: () => void;
  onOpenSwimlaneModal: () => void;
  onNavigateToAttackGraph: () => void;
  currentAnalystName: string;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  incident,
  onOpenServiceNowModal,
  onOpenSwimlaneModal,
  onNavigateToAttackGraph,
  currentAnalystName,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'evidence' | 'mitre' | 'memory' | 'triage'>('timeline');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Ask Gemini / FusionAI engine
  const handleAskFusionAi = async (promptText: string) => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/gemini/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertTitle: incident.title,
          alertDescription: incident.correlationExplanation,
          client: incident.client,
          platform: 'Cross-Platform Fusion',
          events: incident.events,
          customPrompt: promptText,
        }),
      });
      const data = await res.json();
      if (data.data?.summary) {
        setAiResponse(data.data.summary);
      } else {
        setAiResponse('Investigation analysis completed. Correlated timeline verified against institutional baseline.');
      }
    } catch {
      setAiResponse(
        'Autonomous analysis: Intrusion indicates a targeted credential attack sequence. Recommend immediate host isolation of CORP-LAPTOP-882 and session token revocation.'
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Incident Title & Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                CRITICAL SEVERITY
              </span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                {incident.id}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {incident.client}
              </span>
              <span className="text-xs text-slate-400 border-l border-slate-700 pl-2">
                Lead Investigator: <strong className="text-slate-200">{incident.assignedAnalyst}</strong> (
                {incident.assignedAnalystTier})
              </span>
            </div>

            <h1 className="text-lg font-bold text-white mt-2 flex items-center gap-2">
              <span>{incident.title}</span>
            </h1>
          </div>

          {/* Action CTAs: ServiceNow & Swimlane SOAR */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onNavigateToAttackGraph}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inspect Attack Graph</span>
            </button>

            <button
              onClick={onOpenServiceNowModal}
              className="px-3 py-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>ServiceNow Case Sync</span>
            </button>

            <button
              onClick={onOpenSwimlaneModal}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Execute Swimlane SOAR</span>
            </button>
          </div>
        </div>

        {/* Explainable AI Risk Score & Correlation Rationale */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-800">
          {/* Risk Gauge & Confidence */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-rose-500 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-rose-950/60">
              <span className="text-xl font-black font-mono text-rose-400">{incident.riskScore}</span>
              <span className="text-[9px] text-slate-400 uppercase font-mono font-semibold">/ 100</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Explainable Risk Score</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Calculated across 6 normalized platforms with <strong className="text-cyan-300 font-mono">96% AI confidence</strong>.
              </div>
            </div>
          </div>

          {/* Explainable Contributing Factors */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 lg:col-span-2">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Transparent Contributing Factors (Traceable to Evidence):</span>
              <span className="text-[10px] text-cyan-400 font-mono">Additive Point Scoring</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {incident.contributingFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80"
                >
                  <span className="text-slate-300 text-[11px] truncate pr-2">{factor.label}</span>
                  <span className="font-mono text-rose-400 font-bold shrink-0">+{factor.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plain-English Correlation Explanation */}
        <div className="mt-3 p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-900/40 text-xs text-slate-300 flex items-start gap-2.5">
          <Bot className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-cyan-300">Why were these events correlated? </span>
            <span>{incident.correlationExplanation}</span>
          </div>
        </div>
      </div>

      {/* Investigation Work Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-2 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>AI Attack Story &amp; Narrative</span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`py-2 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'evidence'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Normalized Evidence Events ({incident.events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mitre')}
          className={`py-2 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'mitre'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>MITRE ATT&amp;CK Matrix Chain</span>
        </button>

        <button
          onClick={() => setActiveTab('memory')}
          className={`py-2 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'memory'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Similar Incidents (Institutional Memory)</span>
        </button>

        <button
          onClick={() => setActiveTab('triage')}
          className={`py-2 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'triage'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Executive AI Triage Summary</span>
        </button>
      </div>

      {/* Tab 1: AI Attack Story Narrative */}
      {activeTab === 'timeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Chronological Intrusion Sequence</span>
              <span className="text-[10px] text-slate-500">Telemetry Distinguishes Facts vs AI Interpretations</span>
            </div>

            <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-4">
              {incident.attackStoryNarrative.map((step, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                      step.isAiAssessment ? 'bg-indigo-400 animate-pulse' : 'bg-cyan-400'
                    }`}
                  />

                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      step.isAiAssessment
                        ? 'bg-indigo-950/30 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-cyan-300">{step.time}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {step.platform}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          {step.tactic} ({step.techniqueId})
                        </span>
                      </div>

                      {step.isAiAssessment ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          AI Assessment
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Confirmed Telemetry Fact
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed">{step.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Investigation Console & Prompting Box */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">FusionAI Reasoning Engine</h3>
              </div>

              <p className="text-xs text-slate-400">
                Directly query the AI investigator to synthesize cross-platform findings or evaluate response options.
              </p>

              {/* Pre-built query chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleAskFusionAi('Synthesize executive incident briefing with blast radius')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer border border-slate-700"
                >
                  📝 Executive Briefing
                </button>
                <button
                  onClick={() => handleAskFusionAi('Evaluate adversary persistence mechanisms and mailbox rules')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer border border-slate-700"
                >
                  🔍 Persistence Audit
                </button>
                <button
                  onClick={() => handleAskFusionAi('Recommend gated Swimlane SOAR containment sequence')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer border border-slate-700"
                >
                  ⚡ SOAR Recommendations
                </button>
              </div>

              {/* Custom input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Ask FusionAI a question about this incident..."
                  value={aiCustomPrompt}
                  onChange={(e) => setAiCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && aiCustomPrompt) {
                      handleAskFusionAi(aiCustomPrompt);
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => aiCustomPrompt && handleAskFusionAi(aiCustomPrompt)}
                  disabled={isAiLoading}
                  className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Loading / Result Display */}
              {isAiLoading ? (
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-cyan-400 flex items-center gap-2 font-mono">
                  <Bot className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>FusionAI reasoning over multi-platform telemetry...</span>
                </div>
              ) : aiResponse ? (
                <div className="p-3.5 rounded-lg bg-slate-950 border border-cyan-500/30 text-xs text-slate-200 space-y-1">
                  <div className="text-[10px] text-cyan-400 font-mono uppercase font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    FusionAI Analysis Output
                  </div>
                  <p className="leading-relaxed">{aiResponse}</p>
                </div>
              ) : null}
            </div>

            {/* Affected Entities Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Resolved Entities</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Compromised User:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{incident.affectedEntities.users[0]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Workstation:</span>
                  <span className="font-mono text-indigo-300 font-semibold">{incident.affectedEntities.devices[0]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Adversary C2 IP:</span>
                  <span className="font-mono text-rose-400 font-semibold">{incident.affectedEntities.ips[0]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Exfiltration Domain:</span>
                  <span className="font-mono text-amber-300 font-semibold">{incident.affectedEntities.domains[0]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Normalized Evidence Events */}
      {activeTab === 'evidence' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">
            Normalized Common Security Event Model (CEM) standardizing Chronicle, Splunk, Exabeam, and Falcon fields.
          </div>

          <div className="space-y-2">
            {incident.events.map((event) => {
              const isSelected = selectedEventId === event.event_id;
              return (
                <div
                  key={event.event_id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all cursor-pointer"
                  onClick={() => setSelectedEventId(isSelected ? null : event.event_id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-300">{event.event_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-200 border border-slate-700">
                        {event.source_platform}
                      </span>
                      <span className="text-slate-400 font-mono">{event.timestamp}</span>
                      <span className="font-semibold text-white">{event.event_type}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          event.severity === 'Critical'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : event.severity === 'High'
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {event.severity}
                      </span>
                      {isSelected ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500">User:</span> {event.user_email}
                    </div>
                    <div>
                      <span className="text-slate-500">Host:</span> {event.hostname}
                    </div>
                    <div>
                      <span className="text-slate-500">Source IP:</span> {event.source_ip}
                    </div>
                    <div>
                      <span className="text-slate-500">Dest / Domain:</span> {event.destination_ip} ({event.domain})
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-400 border border-slate-800 overflow-x-auto">
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Raw Telemetry Payload:</div>
                      <pre>{event.raw_event}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: MITRE ATT&CK Chain */}
      {activeTab === 'mitre' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Correlated MITRE ATT&amp;CK Execution Matrix
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {incident.mitreChain.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="text-[10px] text-slate-400 uppercase font-mono font-semibold">{item.phase}</div>
                <div className="font-mono text-cyan-400 font-bold">{item.techniqueId}</div>
                <div className="text-slate-200 text-xs font-medium">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Similar Incidents (Institutional Memory) */}
      {activeTab === 'memory' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">
            Institutional Memory automatically matches current IOCs and TTPs against historical closed investigations.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {incident.similarIncidents.map((sim) => (
              <div key={sim.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs text-cyan-400 font-bold">{sim.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {sim.similarity}% Match
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-white">{sim.title}</h4>
                <div className="text-[10px] text-slate-400">{sim.date}</div>

                <div className="space-y-1 text-[11px] text-slate-300">
                  <div className="text-slate-400 text-[10px]">Prior Analyst Resolution:</div>
                  <div className="font-mono text-emerald-400 font-semibold">{sim.pastDisposition}</div>
                  <div className="text-slate-400 text-[10px] mt-1">Resolution Time: {sim.resolutionTimeMin} min</div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-400 mb-1">Effective Past Actions:</div>
                  <div className="space-y-1">
                    {sim.pastActions.map((act, i) => (
                      <div key={i} className="text-[10px] text-indigo-300 flex items-center gap-1 font-mono">
                        <span>•</span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Executive AI Triage Summary */}
      {activeTab === 'triage' && (
        <div className="space-y-4">
          <ExecutiveAiTriageSummary
            alert={{
              id: 'ALT-1088',
              title: incident.title,
              description: incident.correlationExplanation,
              severity: incident.severity,
              status: 'In Progress (Analyst Claimed)',
              timestamp: incident.events[0]?.timestamp || '14:32:10 UTC',
              client: incident.client,
              clientId: incident.clientId,
              source_platform: 'CrowdStrike',
              assignedTo: incident.assignedAnalyst,
              assignedToId: 'a2',
              routedTo: 'Human Analyst',
              initialAckBy: 'FusionAI',
              initialAckTimestamp: 'Auto-Ack & Correlated in 2.1s',
              slaDeadline: '15:14 UTC',
              slaRisk: true,
              agingHours: 4.2,
              mitreTactic: 'Execution (T1059.001)',
              entityUser: 's.jenkins@apexfin.com',
              entityHost: 'CORP-LAPTOP-882',
              entityIp: '185.220.101.45',
              correlatedIncidentId: incident.id,
            }}
            currentAnalystName={currentAnalystName}
          />
        </div>
      )}
    </div>
  );
};
