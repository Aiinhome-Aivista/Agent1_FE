import { cn } from '../lib/utils';
import type { IncidentStatus, RiskTier, PipelineStatus } from '../types';

export function RiskBadge({ tier, size = 'sm' }: { tier: RiskTier; size?: 'sm' | 'md' }) {
  const styles =
    tier === 'High'
      ? 'bg-app-surface text-rose-400 border-rose-500/30'
      : tier === 'Medium'
        ? 'bg-app-surface text-amber-400 border-amber-500/30'
        : 'bg-app-surface text-sky-400 border-sky-500/30';
  return (
    <span
      className={cn(
        'inline-flex items-center font-bold rounded uppercase tracking-[0.15em] border',
        styles,
        size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
      )}
    >
      {tier}
    </span>
  );
}

const STATUS_STYLES: Record<IncidentStatus, string> = {
  Detected: 'bg-app-surface text-rose-400 border-rose-500/30',
  Reasoning: 'bg-app-surface text-violet-400 border-violet-500/30',
  Planning: 'bg-app-surface text-amber-400 border-amber-500/30',
  'Awaiting Approval': 'bg-app-surface text-amber-400 border-amber-500/30',
  Processing: 'bg-app-surface text-sky-400 border-sky-500/30',
  Executing: 'bg-app-surface text-sky-400 border-sky-500/30',
  Evaluating: 'bg-app-surface text-sky-400 border-sky-500/30',
  Remediated: 'bg-app-surface text-emerald-400 border-emerald-500/30',
  Failed: 'bg-app-surface text-rose-400 border-rose-500/30',
  Escalated: 'bg-app-surface text-rose-400 border-rose-500/30',
};

export function StatusBadge({
  status,
  size = 'sm',
  pulse = false,
}: {
  status: IncidentStatus;
  size?: 'sm' | 'md';
  pulse?: boolean;
}) {
  const isLive = ['Reasoning', 'Planning', 'Executing', 'Evaluating'].includes(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold rounded uppercase tracking-[0.15em] border',
        STATUS_STYLES[status],
        size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
      )}
    >
      {(pulse || isLive) && (
        <span
          className={cn(
            'w-1 h-1 rounded-full',
            isLive ? 'bg-current pulse-blue' : 'bg-current',
          )}
        />
      )}
      {status}
    </span>
  );
}

export function PipelineStatusBadge({ status }: { status?: string }) {
  const s = (status || 'unknown').toLowerCase();
  const styles =
    s === 'healthy' || s === 'succeeded'
      ? 'bg-app-surface text-emerald-400 border-emerald-500/30'
      : s === 'degraded'
        ? 'bg-app-surface text-amber-400 border-amber-500/30'
        : (s === 'unhealthy' || s === 'failed')
          ? 'bg-app-surface text-rose-400 border-rose-500/30'
          : 'bg-app-surface text-app-secondary border-app-border';
          
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-[0.15em] inline-flex items-center gap-1',
        styles,
      )}
    >
      {(s === 'unhealthy' || s === 'failed') && (
        <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
      )}
      {status}
    </span>
  );
}
