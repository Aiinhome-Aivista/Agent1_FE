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
} from "lucide-react";
import { motion } from "motion/react";
import { useStore } from "../hooks/useStore";
import { cn, formatDateTime, timeAgo } from "../lib/utils";
import { api } from "../services/api";
import type { Incident, IncidentEvent } from "../types";

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
    <div className="flex-1 flex min-h-0 bg-[#F9FAFB]">
      {/* ─── LEFT: filter + incident list ───────────────────────────── */}
      <aside className="w-[340px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col">
        {/* Filter pills */}
        <div className="p-4 border-b border-[#E5E7EB]">
          <div className="bg-[#F3F4F6] p-1 rounded-lg flex">
            {(["open", "all", "closed"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                  filter === tab
                    ? "bg-[#111827] text-white shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search incidents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
            />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mt-3">
            {filtered.length} INCIDENT{filtered.length === 1 ? "" : "S"}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9CA3AF]">
              No incidents match this filter.
            </div>
          ) : (
            <ul className="divide-y divide-[#F3F4F6]">
              {filtered.map((inc) => {
                const active = String(inc.id) === String(selectedId);
                const summary = bestSummary(inc);
                return (
                  <li key={inc.id}>
                    <button
                      onClick={() => setSelectedId(String(inc.id))}
                      className={cn(
                        "w-full text-left p-4 transition-colors relative",
                        active ? "bg-[#F3F4F6]" : "hover:bg-[#F9FAFB]",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#111827]" />
                      )}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-[#6B7280]">
                          #{inc.id}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            inc.risk_tier === "High"
                              ? "bg-rose-50 text-rose-700"
                              : inc.risk_tier === "Medium"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {inc.risk_tier}
                        </span>
                      </div>
                      <div className="text-[13px] font-bold text-[#111827] truncate">
                        {inc.pipeline_name}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-1 leading-relaxed line-clamp-2">
                        {summary}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            inc.status === "Remediated"
                              ? "bg-emerald-50 text-emerald-700"
                              : inc.status === "Escalated"
                                ? "bg-rose-50 text-rose-700"
                                : inc.status === "Failed"
                                  ? "bg-gray-100 text-gray-600"
                                  : inc.status === "Processing"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-blue-50 text-blue-700",
                          )}
                        >
                          {inc.status}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF] font-medium">
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
          <div className="h-full flex items-center justify-center text-sm text-[#9CA3AF]">
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
      <div className="mb-6 pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              {incident.pipeline_name}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#6B7280]">
              <span>Incident #{incident.id}</span>
              <span>·</span>
              <span>{formatDateTime(incident.detected_at)}</span>
              <span>·</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                  incident.status === "Remediated"
                    ? "bg-emerald-100 text-emerald-700"
                    : incident.status === "Escalated"
                      ? "bg-rose-100 text-rose-700"
                      : incident.status === "Processing"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700",
                )}
              >
                {incident.status}
              </span>
              {incident.acknowledged_at && (
                <>
                  <span>·</span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 inline-flex items-center gap-1"
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
                    className="text-[10px] font-bold tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded inline-flex items-center hover:bg-blue-100 transition-colors"
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
        <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Human Approval Required
            </h3>
            <p className="text-xs text-amber-700 mt-1">
              This incident has a remediation plan ready but requires authorization to proceed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReject}
              disabled={!!loadingAction}
              className="px-4 py-2 text-xs font-bold text-amber-700 bg-white border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
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

      {/* Journey Timeline */}
      <JourneyTimeline incidentId={incident.id} />
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
      <div className="mt-6 p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm text-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mx-auto"></div>
        <p className="text-xs text-[#6B7280] mt-2">
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
          bg: "bg-rose-50 border-rose-200 text-rose-700",
          iconBg: "bg-rose-100 text-rose-700",
        };
      case "INITIAL_MAIL_SENT":
        return {
          title: "Initial Alert Dispatched (L1)",
          icon: Mail,
          bg: "bg-blue-50/50 border-blue-200 text-blue-700",
          iconBg: "bg-blue-100 text-blue-700",
        };
      case "ESCALATION_CHECK":
        return {
          title: "SLA Check Performed",
          icon: Clock,
          bg: "bg-slate-50 border-slate-200 text-slate-700",
          iconBg: "bg-slate-100 text-slate-700",
        };
      case "ESCALATION_MAIL_SENT":
        return {
          title: "Incident Escalated (L1+L2+L3)",
          icon: AlertTriangle,
          bg: "bg-amber-50 border-amber-200 text-amber-700",
          iconBg: "bg-amber-100 text-amber-700",
        };
      case "RERUN_DETECTED":
        return {
          title: "Pipeline Rerun Detected",
          icon: RefreshCw,
          bg: "bg-violet-50 border-violet-200 text-violet-700",
          iconBg: "bg-violet-100 text-violet-700",
        };
      case "RERUN_SUCCEEDED":
        return {
          title: "Rerun Succeeded",
          icon: CheckCircle2,
          bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
          iconBg: "bg-emerald-100 text-emerald-700",
        };
      case "RERUN_FAILED":
        return {
          title: "Rerun Failed",
          icon: X,
          bg: "bg-rose-50 border-rose-200 text-rose-700",
          iconBg: "bg-rose-100 text-rose-700",
        };
      case "RESOLVED":
        return {
          title: "Incident Resolved",
          icon: Check,
          bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
          iconBg: "bg-emerald-100 text-emerald-700",
        };
      case "JIRA_TICKET_CREATED":
        return {
          title: "Jira Ticket Created",
          icon: Ticket,
          bg: "bg-blue-50 border-blue-200 text-blue-700",
          iconBg: "bg-blue-100 text-blue-700",
        };
      default:
        return {
          title: type.replace(/_/g, " "),
          icon: Activity,
          bg: "bg-gray-50 border-gray-200 text-gray-700",
          iconBg: "bg-gray-100 text-gray-700",
        };
    }
  };

  return (
    <div className="mt-6 border border-[#E5E7EB] bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-[#111827]">
            Incident Lifecycle Journey
          </h3>
          <p className="text-xs text-[#6B7280]">
            Autonomous incident detection, check intervals, and team escalation
            logs
          </p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-slate-100 text-slate-700">
          JOURNEY LOG
        </span>
      </div>

      <div className="relative border-l-2 border-[#E5E7EB] ml-4 pl-6 space-y-8">
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
                  "absolute -left-[37px] top-0.5 rounded-full p-1.5 border-2 border-white shadow-sm flex items-center justify-center",
                  cfg.iconBg,
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>

              {/* Event Card */}
              <div className={cn("border rounded-xl p-4 shadow-sm bg-white")}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#111827]">
                      {cfg.title}
                    </span>
                    {evt.escalation_level && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                        Level: {evt.escalation_level}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#9CA3AF] font-mono">
                    {formatDateTime(evt.created_at)}
                  </span>
                </div>

                <p className="text-xs text-[#4B5563] leading-relaxed">
                  {evt.details}
                </p>

                {/* Recipient details display */}
                {Array.isArray(evt.recipients) && evt.recipients.length > 0 && (
                  <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Notified Recipients (
                      {evt.recipients.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {evt.recipients.map((r, i) => (
                        <div
                          key={i}
                          className="bg-white border border-gray-200 rounded px-2 py-1 flex items-center justify-between"
                        >
                          <div className="truncate pr-2">
                            <div className="text-[10px] font-semibold text-[#111827] truncate">
                              {r.email}
                            </div>
                            <div className="text-[9px] text-[#6B7280] font-medium">
                              {r.role}
                            </div>
                          </div>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evt.related_run_id && (
                  <div className="mt-2 text-[10px] text-[#6B7280] font-medium">
                    Related Run ID:{" "}
                    <span className="font-mono text-gray-900 bg-gray-100 px-1 py-0.5 rounded">
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
