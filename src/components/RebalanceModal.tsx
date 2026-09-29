import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, AlertTriangle, Users, ShieldAlert } from 'lucide-react';
import { Analyst } from '../types/soc';
import { getAnalystDisplayName } from '../utils/analystUtils';

interface RebalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteRebalance: (sourceId: string, targetId: string, count: number) => void;
  analysts: Analyst[];
}

export const RebalanceModal: React.FC<RebalanceModalProps> = ({
  isOpen,
  onClose,
  onExecuteRebalance,
  analysts,
}) => {
  const [selectedCaseCount, setSelectedCaseCount] = useState<number>(3);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const sourceAnalyst = analysts.find((a) => a.id === 'a2') || analysts[1]; // David Sterling
  const targetAnalyst = analysts.find((a) => a.id === 'a1') || analysts[0]; // Maya Lin

  const handleApprove = () => {
    onExecuteRebalance(sourceAnalyst.id, targetAnalyst.id, selectedCaseCount);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl shadow-amber-950/40">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 w-fit">
                AI Workload Balancing Engine
              </div>
              <h3 className="text-base font-bold text-white mt-1">Rebalance Overloaded Analyst Workload</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {isSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Reassignment Executed Successfully</h4>
            <p className="text-xs text-slate-300">
              {selectedCaseCount} cases reallocated from {sourceAnalyst.name} to {targetAnalyst.name}. Workload
              indexes updated.
            </p>
          </div>
        ) : (
          <div className="space-y-4 my-5 text-xs">
            {/* AI Diagnosis Notice */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40 text-slate-200 space-y-1">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Detected Workload Imbalance:</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                <strong>{sourceAnalyst.name}</strong> currently carries <strong className="text-rose-400">{sourceAnalyst.wip} active WIP items</strong>,
                including <strong className="text-rose-400">{sourceAnalyst.slaRisk} incidents approaching SLA threshold</strong> across{' '}
                {sourceAnalyst.client}.
              </p>
            </div>

            {/* Reassignment Matching Pair */}
            <div className="grid grid-cols-2 gap-3 items-center">
              {/* Overloaded */}
              <div className="p-3 rounded-xl bg-slate-950 border border-rose-900/40 space-y-1">
                <span className="text-[10px] text-rose-400 font-mono font-bold uppercase">Overloaded Source</span>
                <div className="font-bold text-slate-200">{getAnalystDisplayName(sourceAnalyst)}</div>
                <div className="text-[11px] text-slate-400">{sourceAnalyst.client}</div>
                <div className="text-xs font-mono font-bold text-rose-400 mt-1">
                  WIP: {sourceAnalyst.wip} | SLA Risk: {sourceAnalyst.slaRisk}
                </div>
              </div>

              {/* Target */}
              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-1">
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Available Peer</span>
                <div className="font-bold text-slate-200">{getAnalystDisplayName(targetAnalyst)}</div>
                <div className="text-[11px] text-slate-400">{targetAnalyst.client}</div>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                  WIP: {targetAnalyst.wip} | SLA Risk: {targetAnalyst.slaRisk}
                </div>
              </div>
            </div>

            {/* AI Skills Match Explanation */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Skill Matching Justification:
              </span>
              <p className="text-slate-300 leading-relaxed">
                {targetAnalyst.name} has proven competency in Google SecOps UDM and Identity Triage, matching the 3 pending
                OAuth &amp; Login investigations currently stuck in {sourceAnalyst.name}&apos;s backlog.
              </p>
            </div>

            {/* Reassignment Quantity Selector */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300 font-medium">Cases to Reassign:</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedCaseCount(num)}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      selectedCaseCount === num
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Per SOC governance policy, automated rebalancing requires explicit manager review and approval before ticket
              reassignment.
            </p>
          </div>
        )}

        {!isSuccess && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Approve &amp; Reassign {selectedCaseCount} Cases</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
