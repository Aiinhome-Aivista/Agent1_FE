import { useEffect, useState } from 'react';
import { Lightbulb, RefreshCcw, Check, X } from 'lucide-react';
import { api } from '../services/api';
import { cn, timeAgo } from '../lib/utils';
import { Loading } from '../components/Loading';
import type { Recommendation } from '../types';

export function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      setRecs(await api.recommendations());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const regen = async () => {
    setBusy(true);
    try {
      const r = await api.regenerateRecommendations();
      setRecs(r.items);
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, status: 'accepted' | 'dismissed') => {
    await api.updateRecommendation(id, status);
    reload();
  };

  const open = recs.filter((r) => r.status === 'open');
  const accepted = recs.filter((r) => r.status === 'accepted');
  const dismissed = recs.filter((r) => r.status === 'dismissed');

  return (
    <>
      {loading ? (
        <Loading message="Fetching optimization strategies..." />
      ) : (
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Open" value={open.length} accent="text-amber-700 bg-amber-50" />
            <Stat
              label="Accepted"
              value={accepted.length}
              accent="text-emerald-700 bg-emerald-50"
            />
            <Stat label="Dismissed" value={dismissed.length} accent="text-[#6B7280] bg-gray-50" />
          </div>

          <Section title="Open · pending review">
            {open.length === 0 ? (
              <Empty msg="No open recommendations." />
            ) : (
              <List recs={open} onUpdate={update} />
            )}
          </Section>

          {accepted.length > 0 && (
            <Section title="Accepted">
              <List recs={accepted} onUpdate={update} />
            </Section>
          )}
          {dismissed.length > 0 && (
            <Section title="Dismissed">
              <List recs={dismissed} onUpdate={update} />
            </Section>
          )}
        </div>
        </main>
      )}
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-[#E5E7EB] p-5 rounded-lg flex items-center justify-between">
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF]">{label}</p>
      <span className={cn('text-2xl font-light italic tabular-nums px-3 py-0.5 rounded', accent)}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF] mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="bg-white border border-dashed border-[#E5E7EB] rounded-lg p-10 text-center">
      <p className="text-[#9CA3AF] italic text-sm">{msg}</p>
    </div>
  );
}

function List({
  recs,
  onUpdate,
}: {
  recs: Recommendation[];
  onUpdate: (id: string, s: 'accepted' | 'dismissed') => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {recs.map((r) => (
        <div
          key={r.id}
          className="bg-white border border-[#E5E7EB] rounded-lg p-5 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">{r.title}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mt-1">
                  {r.pipeline_name} · {timeAgo(r.created_at)}
                </p>
              </div>
            </div>
            <span
              className={cn(
                'text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded',
                r.risk === 'High'
                  ? 'bg-red-50 text-red-700'
                  : r.risk === 'Medium'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-blue-50 text-blue-700',
              )}
            >
              {r.risk}
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] leading-relaxed">{r.detail}</p>
          <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#F3F4F6]">
            <span className="text-[11px] font-mono text-emerald-700 font-semibold">
              {r.savings}
            </span>
            {r.status === 'open' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate(r.id, 'dismissed')}
                  className="p-1.5 hover:bg-gray-50 rounded text-[#6B7280] transition-colors"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onUpdate(r.id, 'accepted')}
                  className="px-3 py-1.5 bg-[#111827] text-white text-[10px] font-bold uppercase tracking-[0.18em] rounded hover:bg-black transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3" />
                  Accept
                </button>
              </div>
            ) : (
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#6B7280]">
                {r.status}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
