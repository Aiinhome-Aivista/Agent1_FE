import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Clock,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Search,
} from "lucide-react";
import { PipelineStatusBadge } from "../Badges";
import { useStore } from "../../hooks/useStore";
import { cn, timeAgo, formatDateTime } from "../../lib/utils";
import type { Pipeline } from "../../types";

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function MetricCard({
  label,
  value,
  children,
  accent = "gray",
}: {
  label: string;
  value?: string | number;
  children?: React.ReactNode;
  accent?: "blue" | "emerald" | "rose" | "gray";
}) {
  const accentMap = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    gray: "text-[#111827]",
  };
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">
        {label}
      </div>
      <div className={cn("text-xl font-bold tabular-nums", accentMap[accent])}>
        {children ?? value ?? "—"}
      </div>
    </div>
  );
}

interface PipelineDetailProps {
  pipeline: Pipeline;
  onBack: () => void;
  onViewRun: (id: string) => void;
}

export function PipelineDetail({
  pipeline,
  onBack,
  onViewRun,
}: PipelineDetailProps) {
  const { state } = useStore();

  // Calculations
  const runs = pipeline.runs || [];
  const completedRuns = runs.filter(
    (r) => r.status === "SUCCEEDED" || r.status === "FAILED",
  );
  const successCount = runs.filter((r) => r.status === "SUCCEEDED").length;
  const successRate = completedRuns.length
    ? Math.round((successCount / completedRuns.length) * 100)
    : null;

  const avgDuration = useMemo(() => {
    const durations = runs
      .filter((r) => r.duration_seconds != null)
      .map((r) => r.duration_seconds as number);
    if (durations.length === 0) return null;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [runs]);

  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    "desc",
  );

  const [searchTerm, setSearchTerm] = useState("");

  const handleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const filteredRuns = useMemo(() => {
    if (!searchTerm) return runs;
    return runs.filter(
      (run) =>
        run.external_run_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDateTime(run.started_at)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        run.status.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [runs, searchTerm]);

  const sortedRuns = useMemo(() => {
    if (!sortDirection) return filteredRuns;
    return [...filteredRuns].sort((a, b) => {
      const dateA = new Date(a.started_at);
      const dateB = new Date(b.started_at);
      if (sortDirection === "asc") {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    });
  }, [filteredRuns, sortDirection]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB]">
      <div className="flex-1 flex flex-col min-h-0 p-6">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 space-y-6">
          {/* Back Action */}
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7280] hover:bg-gray-50 transition-all shadow-sm"
            >
              <ArrowLeft size={12} />
              Back to Catalog
            </button>
          </div>

          {/* Stats Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Last Status">
              <PipelineStatusBadge
                status={pipeline.last_run_status || pipeline.status}
              />
            </MetricCard>
            <MetricCard label="Total Runs (Recent)" value={runs.length} />
            <MetricCard
              label="Success Rate"
              value={successRate != null ? `${successRate}%` : "—"}
              accent={
                successRate != null
                  ? successRate < 80
                    ? "rose"
                    : "emerald"
                  : "gray"
              }
            />
            <MetricCard
              label="Avg Duration"
              value={formatDuration(avgDuration)}
            />
          </div>

          {/* Run History Table */}
          <div className="flex-1 flex flex-col min-h-0 bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Run History
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]"
                  />
                  <input
                    type="text"
                    placeholder="Search by Run ID, Status, Started..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-64"
                  />
                </div>
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                  Latest {sortedRuns.length} Runs
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {sortedRuns.length === 0 ? (
                <div className="py-20 text-center">
                  <Clock className="w-10 h-10 text-[#E5E7EB] mx-auto mb-3" />
                  <p className="text-xs text-[#9CA3AF] font-medium">
                    {searchTerm
                      ? "No runs match your search."
                      : "No run history found for this pipeline."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#F9FAFB] text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] shadow-[0_1px_0_#F3F4F6]">
                      <th className="px-6 py-3">Run ID</th>
                      <th className="px-6 py-3">Status</th>
                      <th
                        className="px-6 py-3 cursor-pointer select-none"
                        onClick={handleSort}
                      >
                        <div className="flex items-center gap-2">
                          <span>Started</span>
                          <span className="flex items-center gap-0">
                            <ArrowUp
                              size={12}
                              className={cn(
                                "transition-colors",
                                "text-blue-600",
                              )}
                            />
                            <ArrowDown
                              size={12}
                              className={cn(
                                "transition-colors",
                                "text-blue-600",
                              )}
                            />
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Analysis</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {sortedRuns.map((run) => (
                      <tr
                        key={run.id}
                        className="hover:bg-[#F9FAFB] transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-bold text-[#111827] group-hover:text-blue-600 transition-colors">
                            {run.external_run_id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <PipelineStatusBadge status={run.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-[#4B5563]">
                              {formatDateTime(run.started_at)}
                            </span>
                            <span className="text-[10px] text-[#9CA3AF] font-medium">
                              {timeAgo(run.started_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-medium text-[#4B5563]">
                            {formatDuration(run.duration_seconds)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {run.analysis ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100 uppercase tracking-tight">
                              <Sparkles size={10} /> Available
                            </span>
                          ) : run.status === "FAILED" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-600 border border-amber-100 uppercase tracking-tight">
                              <AlertCircle size={10} /> Pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#9CA3AF] font-mono">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onViewRun(run.id)}
                            className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-all"
                          >
                            Details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
