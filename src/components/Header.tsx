import React, { ReactNode } from 'react';
import { Moon, Sun, Activity, Brain, Settings, Zap, Plus, LogOut, Monitor, Check } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { cn } from '../lib/utils';
import { auth } from '../services/api';
import { Tooltip } from './Tooltip';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onConnect?: () => void;
}

function UserMenu() {
  const [showMenu, setShowMenu] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.removeItem('theme');
    } else if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const isDarkCurrent = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          "p-2 rounded-xl transition-colors",
          showMenu ? "bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20" : "bg-app-surface border border-app-border hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 dark:hover:bg-rose-500/10 dark:hover:border-rose-500/20 text-app-secondary"
        )}
      >
        {isDarkCurrent ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-app-surface border border-app-border rounded-xl shadow-lg py-1.5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => { setTheme('light'); setShowMenu(false); }}
              className="w-full flex items-center justify-between px-4 py-2 text-[13px] font-medium text-app-primary hover:bg-app-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-app-secondary" />
                <span>Light</span>
              </div>
              {theme === 'light' && <Check className="w-3.5 h-3.5 text-app-brand" />}
            </button>
            <button
              onClick={() => { setTheme('dark'); setShowMenu(false); }}
              className="w-full flex items-center justify-between px-4 py-2 text-[13px] font-medium text-app-primary hover:bg-app-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-app-secondary" />
                <span>Dark</span>
              </div>
              {theme === 'dark' && <Check className="w-3.5 h-3.5 text-app-brand" />}
            </button>
            <button
              onClick={() => { setTheme('system'); setShowMenu(false); }}
              className="w-full flex items-center justify-between px-4 py-2 text-[13px] font-medium text-app-primary hover:bg-app-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Monitor className="w-4 h-4 text-app-secondary" />
                <span>System</span>
              </div>
              {theme === 'system' && <Check className="w-3.5 h-3.5 text-app-brand" />}
            </button>
            
            <div className="h-px bg-app-border my-1.5" />
            
            <button
              onClick={() => {
                auth.clearToken();
                window.location.href = "/";
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function Header({ title, subtitle, actions, onConnect }: Props) {
  const { state } = useStore();
  const activeAgents = state.agents.filter((a) => a.status === 'thinking').length;
  const activePipelines = state.pipelines.length;
  const unhealthy = state.pipelines.filter((p) => {
    const s = (p.last_run_status || p.status || '').toLowerCase();
    return s !== 'healthy' && s !== 'succeeded';
  }).length;

  return (
    <header className="h-20 border-b border-app-border bg-app-surface flex items-center justify-between relative z-30 shrink-0 px-6">
      <div className="flex items-center gap-6 min-w-0 h-full">
        <div className="flex items-center gap-3 pr-6 border-r border-app-border h-10">
          <div className="w-9 h-9 rounded-md bg-app-brand flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div className="flex flex-col leading-none whitespace-nowrap">
            <span className="font-semibold tracking-tight text-[15px]">
              AGENTIC<span className="text-gray-400">OPS</span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-app-brand mt-1 font-bold">
              Autonomous DataOps
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-xl font-medium tracking-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="h-6 w-px bg-[#E5E7EB] hidden lg:block mx-2" />
        <div className="hidden lg:flex items-center gap-6">
          <Stat 
            icon={<Activity className="w-3.5 h-3.5 text-[#9CA3AF]" />} 
            label="Pipelines" 
            value={`${activePipelines}`} 
            tooltip={`Total data pipelines registered across all connected platforms (${activePipelines} total pipelines).`}
          />
          <Stat
            icon={<Brain className={cn('w-3.5 h-3.5', activeAgents > 0 ? 'text-app-brand' : 'text-app-secondary')} />}
            label="Agents"
            value={activeAgents > 0 ? `${activeAgents} thinking` : 'Idle'}
            tooltip={
              activeAgents > 0
                ? `${activeAgents} AI diagnostic agent(s) actively analyzing logs and investigating errors in real time.`
                : 'AI Diagnostic Agents are standby and ready to analyze logs upon pipeline failure.'
            }
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
            tooltip={
              unhealthy === 0
                ? 'All tracked pipelines are healthy (latest execution succeeded).'
                : `${unhealthy} of ${activePipelines} pipelines have their latest execution in a FAILED state and require investigation.`
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onConnect}
          className="flex items-center gap-2 px-4 py-2 bg-app-surface border border-app-border hover:bg-app-bg text-[10px] font-bold uppercase tracking-[0.18em] rounded transition-all shadow-sm"
        >
          <Plus className="w-3 h-3 text-app-brand" />
          Connect Source
        </button>

        <Tooltip
          title={state.connected ? "Real-time Telemetry Stream" : "Telemetry Stream"}
          content={
            state.connected
              ? "Connected to the AgenticOps control plane daemon. Live pipeline events, cluster health, and AI diagnoses are syncing in real time."
              : "Disconnected. Attempting to reconnect to the real-time event cluster."
          }
          side="bottom"
          align="end"
        >
          <div
            className={cn(
              'px-3 py-1.5 border rounded flex items-center gap-2 cursor-default transition-all shadow-sm',
              state.connected
                ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
                : 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50',
            )}
          >
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                state.connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 animate-pulse',
              )}
            />
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-tight',
                state.connected ? 'text-emerald-400' : 'text-amber-400',
              )}
            >
              {state.connected ? 'Cluster Stable' : 'Reconnecting'}
            </span>
          </div>
        </Tooltip>
        <UserMenu />
      </div>
    </header>
  );
}

function Stat({
  icon,
  label,
  value,
  tooltip,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <Tooltip title={label} content={tooltip} side="bottom">
      <div className="flex items-center gap-2 cursor-default hover:opacity-90 transition-opacity py-1 px-1.5 rounded">
        {icon}
        <div className="flex flex-col leading-none">
          <span className="text-[9px] text-[#9CA3AF] uppercase font-bold tracking-[0.18em]">
            {label}
          </span>
          <span className="text-xs font-semibold mt-1">{value}</span>
        </div>
      </div>
    </Tooltip>
  );
}
