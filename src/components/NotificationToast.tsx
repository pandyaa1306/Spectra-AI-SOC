import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ShieldAlert,
  Flame,
  X,
  Clock,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'new_alert' | 'alert_closed' | 'rebalance' | 'info';
  title?: string;
  message: string;
  alertId?: string;
  ticketNumber?: string;
  reason?: string;
  durationMs?: number; // Defaults to 5000 (5 seconds)
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toast, onDismiss }) => {
  const duration = toast?.durationMs ?? 5000;
  const [timeLeftMs, setTimeLeftMs] = useState(duration);

  useEffect(() => {
    if (!toast) return;

    setTimeLeftMs(duration);
    const startTime = Date.now();
    const endTime = startTime + duration;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast, duration, onDismiss]);

  if (!toast) return null;

  const progressPercent = Math.max(0, Math.min(100, (timeLeftMs / duration) * 100));
  const secondsLeft = (timeLeftMs / 1000).toFixed(1);

  const isClosed = toast.type === 'alert_closed';
  const isNewAlert = toast.type === 'new_alert';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-slideUp select-none shadow-2xl">
      <div
        className={`rounded-2xl border p-4 shadow-2xl backdrop-blur-xl relative overflow-hidden ${
          isClosed
            ? 'bg-slate-950/95 border-emerald-500/60 shadow-emerald-950/50'
            : isNewAlert
            ? 'bg-slate-950/95 border-rose-500/60 shadow-rose-950/50'
            : 'bg-slate-950/95 border-cyan-500/60 shadow-cyan-950/50'
        }`}
      >
        {/* Top 5-second Countdown Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div
            className={`h-full transition-all duration-75 ease-linear ${
              isClosed ? 'bg-emerald-400' : isNewAlert ? 'bg-rose-500' : 'bg-cyan-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-start justify-between gap-3 pt-1">
          {/* Status Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              isClosed
                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-400'
                : isNewAlert
                ? 'bg-rose-950/80 border border-rose-500/50 text-rose-400'
                : 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-400'
            }`}
          >
            {isClosed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : isNewAlert ? (
              <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
            ) : (
              <Sparkles className="w-5 h-5 text-cyan-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                    isClosed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isNewAlert
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {isClosed ? 'Alert Status: CLOSED' : isNewAlert ? 'NEW ALERT DETECTED' : 'SYSTEM EVENT'}
                </span>

                {toast.alertId && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    ID: {toast.alertId}
                  </span>
                )}

                {toast.ticketNumber && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                    {toast.ticketNumber}
                  </span>
                )}
              </div>

              {/* 5-second countdown pill */}
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 shrink-0">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{secondsLeft}s</span>
              </div>
            </div>

            <div className="font-bold text-white text-xs sm:text-sm font-sans pt-0.5">
              {toast.title || (isClosed ? `Alert ${toast.alertId || ''} got closed` : 'System Notification')}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {toast.message}
            </p>

            {/* Reason / Tag */}
            {toast.reason && (
              <div className="text-[11px] font-mono text-emerald-400 font-semibold pt-0.5">
                Resolution: <span className="underline">{toast.reason}</span>
              </div>
            )}

            {/* Action button if provided */}
            {toast.actionLabel && toast.onAction && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    onDismiss();
                  }}
                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-md"
                >
                  <span>{toast.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom timer notice */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Auto-dismissing in {secondsLeft}s</span>
          <span className="text-cyan-400">Spectra Real-Time Telemetry</span>
        </div>
      </div>
    </div>
  );
};
