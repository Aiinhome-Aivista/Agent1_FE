import type { LogEntry } from '../types';
import { cn } from '../lib/utils';

interface Props {
  logs: LogEntry[];
  filter?: string | null; // incident id filter
  height?: string;
  compact?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  error: 'text-red-500',
  warn: 'text-amber-500',
  agent: 'text-app-brand',
  tool: 'text-purple-500',
  info: 'text-[#9CA3AF]',
};

const ROLE_COLORS: Record<string, string> = {
  orchestrator: 'text-slate-700',
  monitoring: 'text-app-brand',
  diagnosis: 'text-purple-600',
  remediation: 'text-amber-600',
  optimization: 'text-emerald-600',
  learning: 'text-app-brand',
};

export function LiveLogStream({ logs, filter, height = '100%', compact = false }: Props) {
  const filtered = filter ? logs.filter((l) => l.incident_id === filter) : logs;

  if (filtered.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[#9CA3AF] italic uppercase tracking-[0.18em] text-[10px] font-bold py-12"
        style={{ minHeight: '120px' }}
      >
        Synchronizing with system kernel…
      </div>
    );
  }

  return (
    <div
      className="font-mono space-y-2 overflow-y-auto custom-scrollbar"
      style={{ height }}
    >
      {filtered.map((log) => (
        <div
          key={log.id}
          className={cn(
            'flex gap-4 py-1 px-3 rounded-sm hover:bg-app-bg transition-colors border-l-2 border-transparent hover:border-app-border',
            compact ? 'text-[10px]' : 'text-[11px]',
          )}
        >
          <span className="text-[#D1D5DB] w-16 shrink-0 tabular-nums">[{log.time}]</span>
          <span
            className={cn(
              'font-bold uppercase tracking-tight w-12 shrink-0',
              TYPE_COLORS[log.type] || 'text-[#9CA3AF]',
            )}
          >
            {log.type}
          </span>
          {log.agent_role && (
            <span
              className={cn(
                'font-bold uppercase tracking-tight w-20 shrink-0 truncate',
                ROLE_COLORS[log.agent_role] || 'text-app-secondary',
              )}
            >
              {log.agent_role}
            </span>
          )}
          <span
            className={cn(
              'leading-relaxed flex-1 break-words',
              log.type === 'agent' ? 'text-app-primary font-medium' : 'text-app-secondary',
            )}
          >
            {log.msg}
          </span>
        </div>
      ))}
    </div>
  );
}
