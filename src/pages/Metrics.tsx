import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  Cpu,
  Database,
  AlertCircle,
  Gauge,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle2,
  Boxes,
  GitPullRequest,
  CalendarClock,
  Save,
  Play,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { StatCard } from "../components/StatCard";
import { InfoHint } from "../components/InfoHint";
import { api } from "../services/api";
import type { SystemMetrics, PipelinePerformance, MetricsSummary, HealthMetric, KBSettings } from "../types";
import { cn } from "../lib/utils";
import { Loading } from "../components/Loading";

const WINDOW_OPTIONS: { label: string; hours: number }[] = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
];

function fmtSec(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s as number)) return "—";
  if (s === 0) return "—";
  if (s < 1) return `${(s * 1000).toFixed(0)}ms`;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${(s / 60).toFixed(1)}m`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v as number)) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtMs(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v as number)) return "—";
  if (v === 0) return "—";
  if (v < 1000) return `${v.toFixed(0)}ms`;
  return `${(v / 1000).toFixed(2)}s`;
}

export function MetricsPage() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<SystemMetrics | null>(null);
  const [pipelineRows, setPipelineRows] = useState<PipelinePerformance[]>([]);
  const [summaryData, setSummaryData] = useState<MetricsSummary | null>(null);
  const [healthData, setHealthData] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [sys, rows, summary, health] = await Promise.all([
        api.systemMetrics(hours),
        api.pipelinePerformance(hours),
        api.metricsSummary(),
        api.metricsHealth()
      ]);
      setData(sys);
      setPipelineRows(Array.isArray(rows) ? rows : []);
      setSummaryData(summary);
      setHealthData(Array.isArray(health) ? health : []);
    } catch (e: any) {
      // On a poll-refresh failure, keep whatever data we already have on
      // screen instead of clearing it — the dashboard should degrade
      // gracefully, not flash to "Loading…" every 15 seconds.
      setError(e?.message || "Failed to load metrics");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    // First load shows the spinner; subsequent auto-refreshes are silent.
    load(true);
    const id = window.setInterval(() => load(false), 15_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  const ragSummary = data?.rag.summary;
  const collections = data?.rag.collections;
  const llm = data?.llm;
  const pipelines = data?.pipelines;

  const sortedRows = useMemo(
    () => [...pipelineRows].sort((a, b) => b.runs - a.runs),
    [pipelineRows],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB]">
      {loading && !data ? (
        <Loading message="Fetching performance metrics..." />
      ) : (
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/60">
              <div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-gray-700" strokeWidth={2.25} />
                  <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                    Performance Metrics
                  </h1>
                </div>
                <p className="text-xs text-[#6B7280] mt-1">
                  Pipelines · RAG retrieval · LLM latency · auto-refreshes every
                  15s
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                  {WINDOW_OPTIONS.map((opt) => (
                    <button
                      key={opt.hours}
                      onClick={() => setHours(opt.hours)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all",
                        hours === opt.hours
                          ? "bg-[#111827] text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => load(true)}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-lg shadow-sm"
                >
                  <RefreshCw
                    className={cn("w-3.5 h-3.5", loading && "animate-spin")}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Analytics Dashboard */}
            <div className="space-y-6 mb-8 border-b border-gray-200/60 pb-8">
              <h2 className="text-lg font-bold text-[#111827]">Analytics Dashboard</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  label="Total Tickets"
                  value={summaryData?.total_tickets ?? "—"}
                  icon={Activity}
                  accent="violet"
                />
                <StatCard
                  label="Tickets Solved"
                  value={summaryData?.tickets_solved ?? summaryData?.ai_resolved ?? "—"}
                  icon={CheckCircle2}
                  accent="emerald"
                  sub={`${summaryData?.ai_resolved ?? 0} AI · ${summaryData?.human_resolved ?? 0} human`}
                />
                <StatCard
                  label="AI Resolution Rate"
                  value={summaryData ? fmtPct(summaryData.ai_resolution_pct) : "—"}
                  icon={Sparkles}
                  accent="amber"
                  sub={`${summaryData?.open_incidents ?? 0} open`}
                />
                <StatCard
                  label="Avg MTTR"
                  value={
                    summaryData &&
                    typeof summaryData.mttr_avg_minutes === "number" &&
                    Number.isFinite(summaryData.mttr_avg_minutes)
                      ? `${summaryData.mttr_avg_minutes.toFixed(1)}m`
                      : "—"
                  }
                  icon={Clock}
                  accent="cyan"
                />
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-bold text-[#111827] mb-6">Tickets Raised vs AI Solved</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={healthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }}
                        cursor={{ fill: "#F9FAFB" }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                      <Bar dataKey="tickets_raised" name="Tickets Raised" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="tickets_ai_solved" name="AI Solved" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* MTTR + AI-resolution trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-bold text-[#111827] mb-1 flex items-center gap-1.5">
                    MTTR Trend
                    <InfoHint
                      align="left"
                      text="Mean time to resolution per day, in minutes, averaged over incidents resolved that day. Lower is better."
                    />
                  </h3>
                  <p className="text-[11px] text-[#6B7280] mb-5">
                    Mean time to resolution (minutes / day)
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={healthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }}
                        />
                        <Line type="monotone" dataKey="mttr_minutes" name="MTTR (min)" stroke="#06B6D4" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-bold text-[#111827] mb-1 flex items-center gap-1.5">
                    AI Resolution Trend
                    <InfoHint
                      align="left"
                      text="Percentage of tickets each day that the agent resolved autonomously (AI solved ÷ raised)."
                    />
                  </h3>
                  <p className="text-[11px] text-[#6B7280] mb-5">
                    Daily AI auto-resolution rate (%)
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={healthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }}
                        />
                        <Line type="monotone" dataKey="success_rate" name="AI resolved %" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Knowledge Base / learning loop */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-bold text-[#111827] mb-5 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-violet-500" />
                  Knowledge Base &amp; Learning Loop
                  <InfoHint
                    align="left"
                    title="How the agent learns"
                    text={[
                      "Each distinct error becomes a pattern the agent recognises.",
                      "Known patterns with an accepted fix can be auto-resolved with a PR.",
                      "Confidence rises every time a human accepts the proposed fix.",
                      "Merged human PRs are ingested so the same error is auto-fixable next time.",
                    ]}
                  />
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KbStat
                    label="Error patterns"
                    value={summaryData?.kb?.patterns_total ?? 0}
                    icon={Database}
                    tone="text-violet-600"
                  />
                  <KbStat
                    label="Known errors"
                    value={summaryData?.kb?.patterns_known ?? 0}
                    icon={CheckCircle2}
                    tone="text-emerald-600"
                  />
                  <KbStat
                    label="Auto-fixable"
                    value={summaryData?.kb?.patterns_auto_fixable ?? 0}
                    icon={Sparkles}
                    tone="text-amber-600"
                  />
                  <KbStat
                    label="PRs ingested"
                    value={summaryData?.kb?.human_prs_ingested ?? 0}
                    icon={GitPullRequest}
                    tone="text-sky-600"
                  />
                </div>
              </div>

              {/* Daily knowledge-base refresh schedule (stored in SQL) */}
              <KbSchedulePanel />
            </div>

            {/* Top KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                label="Pipeline Success"
                value={pipelines ? fmtPct(pipelines.success_rate_pct) : "—"}
                icon={TrendingUp}
                accent="emerald"
                sub={`${pipelines?.runs_total ?? 0} runs · ${pipelines?.runs_failed ?? 0} failed`}
              />
              <StatCard
                label="LLM p95 Latency"
                value={llm ? fmtMs(llm.p95_latency_ms) : "—"}
                icon={Zap}
                accent="violet"
                sub={`${llm?.call_count ?? 0} calls · ${llm ? fmtPct(llm.success_rate * 100) : "—"} ok`}
              />
              <StatCard
                label="RAG p95 (incidents)"
                value={
                  ragSummary ? fmtMs(ragSummary.incidents.p95_latency_ms) : "—"
                }
                icon={Activity}
                accent="cyan"
                sub={`${ragSummary?.incidents.query_count ?? 0} queries`}
              />
              <StatCard
                label="Vectors Indexed"
                value={
                  collections ? collections.incidents + collections.runbooks : 0
                }
                icon={Database}
                accent="amber"
                sub={`${collections?.incidents ?? 0} incidents · ${collections?.runbooks ?? 0} runbook chunks`}
              />
            </div>

            {/* Detail panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RAG panel */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  <h3 className="text-sm font-bold text-[#111827]">
                    Vector retrieval (RAG)
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  {(["incidents", "runbooks"] as const).map((kind) => {
                    const s = ragSummary?.[kind];
                    return (
                      <div
                        key={kind}
                        className="border border-gray-100 rounded-lg p-4 bg-gray-50/50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {kind} collection
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {collections?.[kind] ?? 0} vectors
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <Metric label="Queries" value={s?.query_count ?? 0} />
                          <Metric
                            label="Avg latency"
                            value={fmtMs(s?.avg_latency_ms ?? 0)}
                          />
                          <Metric
                            label="p95 latency"
                            value={fmtMs(s?.p95_latency_ms ?? 0)}
                          />
                          <Metric
                            label="Hit rate"
                            value={s ? fmtPct(s.hit_rate * 100) : "—"}
                          />
                          <Metric
                            label="Top similarity"
                            value={
                              s &&
                              typeof s.avg_top_similarity === "number" &&
                              Number.isFinite(s.avg_top_similarity)
                                ? s.avg_top_similarity.toFixed(2)
                                : "—"
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LLM panel */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-violet-500" />
                  <h3 className="text-sm font-bold text-[#111827]">
                    LLM calls
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <Metric label="Total calls" value={llm?.call_count ?? 0} />
                    <Metric
                      label="Success rate"
                      value={llm ? fmtPct(llm.success_rate * 100) : "—"}
                    />
                    <Metric
                      label="Avg latency"
                      value={fmtMs(llm?.avg_latency_ms ?? 0)}
                    />
                    <Metric
                      label="p95 latency"
                      value={fmtMs(llm?.p95_latency_ms ?? 0)}
                    />
                    <Metric
                      label="Avg prompt size"
                      value={`${llm?.avg_prompt_chars ?? 0} chars`}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
                    Latency reflects the full LLM round-trip (prompt assembly +
                    RAG context block + response parsing). Samples capped at the
                    last 500 calls.
                  </p>
                </div>
              </div>
            </div>

            {/* Pipeline performance table */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Per-pipeline performance
                </h3>
                <span className="ml-auto text-[10px] text-gray-400 font-mono">
                  {sortedRows.length} pipelines · last {hours}h
                </span>
              </div>

              {loading && sortedRows.length === 0 ? (
                <div className="p-16 text-center">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                </div>
              ) : sortedRows.length === 0 ? (
                <div className="p-16 text-center text-xs text-gray-500">
                  No pipeline data for this window.
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                      <th className="px-6 py-3">Pipeline</th>
                      <th className="px-3 py-3 text-right">Runs</th>
                      <th className="px-3 py-3 text-right">Success</th>
                      <th className="px-3 py-3 text-right">Failed</th>
                      <th className="px-3 py-3 text-right">Success %</th>
                      <th className="px-3 py-3 text-right">Avg</th>
                      <th className="px-3 py-3 text-right">p50</th>
                      <th className="px-3 py-3 text-right">p95</th>
                      <th className="px-3 py-3 text-right">p99</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {sortedRows.map((r) => (
                      <tr
                        key={r.pipeline_id}
                        className="hover:bg-[#F9FAFB] transition-colors"
                      >
                        <td className="px-6 py-3 text-xs font-medium text-[#111827] max-w-xs truncate">
                          {r.pipeline_name}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                          {r.runs}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-emerald-600">
                          {r.succeeded}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-rose-600">
                          {r.failed}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-mono">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded text-[10px] font-bold",
                              r.success_rate_pct >= 95
                                ? "bg-emerald-50 text-emerald-700"
                                : r.success_rate_pct >= 80
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700",
                            )}
                          >
                            {fmtPct(r.success_rate_pct)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                          {fmtSec(r.avg_duration_sec)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                          {fmtSec(r.p50_duration_sec)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                          {fmtSec(r.p95_duration_sec)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                          {fmtSec(r.p99_duration_sec)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

const DUMMY_LOGS = [
  {
    id: "log-1",
    timestamp: "2026-05-30T16:11:50.000Z",
    status: "success",
    message: "Started knowledge base consolidation",
    details: {
      source: "scheduler",
      trigger: "daily_cron",
      target_collections: ["incidents", "runbooks", "patterns"],
    },
  },
  {
    id: "log-2",
    timestamp: "2026-05-30T16:11:52.120Z",
    status: "success",
    message: "Replaying recently resolved incidents",
    details: {
      processed: 3,
      skipped: 0,
      new_vectors_generated: 12,
    },
  },
  {
    id: "log-3",
    timestamp: "2026-05-30T16:11:53.450Z",
    status: "error",
    message: "Failed to process runbook chunks",
    details: {
      error_code: "TIMEOUT",
      runbooks_scanned: 2,
      chunks_updated: 0,
    },
  },
  {
    id: "log-4",
    timestamp: "2026-05-30T16:11:55.800Z",
    status: "success",
    message: "Knowledge base refresh completed with partial success",
    details: {
      total_duration_ms: 5800,
      collections_updated: 2,
      status: "WARNING",
    },
  },
];

function KbSchedulePanel() {
  const [settings, setSettings] = useState<KBSettings | null>(null);
  const [time, setTime] = useState("02:00");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const load = async () => {
    try {
      const s = await api.kbSettings();
      setSettings(s);
      setTime(s.daily_refresh_time || "02:00");
      setEnabled(s.daily_refresh_enabled);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const s = await api.updateKbSettings({
        daily_refresh_enabled: enabled,
        daily_refresh_time: time,
      });
      setSettings(s);
      setMsg("Schedule saved.");
    } catch (e: any) {
      setMsg(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    setMsg(null);
    try {
      await api.kbRefreshNow();
      setMsg("Refresh complete — knowledge base consolidated.");
      load();
    } catch (e: any) {
      setMsg(e?.message || "Refresh failed");
    } finally {
      setRunning(false);
    }
  };

  const last = settings?.last_run_summary;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
      <h3 className="text-sm font-bold text-[#111827] mb-1 flex items-center gap-1.5">
        <CalendarClock className="w-4 h-4 text-indigo-500" />
        Knowledge Base Refresh Schedule
        <InfoHint
          align="left"
          title="Daily consolidation"
          text={[
            "At this time each day the agent re-enriches its knowledge base.",
            "It replays recent resolved incidents (history), every known fix pattern, and active runbooks into the vector store and knowledge graph.",
            "The time is stored in a SQL table, so it persists and can be changed any time.",
            "Time is interpreted in UTC.",
          ]}
        />
      </h3>
      <p className="text-[11px] text-[#6B7280] mb-5">
        Re-enriches from old errors, history, uploaded runbooks and
        human-approved fixes — time stored in SQL (UTC).
      </p>

      <div className="flex flex-wrap items-end gap-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="text-xs font-bold text-[#374151]">
            Daily refresh enabled
          </span>
        </label>

        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            Time (UTC)
          </div>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="px-3 py-2 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-gray-400"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#111827] rounded-lg hover:bg-black disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save schedule
        </button>

        <button
          onClick={runNow}
          disabled={running}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run now
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
          <span>
            Last run:{" "}
            <span className="font-semibold text-gray-700">
              {settings?.last_run_at
                ? new Date(
                    settings.last_run_at.endsWith("Z")
                      ? settings.last_run_at
                      : `${settings.last_run_at}Z`,
                  ).toLocaleString()
                : "never"}
            </span>
          </span>
          {last && (
            <>
              <span>
                Incidents replayed:{" "}
                <span className="font-semibold text-gray-700">
                  {last.incidents_replayed ?? 0}
                </span>
              </span>
              <span>
                Patterns mirrored:{" "}
                <span className="font-semibold text-gray-700">
                  {last.patterns_mirrored ?? 0}
                </span>
              </span>
              <span>
                Runbooks:{" "}
                <span className="font-semibold text-gray-700">
                  {last.runbooks_seen ?? 0}
                </span>
              </span>
            </>
          )}
        </div>
        
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
        >
          <FileText className="w-3.5 h-3.5" />
          {showLogs ? "Hide logs" : "View logs"}
        </button>
      </div>

      {showLogs && (
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-gray-500" />
            Refresh Logs
          </div>
          <div className="divide-y divide-gray-100">
            {DUMMY_LOGS.map((log) => (
              <div key={log.id} className="flex flex-col">
                <div 
                  className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <div className="flex-shrink-0">
                    {expandedLogId === log.id ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded", 
                    log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 
                    log.status === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                  )}>
                    {log.status}
                  </span>
                  <span className="text-xs text-gray-700 font-medium">
                    {log.message}
                  </span>
                </div>
                
                {expandedLogId === log.id && (
                  <div className="px-11 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                      {Object.entries(log.details).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-[11px] font-medium text-gray-500 capitalize min-w-24">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="text-[11px] text-gray-900 font-mono">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && (
        <div className="mt-3 text-[11px] text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          {msg}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-md px-3 py-2">
      <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </div>
      <div className="text-sm font-bold text-[#111827] mt-0.5">{value}</div>
    </div>
  );
}

function KbStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
          {label}
        </span>
        <Icon className={`w-4 h-4 ${tone}`} />
      </div>
      <div className="text-2xl font-bold text-[#111827]">{value}</div>
    </div>
  );
}
