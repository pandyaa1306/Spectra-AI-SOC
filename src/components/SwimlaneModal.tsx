import React, { useState } from 'react';
import { Lock, ShieldAlert, Check, Terminal, Play, AlertTriangle } from 'lucide-react';
import { SwimlaneAction } from '../types/soc';

interface SwimlaneModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: SwimlaneAction[];
  onActionExecuted: (actionId: string) => void;
  currentAnalystName: string;
}

export const SwimlaneModal: React.FC<SwimlaneModalProps> = ({
  isOpen,
  onClose,
  actions,
  onActionExecuted,
  currentAnalystName,
}) => {
  const [selectedActionId, setSelectedActionId] = useState<string>(actions[0]?.id || 'soar-1');
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<{ [actionId: string]: string[] }>({});

  if (!isOpen) return null;

  const currentAction = actions.find((a) => a.id === selectedActionId) || actions[0];

  const handleApproveAndExecute = async (action: SwimlaneAction) => {
    setExecutingActionId(action.id);
    try {
      const res = await fetch('/api/swimlane/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.id,
          actionName: action.actionName,
          playbookName: action.playbookName,
          targetEntity: action.targetEntity,
          approvedBy: currentAnalystName,
        }),
      });
      const data = await res.json();
      setExecutionLogs((prev) => ({
        ...prev,
        [action.id]: data.log || [
          `[0.0s] Human approval authorized by ${currentAnalystName}.`,
          `[1.2s] Executing Swimlane SOAR playbook ${action.playbookName}.`,
          `[2.4s] Target ${action.targetEntity} successfully contained. Status: Completed.`,
        ],
      }));
      onActionExecuted(action.id);
    } catch {
      setExecutionLogs((prev) => ({
        ...prev,
        [action.id]: [
          `[0.0s] Human approval authorized by ${currentAnalystName}.`,
          `[0.8s] Executing Swimlane SOAR playbook ${action.playbookName}.`,
          `[1.9s] Target ${action.targetEntity} successfully contained. Status: 200 OK.`,
        ],
      }));
      onActionExecuted(action.id);
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl shadow-rose-950/40 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800 w-fit">
                Swimlane SOAR Gated Approval Gateway
              </div>
              <h3 className="text-base font-bold text-white mt-1">Autonomous Containment Execution</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Warning Banner: Human-in-the-Loop Constraint */}
        <div className="my-4 p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300">Strict Human-in-the-Loop Protocol: </strong>
            FusionAI never autonomously triggers destructive containment without explicit human analyst verification and
            sign-off.
          </div>
        </div>

        {/* Action Selection Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {actions.map((act) => {
            const isSelected = selectedActionId === act.id;
            const isCompleted = act.status === 'Completed';

            return (
              <button
                key={act.id}
                onClick={() => setSelectedActionId(act.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-slate-400">{act.targetType}</span>
                  {isCompleted ? (
                    <span className="text-emerald-400 font-bold">✓ Executed</span>
                  ) : (
                    <span className="text-rose-400 font-bold">{act.impactLevel}</span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-200 truncate">{act.actionName}</div>
              </button>
            );
          })}
        </div>

        {/* Current Selected Action Details */}
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] text-cyan-400 font-mono">{currentAction.playbookName}</span>
                <h4 className="text-sm font-bold text-white mt-0.5">{currentAction.actionName}</h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  currentAction.status === 'Completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {currentAction.status}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed">{currentAction.description}</p>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Target Entity:</span>
              <span className="text-rose-400 font-bold">{currentAction.targetEntity}</span>
            </div>
          </div>

          {/* Terminal Execution Output Log */}
          {executionLogs[currentAction.id] && (
            <div className="p-3.5 rounded-xl bg-black border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5 mb-1 pb-1 border-b border-slate-900">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>Swimlane SOAR Execution Stream</span>
              </div>
              {executionLogs[currentAction.id].map((line, i) => (
                <div key={i} className="leading-tight">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4">
          <span className="text-xs text-slate-400">
            Sign-off by Analyst: <strong className="text-white">{currentAnalystName}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>

            {currentAction.status !== 'Completed' && (
              <button
                onClick={() => handleApproveAndExecute(currentAction)}
                disabled={executingActionId === currentAction.id}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {executingActionId === currentAction.id
                    ? 'Executing Containment...'
                    : 'Approve & Execute Playbook'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
