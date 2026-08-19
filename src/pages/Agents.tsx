import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Eye,
  GitBranch,
  Lightbulb,
  Network,
  ShieldCheck,
  Wrench,
  Zap,
} from 'lucide-react';
import { LiveLogStream } from '../components/LiveLogStream';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { Loading } from '../components/Loading';
import type { AgentStatus, ToolSpec } from '../types';

const ROLE_ICON = {
  orchestrator: Network,
  monitoring: Eye,
  diagnosis: Brain,
  remediation: Wrench,
  optimization: Lightbulb,
  learning: GitBranch,
} as const;

const ROLE_COLOR: Record<string, { bg: string; ring: string; text: string; soft: string }> = {
  orchestrator: { bg: 'bg-app-surface', ring: 'border-app-border', text: 'text-slate-700', soft: 'bg-app-surface0' },
  monitoring: { bg: 'bg-blue-50', ring: 'border-blue-200', text: 'text-blue-700', soft: 'bg-app-btn' },
  diagnosis: { bg: 'bg-purple-50', ring: 'border-purple-200', text: 'text-purple-700', soft: 'bg-purple-500' },
  remediation: { bg: 'bg-amber-50', ring: 'border-amber-200', text: 'text-amber-700', soft: 'bg-amber-500' },
  optimization: { bg: 'bg-emerald-50', ring: 'border-emerald-200', text: 'text-emerald-700', soft: 'bg-emerald-500' },
  learning: { bg: 'bg-indigo-50', ring: 'border-indigo-200', text: 'text-indigo-700', soft: 'bg-indigo-500' },
};

export function AgentsPage() {
  const { state } = useStore();
  const [tools, setTools] = useState<ToolSpec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.tools().then(setTools).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const orchestrator = state.agents.find((a) => a.role === 'orchestrator');
  const subAgents = state.agents.filter((a) => a.role !== 'orchestrator');

  return (
    <>
      {loading ? (
        <Loading message="Syncing Agent Mesh..." />
      ) : (
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Mesh diagram */}
          <section className="bg-app-surface border border-app-border rounded-lg p-10 grid-backdrop">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-semibold">Hierarchical Dispatch</h3>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-[0.18em] font-bold mt-1">
                  Orchestrator → specialized agents
                </p>
              </div>
              <span className="text-[10px] text-app-secondary font-mono">
                {state.agents.length} agents · {tools.length} tools
              </span>
            </div>

            <div className="flex flex-col items-center gap-12">
              {orchestrator && <AgentNode agent={orchestrator} hero />}

              <div className="relative w-full max-w-4xl">
                <div
                  className="absolute left-1/2 -top-12 -translate-x-1/2 w-px h-12 dag-line"
                  aria-hidden
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 w-full max-w-5xl">
                {subAgents.map((a) => (
                  <AgentNode key={a.role} agent={a} />
                ))}
              </div>
            </div>
          </section>

          {/* Per-agent detail */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-app-surface border border-app-border rounded-lg p-7">
              <h4 className="text-sm font-semibold mb-1">Live Reasoning Stream</h4>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mb-5">
                Filter: agents only
              </p>
              <div className="bg-[#0F172A] rounded p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                <LiveLogStreamDark
                  logs={state.logs.filter((l) => l.type === 'agent' || l.type === 'tool')}
                />
              </div>
            </div>

            <div className="bg-app-surface border border-app-border rounded-lg p-7">
              <h4 className="text-sm font-semibold mb-1">Tool Registry</h4>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mb-5">
                Schema-driven, idempotent, timeout-bounded
              </p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {tools.map((t) => (
                  <div
                    key={t.name}
                    className="border border-app-border rounded p-4 hover:border-app-border transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[12px] font-semibold">{t.name}</span>
                      <span
                        className={cn(
                          'text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded',
                          t.risk === 'high'
                            ? 'bg-red-50 text-red-700'
                            : t.risk === 'medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-blue-50 text-blue-700',
                        )}
                      >
                        {t.risk}
                      </span>
                    </div>
                    <p className="text-[11px] text-app-secondary">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {Object.entries(t.args_schema).map(([k, v]) => (
                        <span key={k} className="tag-chip">
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-app-surface border border-app-border rounded-lg p-8">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-semibold">Five-Rail Guardrail Framework</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { label: 'Input', desc: 'PII redaction & secret scrub' },
                { label: 'Dialog', desc: 'Prompt-injection detection' },
                { label: 'Retrieval', desc: 'RAG quality threshold' },
                { label: 'Execution', desc: 'Approval gate · destructive blocks' },
                { label: 'Output', desc: 'Schema validation' },
              ].map((rail, idx) => (
                <div
                  key={rail.label}
                  className="border border-app-border rounded p-4 relative"
                >
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-app-input text-app-primary text-[10px] font-mono font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-app-primary mb-1">
                    {rail.label}
                  </p>
                  <p className="text-[11px] text-app-secondary leading-snug">{rail.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        </main>
      )}
    </>
  );
}

function AgentNode({ agent, hero = false }: { agent: AgentStatus; hero?: boolean }) {
  const C = ROLE_COLOR[agent.role] || ROLE_COLOR.orchestrator;
  const Icon = ROLE_ICON[agent.role] || Brain;
  const live = agent.status === 'thinking';
  return (
    <div
      className={cn(
        'relative bg-app-surface border rounded-lg p-5 transition-all',
        C.ring,
        hero ? 'w-72' : '',
        live ? 'shadow-md' : 'shadow-sm',
      )}
    >
      <AnimatePresence>
        {live && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0 rounded-lg ring-2 pointer-events-none',
              C.ring.replace('border', 'ring').replace('200', '300'),
            )}
          />
        )}
      </AnimatePresence>
      <div className="flex items-start justify-between mb-3 relative">
        <div className={cn('w-9 h-9 rounded-md flex items-center justify-center', C.bg)}>
          <Icon className={cn('w-4 h-4', C.text)} />
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              live ? `${C.soft} pulse-blue` : 'bg-[#D1D5DB]',
            )}
          />
          <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-app-secondary">
            {agent.status}
          </span>
        </div>
      </div>
      <h4 className="text-sm font-semibold capitalize">{agent.role}</h4>
      <p className="text-[11px] text-app-secondary mt-1 leading-snug min-h-[28px]">
        {agent.description}
      </p>
      {agent.last_action && (
        <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
            Last Action
          </p>
          <p className="text-[11px] text-app-secondary truncate mt-0.5">{agent.last_action}</p>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
          Completed
        </span>
        <span className="text-[11px] font-mono font-semibold tabular-nums">
          {agent.tasks_completed}
        </span>
      </div>
    </div>
  );
}

function LiveLogStreamDark({ logs }: { logs: any[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-[#64748B] italic text-[11px] uppercase tracking-[0.18em] font-bold py-8 text-center">
        Idle · agent stream silent
      </p>
    );
  }
  return (
    <div className="font-mono space-y-1.5 text-[11px]">
      {logs.slice(0, 60).map((log) => (
        <div key={log.id} className="flex gap-3">
          <span className="text-app-secondary w-16 shrink-0">[{log.time}]</span>
          <span
            className={cn(
              'font-bold uppercase w-14 shrink-0',
              log.type === 'agent' ? 'text-blue-300' : 'text-purple-300',
            )}
          >
            {log.type}
          </span>
          <span className="text-emerald-200/90 leading-relaxed flex-1 break-words">
            {log.msg}
          </span>
        </div>
      ))}
    </div>
  );
}
