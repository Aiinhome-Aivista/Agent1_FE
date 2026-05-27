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
  Mail,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  X,
  ArrowDown,
} from "lucide-react";
import { motion } from "motion/react";
import { cn, formatDateTime, timeAgo } from "../lib/utils";
import { auth } from "../services/api";

// ─────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────

type FilterTab = "open" | "all" | "closed";

interface IncidentListItem {
  pipeline_id: number;
  pipeline_name: string;
  run_id: number;
  latest_status: string;
  is_escalated: boolean;
  last_activity: string;
  cycle_count: number;
  pipeline_status: string;
  incident_status: string | null;
  resolved_at: string | null;
}

interface Step1Detail {
  step: number;
  title: string;
  pipeline_name: string;
  summary: string;
  detection_time: string;
}

interface Recipient {
  email: string;
  role: string;
  status: string;
}

interface NotificationCycle {
  cycle_number: number;
  sent_at: string;
  recipients: Recipient[];
}

interface Step2Detail {
  step: number;
  title: string;
  cycles: NotificationCycle[];
}

interface Step3Detail {
  step: number;
  title: string;
  status: string;
  new_run_found: boolean;
  cycles: NotificationCycle[];
}

interface Step4Detail {
  step: number;
  title: string;
  pipeline_status: string;
  incident_status: string | null;
  resolved_at: string | null;
}

interface IncidentDetail {
  pipeline_id: number;
  pipeline_name: string;
  run_id: number;
  is_escalated: boolean;
  step1: Step1Detail;
  step2: Step2Detail;
  step3: Step3Detail;
  step4: Step4Detail;
}

// ─────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────

function isListItemOpen(item: IncidentListItem): boolean {
  return !item.resolved_at && item.pipeline_status !== "SUCCEEDED";
}

function isListItemClosed(item: IncidentListItem): boolean {
  return !!item.resolved_at || item.pipeline_status === "SUCCEEDED";
}

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

export function IncidentsPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);

  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<IncidentDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Fetch the incidents list from REST API
  const fetchList = async () => {
    setLoadingList(true);
    setErrorList(null);
    try {
      const headers: Record<string, string> = {};
      const token = auth.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch("/api/v1/timeline/incidents", { headers });
      if (response.status === 401) {
        auth.clearToken();
        navigate("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      setIncidents(data);
    } catch (err: any) {
      setErrorList(err.message || "An error occurred while fetching the incidents list.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Fetch detail whenever selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    let active = true;
    async function fetchDetail() {
      setLoadingDetail(true);
      setErrorDetail(null);
      try {
        const headers: Record<string, string> = {};
        const token = auth.getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`/api/v1/timeline/incidents/${selectedId}`, { headers });
        if (response.status === 401) {
          auth.clearToken();
          navigate("/login");
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch timeline details: ${response.statusText}`);
        }
        const data = await response.json();
        if (active) {
          setSelectedDetail(data);
        }
      } catch (err: any) {
        if (active) {
          setErrorDetail(err.message || "An error occurred while fetching timeline details.");
          setSelectedDetail(null);
        }
      } finally {
        if (active) {
          setLoadingDetail(false);
        }
      }
    }
    fetchDetail();
    return () => {
      active = false;
    };
  }, [selectedId]);

  // Keep state sync'd when routeId changes externally
  useEffect(() => {
    if (routeId) {
      setSelectedId(routeId);
    }
  }, [routeId]);

  // Filtered list (memoized — recomputes only when filter/search/incidents change)
  const filtered = useMemo(() => {
    let list = [...incidents];
    if (filter === "open") list = list.filter(isListItemOpen);
    if (filter === "closed") list = list.filter(isListItemClosed);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.pipeline_name?.toLowerCase().includes(q) ||
          String(i.pipeline_id).includes(q) ||
          String(i.run_id).includes(q) ||
          i.incident_status?.toLowerCase().includes(q) ||
          i.pipeline_status?.toLowerCase().includes(q),
      );
    }

    // Sort by last_activity newest first
    list.sort(
      (a, b) =>
        new Date(b.last_activity).getTime() -
        new Date(a.last_activity).getTime(),
    );
    return list;
  }, [incidents, filter, searchQuery]);

  // Auto-select first matching incident if nothing is selected or current selection no longer matches
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillThere = filtered.some(
      (i) => String(i.pipeline_id) === String(selectedId),
    );
    if (!stillThere) {
      setSelectedId(String(filtered[0].pipeline_id));
    }
  }, [filtered, selectedId]);

  // Keep the URL in sync with the selection
  useEffect(() => {
    if (selectedId && routeId !== selectedId) {
      navigate(`/app/incidents/${selectedId}`, { replace: true });
    }
  }, [selectedId, routeId, navigate]);

  return (
    <div className="flex-1 flex min-h-0 bg-[#F9FAFB]">
      {/* ─── LEFT: Filter + Incident List ───────────────────────────── */}
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
            {loadingList ? "LOADING..." : `${filtered.length} INCIDENT${filtered.length === 1 ? "" : "S"}`}
          </div>
        </div>

        {/* List content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingList ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse bg-gray-50 border border-[#E5E7EB] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-2.5 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded-full w-12" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="flex justify-between pt-1">
                    <div className="h-4 bg-gray-200 rounded w-16" />
                    <div className="h-3 bg-gray-200 rounded w-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : errorList ? (
            <div className="p-6 text-center text-xs text-rose-600 bg-rose-50 border-y border-rose-100">
              <p className="font-bold">Error Loading Incidents</p>
              <p className="mt-1 text-[11px] text-rose-500 leading-normal">{errorList}</p>
              <button 
                onClick={fetchList}
                className="mt-3 px-3 py-1 bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-[10px] font-bold uppercase transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9CA3AF]">
              No incidents match this filter.
            </div>
          ) : (
            <ul className="divide-y divide-[#F3F4F6]">
              {filtered.map((inc) => {
                const active = String(inc.pipeline_id) === String(selectedId);
                const isItemClosedStatus = isListItemClosed(inc);
                return (
                  <li key={inc.pipeline_id}>
                    <button
                      onClick={() => setSelectedId(String(inc.pipeline_id))}
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
                          Pipeline #{inc.pipeline_id}
                        </span>
                        {inc.is_escalated && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                            Escalated
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] font-bold text-[#111827] truncate">
                        {inc.pipeline_name}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">
                        Run #{inc.run_id} • {inc.cycle_count} cycle{inc.cycle_count === 1 ? "" : "s"}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ─── RIGHT: Timeline Pane ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {loadingDetail ? (
          <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
            <div className="border-b border-[#E5E7EB] pb-6 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
            {[1, 2, 3].map((step) => (
              <div key={step} className="space-y-4">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-16" />
                      <div className="h-5 bg-gray-200 rounded w-48" />
                    </div>
                    <div className="h-6 bg-gray-200 rounded-full w-20" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                </div>
                {step < 3 && (
                  <div className="flex justify-center py-1">
                    <div className="w-1.5 h-6 bg-gray-100 rounded" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : errorDetail ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 border border-rose-100">
              <X className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#111827]">Failed to Load Timeline</h3>
            <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
              {errorDetail}
            </p>
            <button 
              onClick={() => {
                if (selectedId) {
                  setSelectedId(null);
                  setTimeout(() => setSelectedId(selectedId), 50);
                }
              }}
              className="mt-4 px-4 py-1.5 bg-[#111827] text-white hover:bg-gray-800 rounded-lg text-xs font-bold transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : !selectedDetail ? (
          <div className="h-full flex items-center justify-center text-sm text-[#9CA3AF]">
            Select an incident on the left to inspect its timeline.
          </div>
        ) : (
          <TimelineView detail={selectedDetail} />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Timeline View Component (Step-by-step layout)
// ─────────────────────────────────────────────────────────────────────

interface TimelineViewProps {
  detail: IncidentDetail;
}

function TimelineView({ detail }: TimelineViewProps) {
  const isResolved = !!detail.step4.resolved_at || detail.step4.pipeline_status === "SUCCEEDED";
  const resolvedDisplayTime = detail.step4.resolved_at || detail.step1.detection_time;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              {detail.pipeline_name}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#6B7280]">
              <span>Pipeline #{detail.pipeline_id}</span>
              <span>·</span>
              <span>Run #{detail.run_id}</span>
              <span>·</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                  isResolved
                    ? "bg-emerald-100 text-emerald-700"
                    : detail.is_escalated
                      ? "bg-rose-100 text-rose-700"
                      : "bg-blue-100 text-blue-700",
                )}
              >
                {isResolved ? "SUCCEEDED" : detail.step4.incident_status || detail.step4.pipeline_status || "ACTIVE"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Steps Path */}
      <div className="relative space-y-2">
        {/* Step 1: Incident Detection */}
        <div>
          <Step
            index={1}
            title={detail.step1.title || "Incident Detection"}
            source={{ kind: "System", icon: Cpu }}
            tone="default"
          >
            <Line label="Issue Summary" value={detail.step1.summary} />
            <Line
              label="Detection Time"
              value={formatDateTime(detail.step1.detection_time)}
            />
            <Line label="Pipeline Name" value={detail.step1.pipeline_name} />
            <Line label="Pipeline ID" value={String(detail.pipeline_id)} />
            <Line label="Run ID" value={String(detail.run_id)} />
          </Step>
          <ConnectorLine />
        </div>

        {/* Step 2: Initial Notification */}
        <div>
          {detail.step2.cycles && detail.step2.cycles.length > 0 ? (
            <Step
              index={2}
              title={detail.step2.title || "Initial Notification"}
              source={{ kind: "Mailer", icon: Mail }}
              tone="default"
            >
              <div className="space-y-3.5">
                {detail.step2.cycles.map((cycle) => (
                  <div key={cycle.cycle_number} className="border border-[#E5E7EB] bg-white rounded-xl p-3.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#111827]">
                        Notification Cycle {cycle.cycle_number}
                      </span>
                      <span className="text-[10px] font-mono text-[#9CA3AF]">
                        {formatDateTime(cycle.sent_at)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {cycle.recipients.map((r, idx) => (
                        <div key={idx} className="border border-[#E5E7EB] bg-gray-50/50 rounded-lg p-2.5 flex flex-col justify-between">
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-[#6B7280]">
                              {r.role}
                            </div>
                            <div className="text-[11px] font-mono text-[#111827] truncate mt-0.5" title={r.email}>
                              {r.email}
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full inline-flex items-center gap-1",
                              r.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            )}>
                              <span className={cn("w-1 h-1 rounded-full", r.status === "sent" ? "bg-emerald-500" : "bg-rose-500")} />
                              {r.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Step>
          ) : (
            <PlaceholderStep
              index={2}
              title={detail.step2.title || "Initial Notification"}
              note="Awaiting initial mail notifications to dispatch."
            />
          )}
          <ConnectorLine />
        </div>

        {/* Step 3: Escalation */}
        <div>
          {detail.step3.cycles && detail.step3.cycles.length > 0 ? (
            <Step
              index={3}
              title={detail.step3.title || "Escalation"}
              source={{ kind: "System", icon: AlertTriangle }}
              tone="alert"
            >
              <div className="space-y-3.5">
                {detail.step3.cycles.map((cycle) => (
                  <div key={cycle.cycle_number} className="border border-rose-200 bg-white rounded-xl p-3.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-rose-100 pb-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
                        Escalation Cycle {cycle.cycle_number}
                      </span>
                      <span className="text-[10px] font-mono text-[#9CA3AF]">
                        {formatDateTime(cycle.sent_at)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {cycle.recipients.map((r, idx) => (
                        <div key={idx} className="border border-[#E5E7EB] bg-gray-50/50 rounded-lg p-2.5 flex flex-col justify-between">
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-[#6B7280]">
                              {r.role}
                            </div>
                            <div className="text-[11px] font-mono text-[#111827] truncate mt-0.5" title={r.email}>
                              {r.email}
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full inline-flex items-center gap-1",
                              r.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            )}>
                              <span className={cn("w-1 h-1 rounded-full", r.status === "sent" ? "bg-emerald-500" : "bg-rose-500")} />
                              {r.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Step>
          ) : (
            <PlaceholderStep
              index={3}
              title={detail.step3.title || "Escalation"}
              note={isResolved ? "Escalation not required (Pipeline resolved within initial SLA)." : "Will dispatch automatically if the SLA window expires without resolution."}
            />
          )}
          <ConnectorLine />
        </div>

        {/* Step 4: Resolution */}
        <div>
          <Step
            index={4}
            title={detail.step4.title || "Resolution"}
            source={{ kind: "System", icon: CheckCircle2 }}
            tone={isResolved ? "success" : "default"}
          >
            {isResolved ? (
              <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl p-3.5 text-xs text-emerald-800 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Pipeline Resolved
                </p>
                <p className="mt-1">
                  The issue has been completely remediated. Successful pipeline completion was detected and verified at <span className="font-mono font-bold text-[#111827]">{formatDateTime(resolvedDisplayTime)}</span>.
                </p>
              </div>
            ) : (
              <div className="border border-[#E5E7EB] bg-gray-50/50 rounded-xl p-3.5 text-xs text-[#6B7280] leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 text-[#374151]">
                  SLA Active & Monitoring
                </p>
                <p className="mt-1">
                  Timeline remains open. Awaiting a successful pipeline run execution or manual engineer intervention to verify resolution.
                </p>
                <div className="mt-3 flex gap-4 text-[10px] uppercase font-bold tracking-wider">
                  <div>
                    Pipeline: <span className="text-rose-600">{detail.step4.pipeline_status || "FAILED"}</span>
                  </div>
                  <div>
                    Incident: <span className="text-amber-600">{detail.step4.incident_status || "ACTIVE"}</span>
                  </div>
                </div>
              </div>
            )}
          </Step>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step Layout Helper Components
// ─────────────────────────────────────────────────────────────────────

interface StepProps {
  index: number;
  title: string;
  source: { kind: string; icon: any };
  tone: "default" | "alert" | "success";
  children: React.ReactNode;
}

function Step({ index, title, source, tone, children }: StepProps) {
  const Icon = source.icon;
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "relative bg-white border rounded-2xl p-5 shadow-sm",
        tone === "alert"
          ? "border-rose-200 bg-rose-50/30"
          : tone === "success"
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-[#E5E7EB]",
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
            Step {index}
          </div>
          <h3 className="text-base font-bold text-[#111827] mt-1">
            {title}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
            source.kind === "Mailer"
              ? "bg-blue-50 text-blue-700"
              : tone === "alert"
                ? "bg-rose-50 text-rose-700"
                : tone === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[#F3F4F6] text-[#6B7280]",
          )}
        >
          <Icon className="w-3 h-3" /> {source.kind}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </motion.section>
  );
}

function PlaceholderStep({
  index,
  title,
  note,
}: {
  index: number;
  title: string;
  note: string;
}) {
  return (
    <section className="relative bg-white border border-dashed border-[#E5E7EB] rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
            Step {index}
          </div>
          <h3 className="text-sm font-bold text-[#9CA3AF] mt-1">
            {title}
          </h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] bg-[#F3F4F6] px-2 py-1 rounded-md">
          Pending
        </span>
      </div>
      <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">{note}</p>
    </section>
  );
}

function ConnectorLine() {
  return (
    <div className="flex justify-center py-1.5">
      <ArrowDown size={20} strokeWidth={3} className="text-[#D1D5DB]" />
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs text-[#374151] leading-relaxed">
      <span className="text-[#6B7280]">{label}:</span>{" "}
      <span className="text-[#111827] font-medium">{value}</span>
    </div>
  );
}
