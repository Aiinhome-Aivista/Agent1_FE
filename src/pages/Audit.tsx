import { useEffect, useMemo, useState } from 'react';
import { Search, Download, RefreshCcw } from 'lucide-react';
import { LiveLogStream } from '../components/LiveLogStream';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { Loading } from '../components/Loading';
import type { LogEntry } from '../types';

const TYPES: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'agent', label: 'Agent' },
  { id: 'tool', label: 'Tool' },
  { id: 'info', label: 'Info' },
  { id: 'warn', label: 'Warn' },
  { id: 'error', label: 'Error' },
];

export function AuditPage() {
  const { state } = useStore();
  const [persisted, setPersisted] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setPersisted(await api.audit(300));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const merged = useMemo(() => {
    // Live (state.logs) is authoritative; persisted fills in older history.
    const seen = new Set(state.logs.map((l) => l.id));
    const tail = persisted.filter((l) => !seen.has(l.id));
    return [...state.logs, ...tail];
  }, [state.logs, persisted]);

  const filtered = useMemo(() => {
    let list = merged;
    if (filter !== 'all') list = list.filter((l) => l.type === filter);
    if (query.trim())
      list = list.filter((l) =>
        l.msg.toLowerCase().includes(query.trim().toLowerCase()),
      );
    return list;
  }, [merged, filter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    merged.forEach((l) => {
      c[l.type] = (c[l.type] || 0) + 1;
    });
    return c;
  }, [merged]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {loading ? (
        <Loading message="Fetching forensic audit trail..." />
      ) : (
        <main className="flex-1 overflow-hidden flex flex-col">
        <div className="px-10 py-6 border-b border-[#E5E7EB] bg-white flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={cn(
                  'px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded transition-all flex items-center gap-1.5',
                  filter === t.id
                    ? 'bg-[#111827] text-white'
                    : 'bg-gray-50 text-[#6B7280] hover:bg-gray-100',
                )}
              >
                {t.label}
                {t.id !== 'all' && counts[t.id] != null && (
                  <span className="text-[9px] opacity-60">{counts[t.id]}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 bg-gray-50 rounded border border-[#E5E7EB]">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter messages…"
              className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-[#9CA3AF]"
            />
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF]">
            {filtered.length} events
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-7 custom-scrollbar bg-white">
          <div className="bg-white rounded-lg max-w-6xl mx-auto">
            <LiveLogStream logs={filtered} height="100%" />
          </div>
        </div>
        </main>
      )}
    </>
  );
}
