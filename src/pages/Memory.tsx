import { useEffect, useMemo, useState } from 'react';
import { Search, Brain, BookOpen, Layers, ArrowRight, AlertTriangle, ShieldCheck, ListChecks, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import { cn, timeAgo } from '../lib/utils';
import { Loading } from '../components/Loading';
import { InfoHint } from '../components/InfoHint';
import type { MemoryEntry } from '../types';

const KIND_META = {
  episodic: {
    icon: Brain,
    label: 'Episodic',
    description: 'Resolved-incident records · curated by the Learning agent',
  },
  procedural: {
    icon: Layers,
    label: 'Procedural',
    description: 'Versioned playbooks · pulled by the Diagnosis agent on RAG',
  },
  semantic: {
    icon: BookOpen,
    label: 'Semantic',
    description: 'Runbooks, SOPs, postmortems · grounding for novel patterns',
  },
} as const;

export function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const [episodic, procedural, semantic] = await Promise.all([
        api.memory('episodic'),
        api.memory('procedural'),
        api.memory('semantic'),
      ]);
      const combined = [...episodic, ...procedural, ...semantic].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setEntries(combined);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const onSearch = async () => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        api.searchMemory(query.trim(), 'episodic', 8),
        api.searchMemory(query.trim(), 'procedural', 8),
        api.searchMemory(query.trim(), 'semantic', 8),
      ]);
      const combined = [...r1, ...r2, ...r3].sort(
        (a, b) => (b.similarity || 0) - (a.similarity || 0)
      );
      setSearchResults(combined);
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  };

  const visible = searchResults.length > 0 ? searchResults : entries;

  return (
    <>
      {loading ? (
        <Loading message="Syncing Agentic History..." />
      ) : (
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Tier selector */}
          {/* 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => {
              const M = KIND_META[k];
              const active = kind === k;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setKind(k);
                    setSearchResults([]);
                    setQuery('');
                  }}
                  className={cn(
                    'p-6 rounded-lg border text-left transition-all relative overflow-hidden',
                    active
                      ? 'bg-app-surface border-app-brand text-app-primary'
                      : 'bg-app-surface border-app-border hover:border-app-border',
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-md flex items-center justify-center',
                        active ? 'bg-app-surface/10' : 'bg-app-surface',
                      )}
                    >
                      <M.icon className={cn('w-5 h-5', active ? 'text-app-primary' : 'text-app-primary')} />
                    </div>
                    <ArrowRight
                      className={cn(
                        'w-3 h-3 mt-2 transition-transform',
                        active ? 'translate-x-1' : 'opacity-30',
                      )}
                    />
                  </div>
                  <h3 className={cn('text-lg font-medium tracking-tight', active && 'text-app-primary')}>
                    {M.label}
                  </h3>
                  <p
                    className={cn(
                      'text-[11px] mt-1 leading-relaxed',
                      active ? 'text-app-primary/70' : 'text-app-secondary',
                    )}
                  >
                    {M.description}
                  </p>
                </button>
              );
            })}
          </div>
          */}

          {/* Search bar */}
          <div className="bg-app-surface border border-app-border rounded-lg p-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#9CA3AF] ml-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder="Search all history entries…"
              className="flex-1 px-2 py-2 text-sm bg-transparent outline-none placeholder:text-[#9CA3AF]"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSearchResults([]);
                }}
                className="text-xs text-app-secondary hover:text-app-primary px-2"
              >
                Clear
              </button>
            )}
            <button
              onClick={onSearch}
              disabled={searching}
              className="px-4 py-2 bg-app-surface text-app-primary text-[10px] font-bold uppercase tracking-[0.18em] rounded hover:bg-app-hover transition-all disabled:opacity-50"
            >
              {searching ? 'Searching…' : 'RAG Search'}
            </button>
          </div>

          {/* Result list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF] flex items-center gap-1.5">
                {searchResults.length > 0
                  ? `RAG · ${searchResults.length} top matches`
                  : `${visible.length} entries`}
                <InfoHint
                  align="left"
                  title="Memory Card Elements & Definitions"
                  text={[
                    "Title & Status: The specific pipeline ETL job that failed and its final execution state (FAILED / REMEDIATED).",
                    "Memory Tier: 'EPISODIC' represents historical incident episodes, 'PROCEDURAL' contains operational playbooks, 'SEMANTIC' holds domain runbooks.",
                    "Root Cause Analysis (RCA): Expandable drawer detailing the AI diagnostic reasoning, error patterns, and remediation plan.",
                    "Pipeline Tag: Identifies the target pipeline or table.",
                    "Severity Badge: Risk classification (LOW, MEDIUM, HIGH) determining automated intervention vs escalation.",
                    "Mode Badge: 'AUTO' means autonomous AI remediation; 'MANUAL' means engineer approval required."
                  ]}
                />
              </h3>
              {searchResults.length > 0 && (
                <button
                  onClick={() => setSearchResults([])}
                  className="text-[10px] uppercase tracking-[0.18em] font-bold text-app-secondary hover:text-app-primary"
                >
                  Clear results
                </button>
              )}
            </div>

            {/* Mobile view: single column, standard order */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {visible.length === 0 ? (
                <p className="text-center py-12 text-[#9CA3AF] italic text-sm">
                  No history entries.
                </p>
              ) : (
                visible.map((m) => <MemoryCard key={m.id} m={m} />)
              )}
            </div>

            {/* Desktop view: two independent columns (Masonry layout) */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-4 items-start">
              {visible.length === 0 ? (
                <p className="col-span-2 text-center py-12 text-[#9CA3AF] italic text-sm">
                  No history entries.
                </p>
              ) : (
                <>
                  <div className="space-y-4">
                    {visible.filter((_, i) => i % 2 === 0).map((m) => (
                      <MemoryCard key={m.id} m={m} />
                    ))}
                  </div>
                  <div className="space-y-4">
                    {visible.filter((_, i) => i % 2 === 1).map((m) => (
                      <MemoryCard key={m.id} m={m} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        </main>
      )}
    </>
  );
}

function MemoryCard({ m }: { m: MemoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  
  const rootCause = m.payload.root_cause;
  
  const parsedRootCause = useMemo(() => {
    if (!rootCause || typeof rootCause !== 'string') return rootCause;
    
    const healJson = (str: string) => {
      let clean = str.trim();
      clean = clean.replace(/```(?:json|JSON)?/g, '').replace(/```/g, '').trim();
      const firstBrace = clean.indexOf('{');
      if (firstBrace !== -1) clean = clean.substring(firstBrace);
      
      const attemptParse = (input: string) => {
        let healed = input.trim();
        
        // Handle trailing open quote
        const quotes = (healed.match(/"/g) || []).length;
        if (quotes % 2 !== 0) healed += '"';
        
        // Handle trailing colon (e.g. "key": )
        if (healed.endsWith(':')) healed += 'null';

        const stack: string[] = [];
        for (let i = 0; i < healed.length; i++) {
          const char = healed[i];
          if (char === '{') stack.push('}');
          else if (char === '[') stack.push(']');
          else if (char === '}') { if (stack[stack.length - 1] === '}') stack.pop(); }
          else if (char === ']') { if (stack[stack.length - 1] === ']') stack.pop(); }
        }
        
        const suffix = stack.reverse().join('');
        try {
          return JSON.parse(healed + suffix);
        } catch {
          // If suffixing fails, try removing trailing comma/partial text and retry
          try {
            let stripped = healed.replace(/,[^,]*$/, '').trim();
            if (stripped !== healed) return JSON.parse(stripped + suffix);
          } catch { /* ignore */ }
          return null;
        }
      };

      const result = attemptParse(clean);
      if (result) return result;

      // Aggressive fallback: iteratively strip from the end until it parses or we run out of string
      let truncated = clean;
      while (truncated.length > 10) {
        const lastOpen = Math.max(truncated.lastIndexOf('{'), truncated.lastIndexOf('['));
        if (lastOpen <= 0) break;
        truncated = truncated.substring(0, lastOpen).trim();
        if (truncated.endsWith(',')) truncated = truncated.slice(0, -1);
        const retry = attemptParse(truncated);
        if (retry) return retry;
      }

      return clean;
    };

    const parsed = healJson(rootCause);
    if (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('['))) {
      return healJson(parsed); // Handle double-encoded strings
    }
    return parsed;
  }, [rootCause]);

  const hasStructuredData = useMemo(() => {
    if (!parsedRootCause || typeof parsedRootCause !== 'object') return false;
    return !!(
      parsedRootCause.error || 
      parsedRootCause.error_summary || 
      parsedRootCause.recommended_actions || 
      parsedRootCause.diagnosis ||
      parsedRootCause.next_steps ||
      parsedRootCause.severity
    );
  }, [parsedRootCause]);

  return (
    <div className="bg-app-surface border border-app-border rounded-lg p-5 hover:border-app-border transition-colors flex flex-col h-fit">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{m.title}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mt-1">
            {m.kind} · {timeAgo(m.created_at)}
            {m.times_referenced > 0 && ` · referenced ${m.times_referenced}x`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {m.similarity != null && (
            <span className="font-mono text-[10px] text-app-brand bg-app-bg px-2 py-0.5 rounded">
              sim {m.similarity.toFixed(2)}
            </span>
          )}
          {m.success != null && (
            <span
              className={cn(
                'text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded',
                m.success ? 'bg-app-surface border border-emerald-500/30 text-emerald-400' : 'bg-app-surface border border-rose-500/30 text-rose-400',
              )}
            >
              {m.success ? 'success' : 'failed'}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-app-secondary leading-relaxed mb-4">{m.summary}</p>

      {/* Root Cause UI */}
      {parsedRootCause && (
        <div className="mt-auto">
          <div 
            className="p-3 bg-app-bg rounded-lg border border-app-border cursor-pointer hover:border-app-brand transition-colors shadow-sm"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-app-secondary font-bold">
                  Root Cause Analysis
                </span>
              </div>
              {expanded ? <ChevronUp className="w-3 h-3 text-app-secondary" /> : <ChevronDown className="w-3 h-3 text-app-secondary" />}
            </div>
            
            {expanded && (
              <div className="mt-3 space-y-4">
                {/* Error Summary */}
                {(parsedRootCause.error || parsedRootCause.error_summary) && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-app-secondary" />
                      <span className="text-[9px] font-bold text-app-secondary uppercase tracking-wider">Error Summary</span>
                    </div>
                    <p className="text-[11px] text-red-600 font-medium">
                      {parsedRootCause.error?.top_level_error || 
                       parsedRootCause.error_summary?.top_level_error || 
                       parsedRootCause.error?.message || 
                       "Task failure detected"}
                    </p>
                  </div>
                )}

                {/* Severity & Status */}
                {(parsedRootCause.severity || parsedRootCause.status) && (
                  <div className="flex gap-2">
                    {parsedRootCause.severity && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-app-surface text-app-primary">
                        {parsedRootCause.severity}
                      </span>
                    )}
                    {parsedRootCause.status && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-app-surface text-app-brand">
                        {parsedRootCause.status}
                      </span>
                    )}
                  </div>
                )}

                {/* Recommended Actions */}
                {parsedRootCause.recommended_actions && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <ListChecks className="w-3 h-3 text-app-secondary" />
                      <span className="text-[9px] font-bold text-app-secondary uppercase tracking-wider">Recommended Actions</span>
                    </div>
                    <div className="space-y-2">
                      {(Array.isArray(parsedRootCause.recommended_actions) 
                        ? parsedRootCause.recommended_actions 
                        : [parsedRootCause.recommended_actions]
                      ).slice(0, 4).map((ra: any, i: number) => (
                        <div key={i} className="bg-app-surface p-2 rounded border border-app-border shadow-sm">
                          <p className="text-[11px] font-semibold text-app-primary">
                            {typeof ra === 'string' ? ra : ra.action}
                          </p>
                          {ra.description && <p className="text-[10px] text-app-secondary mt-0.5">{ra.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagnosis */}
                {parsedRootCause.diagnosis && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span className="text-[9px] font-bold text-app-secondary uppercase tracking-wider">Diagnosis</span>
                    </div>
                    <div className="space-y-2">
                      {(() => {
                        const causes = parsedRootCause.diagnosis.potential_causes || parsedRootCause.diagnosis.likely_causes || [];
                        return (Array.isArray(causes) ? causes : [causes]).slice(0, 3).map((pc: any, i: number) => (
                          <div key={i} className="text-[10px] text-app-secondary pl-2 border-l-2 border-emerald-200">
                            {typeof pc === 'string' ? (
                              pc
                            ) : (
                              <>
                                <span className="font-bold">{pc.cause || 'Cause'}: </span>
                                {pc.description || (typeof pc === 'object' ? JSON.stringify(pc) : String(pc))}
                              </>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {parsedRootCause.next_steps && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-app-brand" />
                      <span className="text-[9px] font-bold text-app-secondary uppercase tracking-wider">Next Steps</span>
                    </div>
                    <div className="space-y-3">
                      {typeof parsedRootCause.next_steps === 'object' ? (
                        <div className="space-y-3">
                          {/* Immediate Actions */}
                          {(parsedRootCause.next_steps.immediate_actions || parsedRootCause.next_steps.immediate) && (
                            <div className="space-y-1.5">
                              <p className="text-[8px] font-bold text-app-secondary uppercase tracking-widest ml-1">Immediate</p>
                              {(() => {
                                const actions = parsedRootCause.next_steps.immediate_actions || parsedRootCause.next_steps.immediate;
                                return (Array.isArray(actions) ? actions : [actions]).slice(0, 3).map((act: any, i: number) => (
                                  <div key={i} className="text-[10px] text-app-secondary bg-app-bg p-2 rounded border border-app-border">
                                    <span className="font-semibold text-app-brand">
                                      {typeof act === 'string' ? act : act.action || 'Action'}:
                                    </span>{' '}
                                    {typeof act === 'object' && act.description}
                                  </div>
                                ));
                              })()}
                            </div>
                          )}
                          
                          {/* Fallback if it's an object but not in expected format */}
                          {(!parsedRootCause.next_steps.immediate_actions && !parsedRootCause.next_steps.immediate) && (
                            <div className="text-[10px] text-app-secondary bg-app-bg p-2 rounded border border-app-border">
                              {JSON.stringify(parsedRootCause.next_steps)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-app-secondary bg-app-bg p-2 rounded border border-app-border whitespace-pre-wrap">
                          {parsedRootCause.next_steps}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback for unhandled objects or missing structured data */}
                {(!hasStructuredData && typeof parsedRootCause !== 'string') && (
                  <pre className="text-[9px] font-mono p-2 bg-black/40 text-app-secondary text-opacity-80 rounded overflow-x-auto">
                    {JSON.stringify(parsedRootCause, null, 2)}
                  </pre>
                )}
                
                {typeof parsedRootCause === 'string' && (
                  <p className="text-[11px] text-app-secondary whitespace-pre-wrap font-mono bg-app-bg p-2 rounded">
                    {parsedRootCause}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {m.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-4">
          {m.tags.slice(0, 6).map((t) => (
            <span key={t} className="tag-chip">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
