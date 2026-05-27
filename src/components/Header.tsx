import { Activity, Brain, Settings, Zap, Plus } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { cn } from '../lib/utils';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onConnect?: () => void;
}

export function Header({ title, subtitle, actions, onConnect }: Props) {
  const { state } = useStore();
  const activeAgents = state.agents.filter((a) => a.status === 'thinking').length;
  const activePipelines = state.pipelines.length;
  const unhealthy = state.pipelines.filter((p) => p.status !== 'healthy').length;

  return (
    <header className="h-20 border-b border-[#E5E7EB] bg-white flex items-center justify-between z-10 shrink-0 px-6">
      <div className="flex items-center gap-6 min-w-0 h-full">
        {/* Logo Section */}
        <div className="flex items-center gap-3 pr-6 border-r border-[#E5E7EB] h-10">
          <div className="w-9 h-9 rounded-md bg-[#111827] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div className="flex flex-col leading-none whitespace-nowrap">
            <span className="font-semibold tracking-tight text-[15px]">
              AGENTIC<span className="text-gray-400">OPS</span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] mt-1 font-bold">
              Autonomous DataOps
            </span>
          </div>
        </div>

        {/* Title Section */}
        <div className="min-w-0">
          <h1 className="text-xl font-medium tracking-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Stats Section */}
        <div className="h-6 w-px bg-[#E5E7EB] hidden lg:block mx-2" />
        <div className="hidden lg:flex items-center gap-6">
          <Stat 
            icon={<Activity className="w-3.5 h-3.5 text-[#9CA3AF]" />} 
            label="Pipelines" 
            value={`${activePipelines}`} 
          />
          <Stat
            icon={<Brain className={cn('w-3.5 h-3.5', activeAgents > 0 ? 'text-blue-500' : 'text-[#9CA3AF]')} />}
            label="Agents"
            value={activeAgents > 0 ? `${activeAgents} thinking` : 'Idle'}
          />
          <Stat
            icon={
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  unhealthy === 0 ? 'bg-emerald-500' : 'bg-amber-500',
                )}
              />
            }
            label="Health"
            value={unhealthy === 0 ? 'Stable' : `${unhealthy} degraded`}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onConnect}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[10px] font-bold uppercase tracking-[0.18em] rounded transition-all shadow-sm"
        >
          <Plus className="w-3 h-3 text-[#6B7280]" />
          Connect Source
        </button>

        <div
          className={cn(
            'px-3 py-1.5 border rounded flex items-center gap-2',
            state.connected
              ? 'bg-emerald-50 border-emerald-100'
              : 'bg-amber-50 border-amber-100',
          )}
        >
          <div
            className={cn(
              'w-1 h-1 rounded-full',
              state.connected ? 'bg-emerald-500' : 'bg-amber-500',
            )}
          />
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-tight',
              state.connected ? 'text-emerald-700' : 'text-amber-700',
            )}
          >
            {state.connected ? 'Cluster Stable' : 'Reconnecting'}
          </span>
        </div>
        <button className="p-2 rounded hover:bg-gray-100 text-[#6B7280] transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="flex flex-col leading-none">
        <span className="text-[9px] text-[#9CA3AF] uppercase font-bold tracking-[0.18em]">
          {label}
        </span>
        <span className="text-xs font-semibold mt-1">{value}</span>
      </div>
    </div>
  );
}
