/**
 * Incident Timeline page.
 *
 * Layout (matches the design mock):
 *
 *  ┌────────────────────┬────────────────────────────────────────────┐
 *  │  OPEN  ALL  CLOSED │                                            │
 *  │  ───────────────── │  STEP 1   Incident Detection      System   │
 *  │  search…           │  STEP 2   Initial Notification    Mailer   │
 *  │  N incidents       │  STEP 3   Escalation              System   │
 *  │  [card #1]         │                                            │
 *  │  [card #2]   ◄──── │  (renders for the selected incident)       │
 *  │  [card #3]         │                                            │
 *  └────────────────────┴────────────────────────────────────────────┘
 *
 * The card on the left shows only what the spec asks for:
 *   - pipeline / pipeline_id
 *   - one-line summary
 *   - created_at (formatted as "Xm ago")
 *
 * The three timeline steps on the right are entirely driven by the
 * incident row's new columns:
 *   - STEP 1 — always shown; uses `detected_at`
 *   - STEP 2 — shown if `initial_email_sent_at` is set
 *   - STEP 3 — shown if `escalation_email_sent_at` is set
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search,
  ShieldAlert,
  Mail,
  AlertTriangle,
  Check,
  CheckCircle2,
  UserCheck,
  X,
  Clock,
  RefreshCw,
  Users,
  Activity,
  Ticket,
  GitPullRequest,
  BrainCircuit,
  Loader2,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { useStore } from "../hooks/useStore";
import { cn, formatDateTime, timeAgo } from "../lib/utils";
import { api } from "../services/api";
import type { Incident, IncidentEvent, ClassifyResult } from "../types";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

type FilterTab = "open" | "all" | "closed";

const OPEN_STATUSES = new Set([
  "Detected",
  "Reasoning",
  "Planning",
  "Awaiting Approval",
  "Processing", // NEW — acknowledged but not yet resolved
  "Executing",
  "Evaluating",
]);

function isOpen(i: Incident): boolean {
  return i.is_active !== false;
}

function isClosed(i: Incident): boolean {
  return i.is_active === false;
}

/** Pull the most useful one-line summary from whatever the backend filled in. */
function bestSummary(i: Incident): string {
  return (
    i.agent_thought ||
    i.proposed_action ||
    i.root_cause ||
    i.error_log?.split("\n")[0] ||
    "Awaiting diagnosis…"
  );
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export function IncidentsPage() {
  const { state } = useStore();
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);

  // Filtered list (memoised — recomputes only when filter/search/data change)
  const filtered = useMemo(() => {
    let list = [...(state.incidents || [])];
    if (filter === "open") list = list.filter(isOpen);
    if (filter === "closed") list = list.filter(isClosed);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.pipeline_name?.toLowerCase().includes(q) ||
          String(i.id).includes(q) ||
          bestSummary(i).toLowerCase().includes(q),
      );
    }

    // Newest first
    list.sort(
      (a, b) =>
        new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime(),
    );
    return list;
  }, [state.incidents, filter, searchQuery]);

  // Auto-select first matching incident if nothing is selected (or the
  // current selection no longer matches the filter).
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillThere = filtered.some(
      (i) => String(i.id) === String(selectedId),
    );
    if (!stillThere) setSelectedId(String(filtered[0].id));
  }, [filtered, selectedId]);

  // Keep the URL in sync with the selection
  useEffect(() => {
    if (selectedId && routeId !== selectedId) {
      navigate(`/app/incidents/${selectedId}`, { replace: true });
    }
  }, [selectedId, routeId, navigate]);

  const selected = useMemo(
    () =>
      (state.incidents || []).find(
        (i) => String(i.id) === String(selectedId),
      ) || null,
    [state.incidents, selectedId],
  );

  return (
    <div className="flex-1 flex min-h-0 bg-app-bg">
      {/* ─── LEFT: filter + incident list ───────────────────────────── */}
      <aside className="w-[340px] shrink-0 border-r border-app-border bg-app-surface flex flex-col">
        {/* Filter pills */}
        <div className="p-4 border-b border-app-border">
          <div className="bg-app-input p-1 rounded-lg flex shadow-inner border border-app-border/50">
            {(["open", "all", "closed"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                  filter === tab
                    ? "bg-app-surface text-app-primary border border-app-border shadow-sm shadow-md border border-app-border/30"
                    : "text-app-secondary hover:text-app-primary hover:bg-app-bg",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-secondary" />
            <input
              type="text"
              placeholder="Search incidents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-app-input border border-app-border rounded-lg focus:outline-none focus:border-app-brand focus:ring-1 focus:ring-app-brand/30 transition-colors text-app-primary placeholder:text-app-secondary"
            />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-app-secondary mt-3">
            {filtered.length} INCIDENT{filtered.length === 1 ? "" : "S"}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-app-secondary">
              No incidents match this filter.
            </div>
          ) : (
            <ul className="divide-y divide-app-border">
              {filtered.map((inc) => {
                const active = String(inc.id) === String(selectedId);
                const summary = bestSummary(inc);
                return (
                  <li key={inc.id}>
                    <button
                      onClick={() => setSelectedId(String(inc.id))}
                      className={cn(
                        "w-full text-left p-4 transition-colors relative group",
                        active ? "bg-app-surface" : "hover:bg-app-bg cursor-pointer",
                      )}
                    >
                      <span className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 transition-colors",
                        active ? "bg-app-brand" : "bg-transparent group-hover:bg-app-brand/50"
                      )} />
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-app-secondary">
                          #{inc.id}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            inc.risk_tier === "High"
                              ? "bg-app-surface border border-rose-500/30 text-rose-400"
                              : inc.risk_tier === "Medium"
                                ? "bg-app-surface border border-amber-500/30 text-amber-400"
                                : "bg-app-surface border border-emerald-500/30 text-emerald-400",
                          )}
                        >
                          {inc.risk_tier}
                        </span>
                      </div>
                      <div className="text-[13px] font-bold text-app-primary truncate">
                        {inc.pipeline_name}
                      </div>
                      <div className="text-[11px] text-app-secondary mt-1 leading-relaxed line-clamp-2">
                        {summary}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            inc.status === "Remediated"
                              ? "bg-app-surface border border-emerald-500/30 text-emerald-400"
                              : inc.status === "Escalated"
                                ? "bg-app-surface border border-rose-500/30 text-rose-400"
                                : inc.status === "Failed"
                                  ? "bg-app-surface border border-app-border text-app-secondary"
                                  : inc.status === "Processing"
                                    ? "bg-app-surface border border-amber-500/30 text-amber-400"
                                    : "bg-app-surface text-app-secondary",
                          )}
                        >
                          {inc.status}
                        </span>
                        <span className="text-[10px] text-app-secondary font-medium">
                          {timeAgo(inc.detected_at)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ─── RIGHT: timeline pane ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-sm text-app-secondary">
            Select an incident on the left to inspect its timeline.
          </div>
        ) : (
          <TimelineView incident={selected} />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Right-pane: the three-step timeline
// ─────────────────────────────────────────────────────────────────────

interface TimelineViewProps {
  incident: Incident;
}

function TimelineView({ incident }: TimelineViewProps) {
  const [loadingAction, setLoadingAction] = useState<"approve" | "reject" | null>(null);

  const handleApprove = async () => {
    setLoadingAction("approve");
    try {
      await api.approveIncident(String(incident.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async () => {
    setLoadingAction("reject");
    try {
      await api.rejectIncident(String(incident.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header strip */}
      <div className="mb-6 pb-4 border-b border-app-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-app-primary">
              {incident.pipeline_name}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-app-secondary">
              <span>Incident #{incident.id}</span>
              <span>·</span>
              <span>{formatDateTime(incident.detected_at)}</span>
              <span>·</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                  incident.status === "Remediated"
                    ? "bg-app-surface border border-emerald-500/30 text-emerald-400"
                    : incident.status === "Escalated"
                      ? "bg-rose-500/20 text-rose-400"
                      : incident.status === "Processing"
                        ? "bg-app-surface border border-amber-500/30 text-amber-400"
                        : "bg-app-surface text-app-secondary",
                )}
              >
                {incident.status}
              </span>
              {incident.acknowledged_at && (
                <>
                  <span>·</span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 inline-flex items-center gap-1"
                    title={`Acknowledged at ${formatDateTime(incident.acknowledged_at)}`}
                  >
                    <UserCheck className="w-3 h-3" /> Acknowledged
                  </span>
                </>
              )}
              {incident.jira_ticket_key && (
                <>
                  <span>·</span>
                  <a
                    href={incident.jira_ticket_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold tracking-wider text-app-brand bg-app-surface border border-app-border px-1.5 py-0.5 rounded inline-flex items-center hover:bg-app-surface transition-colors"
                  >
                    <Ticket className="w-3 h-3 mr-1" />
                    Jira: {incident.jira_ticket_key}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {incident.status === "Awaiting Approval" && (
        <div className="mb-6 p-5 bg-app-surface border border-amber-500/30 border border-amber-500/30 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Human Approval Required
            </h3>
            <p className="text-xs text-amber-400 mt-1">
              This incident has a remediation plan ready but requires authorization to proceed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReject}
              disabled={!!loadingAction}
              className="px-4 py-2 text-xs font-bold text-amber-400 bg-app-surface border border-amber-500/30 rounded-lg hover:bg-app-surface border border-amber-500/30 disabled:opacity-50 transition-colors"
            >
              {loadingAction === "reject" ? "Rejecting..." : "Reject"}
            </button>
            <button
              onClick={handleApprove}
              disabled={!!loadingAction}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loadingAction === "approve" ? "Approving..." : "Approve & Execute"}
            </button>
          </div>
        </div>
      )}

      {/* Solution KB classification + auto-fix actions */}
      <SolutionPanel incident={incident} />

      {/* Journey Timeline */}
      <JourneyTimeline incidentId={incident.id} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// NEW: Solution KB classification + auto-fix (raise PR / ingest merged PR)
// ─────────────────────────────────────────────────────────────────────

function SolutionPanel({ incident }: { incident: Incident }) {
  const [cls, setCls] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"pr" | "ingest" | "refine" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showIngest, setShowIngest] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [diff, setDiff] = useState("");
  const [showRefine, setShowRefine] = useState(false);
  const [rcEdit, setRcEdit] = useState("");
  const [stepsEdit, setStepsEdit] = useState("");

  const classify = async () => {
    setLoading(true);
    try {
      const r = await api.classifyError({
        error_text: incident.error_log || incident.root_cause || "",
        component: incident.pipeline_name,
        llm_confidence: incident.confidence_score || 0,
      });
      setCls(r);
    } catch {
      setCls(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    classify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident.id, incident.confidence_score]);

  const handleRaisePR = async () => {
    setBusy("pr");
    setMsg(null);
    try {
      const r = await api.raisePR(incident.id);
      if (r.ok && r.mode === "pr") setMsg(`PR opened: ${r.pr_url}`);
      else if (r.ok && r.mode === "issue") setMsg(`Issue filed: ${r.message}`);
      else setMsg(r.reason || r.message || "Could not raise a PR for this incident.");
    } catch (e: any) {
      setMsg(e?.message || "Failed to raise PR");
    } finally {
      setBusy(null);
    }
  };

  const handleIngest = async () => {
    if (!prUrl.trim() || !diff.trim()) {
      setMsg("Provide both the merged PR URL and its diff.");
      return;
    }
    setBusy("ingest");
    setMsg(null);
    try {
      const r = await api.ingestPR(incident.id, { pr_url: prUrl, diff });
      setMsg(
        `Ingested into KB · pattern #${r.pattern_id} · confidence ${(r.confidence * 100).toFixed(0)}% · ${
          r.is_auto_fixable ? "now auto-fixable ✓" : "not yet auto-fixable"
        }`,
      );
      setShowIngest(false);
      setPrUrl("");
      setDiff("");
      classify();
    } catch (e: any) {
      setMsg(e?.message || "Failed to ingest PR");
    } finally {
      setBusy(null);
    }
  };

  const openRefine = () => {
    const p = cls?.pattern;
    setRcEdit(p?.root_cause || incident.root_cause || "");
    setStepsEdit(
      (p?.fix_steps && p.fix_steps.length
        ? p.fix_steps
        : incident.remediation_plan || []
      ).join("\n"),
    );
    setShowRefine((v) => !v);
  };

  const handleRefine = async () => {
    setBusy("refine");
    setMsg(null);
    try {
      const steps = stepsEdit
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const r = await api.updateIncidentFix(incident.id, {
        root_cause: rcEdit.trim() || undefined,
        fix_steps: steps.length ? steps : undefined,
        approve: true,
      });
      setMsg(
        `Approved & enriched · confidence ${Math.round((r.confidence || 0) * 100)}% · knowledge base + graph updated.`,
      );
      setShowRefine(false);
      classify();
    } catch (e: any) {
      setMsg(e?.message || "Failed to refine fix");
    } finally {
      setBusy(null);
    }
  };

  const pattern = cls?.pattern;
  const confidence = pattern?.confidence ?? incident.confidence_score ?? 0;

  return (
    <div className="mb-6 bg-app-surface border border-app-border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-app-border flex items-center gap-2">
        <BrainCircuit className="w-4 h-4 text-app-brand" />
        <h3 className="text-sm font-bold text-app-primary">
          Knowledge Base &amp; Code Fix
        </h3>
        {loading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin ml-1" />}
      </div>

      <div className="p-5 space-y-4">
        {/* Classification row */}
        <div className="flex flex-wrap items-center gap-2">
          {cls && (
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded",
                cls.is_known
                  ? "bg-app-surface border border-emerald-500/30 text-emerald-400"
                  : "bg-app-surface border border-amber-500/30 text-amber-400",
              )}
            >
              {cls.is_known ? "Known error" : "New error type"}
            </span>
          )}
          {cls?.error_type && (
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-app-surface border border-app-border text-app-secondary">
              {cls.error_type}
            </span>
          )}
          {pattern?.support_group && (
            <span className="text-[10px] font-medium px-2 py-1 rounded bg-app-surface border border-sky-500/30 text-sky-400 inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {pattern.support_group}
            </span>
          )}
          {cls?.auto_fix && (
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-app-surface border border-violet-500/30 text-violet-400 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Auto-fixable
            </span>
          )}
        </div>

        {cls?.reason && (
          <p className="text-[11px] text-app-secondary leading-relaxed">{cls.reason}</p>
        )}

        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-app-secondary">
              Solution confidence
            </span>
            <span className="text-xs font-bold text-app-primary">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-app-input rounded-full overflow-hidden shadow-inner">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                confidence >= 0.7
                  ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  : confidence >= 0.4
                    ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                    : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]",
              )}
              style={{ width: `${Math.max(4, Math.min(100, confidence * 100))}%` }}
            />
          </div>
          {pattern && (
            <p className="text-[10px] text-app-secondary mt-1.5">
              Seen {pattern.occurrence_count}× · {pattern.acceptance_count} accepted ·{" "}
              {pattern.rejection_count} rejected — confidence rises each time a
              human accepts the fix.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleRaisePR}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-app-brand text-white border border-transparent shadow-md hover:bg-[#E04B0E] hover:shadow-[0_4px_20px_rgba(255,90,20,0.2)] rounded-lg disabled:opacity-50 transition-colors"
          >
            {busy === "pr" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <GitPullRequest className="w-3.5 h-3.5" />
            )}
            Write fix &amp; raise PR
          </button>
          <button
            onClick={() => setShowIngest((v) => !v)}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-app-secondary bg-app-surface border border-app-border rounded-lg hover:border-app-brand hover:text-app-primary shadow-sm disabled:opacity-50 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Ingest merged PR
          </button>
          <button
            onClick={openRefine}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-app-secondary bg-app-surface border border-app-border rounded-lg hover:border-app-brand hover:text-app-primary shadow-sm disabled:opacity-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Refine &amp; approve fix
          </button>
        </div>

        {showRefine && (
          <div className="space-y-2 border-t border-app-border pt-3">
            <p className="text-[11px] text-app-secondary">
              Edit the root cause / steps if needed, then approve. The approved
              fix is folded back into the knowledge base and graph (history +
              runbooks + this fix), and confidence rises.
            </p>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Root cause
            </div>
            <textarea
              value={rcEdit}
              onChange={(e) => setRcEdit(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-app-bg border border-app-border rounded-lg focus:outline-none focus:border-gray-400"
            />
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Fix steps (one per line)
            </div>
            <textarea
              value={stepsEdit}
              onChange={(e) => setStepsEdit(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 text-xs bg-app-bg border border-app-border rounded-lg focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={handleRefine}
              disabled={busy === "refine"}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === "refine" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Approve &amp; enrich knowledge base
            </button>
          </div>
        )}

        {showIngest && (
          <div className="space-y-2 border-t border-app-border pt-3">
            <p className="text-[11px] text-app-secondary">
              After a human merges the fix, paste the PR details so the agent
              learns it. The same error becomes auto-fixable next time.
            </p>
            <input
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="Merged PR URL"
              className="w-full px-3 py-2 text-xs bg-app-bg border border-app-border rounded-lg focus:outline-none focus:border-gray-400"
            />
            <textarea
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder="Paste the unified diff of the merged change…"
              rows={5}
              className="w-full px-3 py-2 text-xs font-mono bg-app-bg border border-app-border rounded-lg focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={handleIngest}
              disabled={busy === "ingest"}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === "ingest" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Ingest into knowledge base
            </button>
          </div>
        )}

        {msg && (
          <div className="text-[11px] text-app-secondary bg-app-surface border border-app-border rounded-lg px-3 py-2 break-all">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// NEW: Incident Lifecycle Journey Timeline Component
// ─────────────────────────────────────────────────────────────────────

interface JourneyTimelineProps {
  incidentId: string | number;
}

function JourneyTimeline({ incidentId }: JourneyTimelineProps) {
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { state } = useStore();

  const fetchEvents = async () => {
    try {
      const data = await api.incidentEvents(incidentId);
      setEvents(data);
    } catch (err) {
      console.warn("Failed to fetch incident events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEvents();
    // Poll events every 15s to capture automatic escalations as they occur
    const t = setInterval(fetchEvents, 15000);
    return () => clearInterval(t);
  }, [incidentId]);

  // Also refetch if the global store's incident status changes (e.g. approved / rejected)
  const currentIncidentStatus = useMemo(() => {
    const inc = state.incidents.find(
      (i) => String(i.id) === String(incidentId),
    );
    return inc?.status;
  }, [state.incidents, incidentId]);

  useEffect(() => {
    fetchEvents();
  }, [currentIncidentStatus]);

  if (loading && events.length === 0) {
    return (
      <div className="mt-6 p-6 bg-app-surface border border-app-border rounded-2xl shadow-sm text-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mx-auto"></div>
        <p className="text-xs text-app-secondary mt-2">
          Loading incident event journey...
        </p>
      </div>
    );
  }

  if (events.length === 0) {
    return null; // Don't render anything if no events exist yet
  }

  // Map each event type to a gorgeous tone, title, and Lucide icon
  const getEventConfig = (type: string) => {
    switch (type) {
      case "PIPELINE_FAILED":
        return {
          title: "Pipeline Failure Detected",
          icon: ShieldAlert,
          bg: "bg-app-surface border border-rose-500/30 border-rose-500/30 text-rose-400",
          iconBg: "bg-rose-500/20 text-rose-400",
        };
      case "INITIAL_MAIL_SENT":
        return {
          title: "Initial Alert Dispatched (L1)",
          icon: Mail,
          bg: "bg-app-surface border-app-border text-app-secondary",
          iconBg: "bg-app-surface text-app-secondary",
        };
      case "ESCALATION_CHECK":
        return {
          title: "SLA Check Performed",
          icon: Clock,
          bg: "bg-app-surface border-app-border text-app-primary",
          iconBg: "bg-app-surface text-app-primary",
        };
      case "ESCALATION_MAIL_SENT":
        return {
          title: "Incident Escalated (L1+L2+L3)",
          icon: AlertTriangle,
          bg: "bg-app-surface border border-amber-500/30 border-amber-500/30 text-amber-400",
          iconBg: "bg-app-surface border border-amber-500/30 text-amber-400",
        };
      case "RERUN_DETECTED":
        return {
          title: "Pipeline Rerun Detected",
          icon: RefreshCw,
          bg: "bg-app-surface border border-violet-500/30 border-violet-500/30 text-violet-400",
          iconBg: "bg-violet-500/20 text-violet-400",
        };
      case "RERUN_SUCCEEDED":
        return {
          title: "Rerun Succeeded",
          icon: CheckCircle2,
          bg: "bg-app-surface border border-emerald-500/30 border-emerald-500/30 text-emerald-400",
          iconBg: "bg-app-surface border border-emerald-500/30 text-emerald-400",
        };
      case "RERUN_FAILED":
        return {
          title: "Rerun Failed",
          icon: X,
          bg: "bg-app-surface border border-rose-500/30 border-rose-500/30 text-rose-400",
          iconBg: "bg-rose-500/20 text-rose-400",
        };
      case "RESOLVED":
        return {
          title: "Incident Resolved",
          icon: Check,
          bg: "bg-app-surface border border-emerald-500/30 border-emerald-500/30 text-emerald-400",
          iconBg: "bg-app-surface border border-emerald-500/30 text-emerald-400",
        };
      case "JIRA_TICKET_CREATED":
        return {
          title: "Jira Ticket Created",
          icon: Ticket,
          bg: "bg-app-surface border-app-border text-app-secondary",
          iconBg: "bg-app-surface text-app-secondary",
        };
      default:
        return {
          title: type.replace(/_/g, " "),
          icon: Activity,
          bg: "bg-app-surface border-app-border text-app-secondary",
          iconBg: "bg-app-surface border border-app-border text-app-secondary",
        };
    }
  };

  return (
    <div className="mt-6 border border-app-border bg-app-surface rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-app-border pb-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-app-primary">
            Incident Lifecycle Journey
          </h3>
          <p className="text-xs text-app-secondary">
            Autonomous incident detection, check intervals, and team escalation
            logs
          </p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-app-surface text-app-primary">
          JOURNEY LOG
        </span>
      </div>

      <div className="relative border-l-2 border-app-border ml-4 pl-6 space-y-8">
        {events.map((evt, idx) => {
          const cfg = getEventConfig(evt.event_type);
          const Icon = cfg.icon;

          return (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className="relative"
            >
              {/* Timeline marker icon */}
              <span
                className={cn(
                  "absolute -left-[37px] top-0.5 rounded-full p-1.5 border-2 border-app-bg shadow-sm flex items-center justify-center",
                  cfg.iconBg,
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>

              {/* Event Card */}
              <div className={cn("border border-app-border rounded-xl p-4 shadow-sm bg-app-surface")}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-app-primary">
                      {cfg.title}
                    </span>
                    {evt.escalation_level && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-app-surface border border-amber-500/30 text-amber-400 rounded">
                        Level: {evt.escalation_level}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-app-secondary font-mono">
                    {formatDateTime(evt.created_at)}
                  </span>
                </div>

                <p className="text-xs text-app-secondary leading-relaxed">
                  {evt.details}
                </p>

                {/* Recipient details display */}
                {Array.isArray(evt.recipients) && evt.recipients.length > 0 && (
                  <div className="mt-3 bg-app-input border border-app-border rounded-lg p-3 shadow-inner">
                    {(() => {
                      const splitRecipients = evt.recipients.flatMap(r => 
                        (r.email || "").split(",").map(e => ({ email: e.trim(), role: r.role })).filter(x => x.email)
                      );
                      return (
                        <>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-app-secondary mb-1.5 flex items-center gap-1">
                            <Users className="w-3 h-3" /> Notified Recipients (
                            {splitRecipients.length})
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {splitRecipients.map((r, i) => (
                              <div
                                key={i}
                                className="bg-app-surface border border-app-border rounded-md px-2.5 py-1.5 flex items-center justify-between"
                              >
                                <div className="truncate pr-2">
                                  <div className="text-[10px] font-semibold text-app-primary truncate">
                                    {r.email}
                                  </div>
                                  <div className="text-[9px] text-app-secondary font-medium">
                                    {r.role}
                                  </div>
                                </div>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {evt.related_run_id && (
                  <div className="mt-2 text-[10px] text-app-secondary font-medium">
                    Related Run ID:{" "}
                    <span className="font-mono text-app-primary bg-app-surface border border-app-border px-1 py-0.5 rounded">
                      #{evt.related_run_id}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
