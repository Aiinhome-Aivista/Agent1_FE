import { cn } from '../lib/utils';
import type { IncidentStatus, RiskTier, PipelineStatus } from '../types';

export function RiskBadge({ tier, size = 'sm' }: { tier: RiskTier; size?: 'sm' | 'md' }) {
  const styles =
    tier === 'High'
      ? 'bg-red-50 text-red-700 border-red-100'
      : tier === 'Medium'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-blue-50 text-blue-700 border-blue-100';
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
  Detected: 'bg-red-50 text-red-700 border-red-100',
  Reasoning: 'bg-purple-50 text-purple-700 border-purple-100',
  Planning: 'bg-amber-50 text-amber-700 border-amber-100',
  'Awaiting Approval': 'bg-amber-50 text-amber-700 border-amber-100',
  Processing: 'bg-blue-50 text-blue-700 border-blue-100',
  Executing: 'bg-blue-50 text-blue-700 border-blue-100',
  Evaluating: 'bg-blue-50 text-blue-700 border-blue-100',
  Remediated: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Failed: 'bg-red-50 text-red-700 border-red-100',
  Escalated: 'bg-red-50 text-red-700 border-red-100',
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
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : s === 'degraded'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : (s === 'unhealthy' || s === 'failed')
          ? 'bg-red-50 text-red-700 border-red-100'
          : 'bg-gray-50 text-gray-700 border-gray-100';
          
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
