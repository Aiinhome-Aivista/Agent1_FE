import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  Plug,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  Plus,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "../components/Skeleton";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { LiveLogStream } from "../components/LiveLogStream";
import {
  RiskBadge,
  StatusBadge,
  PipelineStatusBadge,
} from "../components/Badges";
import { ConnectorModal } from "../components/ConnectorModal";
import { PipelineList } from "../components/PipelineList";
import { Loading } from "../components/Loading";
import { useStore } from "../hooks/useStore";
import { api } from "../services/api";
import type { Connector, HealthMetric, DashboardStats } from "../types";
import { formatTime, cn } from "../lib/utils";

export function DashboardPage() {
  const { state, refresh } = useStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    refresh();

    try {
      const [cRes, sRes] = await Promise.allSettled([
        api.connectors(),
        api.stats(),
      ]);
      if (cRes.status === "fulfilled") setConnectors(cRes.value);
      if (sRes.status === "fulfilled") setStats(sRes.value);
    } catch (err) {
      console.warn("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const openIncidents = state.incidents.filter(
    (i) => i.status !== "Remediated" && i.status !== "Escalated",
  );

  const STATUS_COLORS: Record<string, string> = {
    HEALTHY: "#c5f24a",
    SUCCEEDED: "#c5f24a",
    UNHEALTHY: "#ff5d73",
    FAILED: "#ff5d73",
    DEGRADED: "#ffb547",
    PAUSED: "#5b6573",
    CANCELLED: "#5b6573",
    UNKNOWN: "#3b4653",
  };

  const statusCounts = state.pipelines.reduce(
    (acc, p) => {
      let k = (p.last_run_status || p.status || "UNKNOWN").toUpperCase();
      if (k === "UNHEALTHY") k = "FAILED"; // Group these for the chart
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const typeCounts = connectors.reduce(
    (acc, c) => {
      const k = c.type || "Other";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const failedPipelines = state.pipelines
    .filter((p) => {
      const s = (p.last_run_status || p.status || "").toLowerCase();
      return s === "unhealthy" || s === "degraded" || s === "failed";
    })
    .slice(0, 3);
  const runningPipelines = state.pipelines
    .filter((p) => {
      const s = (p.last_run_status || p.status || "").toLowerCase();
      return s === "healthy" || s === "succeeded";
    })
    .slice(0, 3);

  return (
    <>
      {loading ? (
        <Loading message="assembling control plane overview..." />
      ) : (
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="space-y-10 max-w-7xl mx-auto">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <StatCard
                label="Connectors"
                value={stats?.total_connectors ?? connectors.length}
                icon={Plug}
                accent="cyan"
                sub={`${connectors.filter((c) => c.status.toUpperCase() === "CONNECTED").length} connected`}
              />
              <StatCard
                label="Pipelines"
                value={stats?.total_pipelines ?? state.pipelines.length}
                icon={Activity}
                accent="violet"
                sub="tracked"
              />
              <StatCard
                label="Runs / 24h"
                value={stats?.runs_last_24h ?? 0}
                icon={Sparkles}
                accent="lime"
              />
              <StatCard
                label="Success rate"
                value={`${stats?.success_rate_24h ?? 0}%`}
                icon={CheckCircle2}
                accent={stats && stats.success_rate_24h < 80 ? "rose" : "lime"}
                sub="last 24h"
              />
              <StatCard
                label="Failures"
                value={stats?.failed_runs_24h ?? 0}
                icon={AlertTriangle}
                accent="rose"
                sub={`${stats?.pending_analyses ?? 0} pending analysis`}
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status Distribution */}
              <div className="bg-white border border-[#E5E7EB] p-7 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
                      Status distribution
                    </h4>
                    <p className="text-[10px] text-[#9CA3AF] mt-1">
                      last status per pipeline
                    </p>
                  </div>
                </div>
                <div className="h-[220px]">
                  {statusData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#9CA3AF] italic">
                      no data yet
                    </div>
                  ) : (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                      minHeight={220}
                    >
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {statusData.map((d) => (
                            <Cell
                              key={d.name}
                              fill={STATUS_COLORS[d.name] || "#3b4653"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E5E7EB",
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 justify-center">
                  {statusData.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight"
                    >
                      <span
                        className="w-2 h-2 rounded-sm"
                        style={{
                          background: STATUS_COLORS[d.name] || "#3b4653",
                        }}
                      />
                      <span className="text-[#6B7280]">{d.name}</span>
                      <span className="text-[#111827]">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connectors by Type */}
              <div className="bg-white border border-[#E5E7EB] p-7 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
                    Connectors by type
                  </h4>
                </div>
                <div className="h-[220px]">
                  {typeData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#9CA3AF] italic font-mono">
                      no connectors yet
                    </div>
                  ) : (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                      minHeight={220}
                    >
                      <BarChart
                        data={typeData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="name"
                          stroke="#9CA3AF"
                          fontSize={11}
                          fontFamily="JetBrains Mono, monospace"
                          tickLine={false}
                          axisLine={false}
                          dy={8}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          fontSize={11}
                          fontFamily="JetBrains Mono, monospace"
                          tickLine={false}
                          axisLine={false}
                          dx={-8}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E5E7EB",
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                          cursor={{ fill: "rgba(0,0,0,0.02)" }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                          barSize={60}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Live Event Feed */}
              <div className="bg-white border border-[#E5E7EB] rounded-lg flex flex-col overflow-hidden">
                <div className="px-7 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-60 animate-ping" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    <h4 className="text-sm font-semibold">Live Event Feed</h4>
                  </div>
                  <span className="text-[10px] text-[#6B7280] font-mono">
                    listening...
                  </span>
                </div>
                <div className="flex-1 p-5 overflow-y-auto max-h-[300px] custom-scrollbar space-y-3">
                  {state.logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                      <Activity className="w-8 h-8 mb-2 stroke-1" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Awaiting system events...
                      </span>
                    </div>
                  ) : (
                    state.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex gap-4 group p-1 rounded-md hover:bg-[#F9FAFB] transition-colors"
                      >
                        <span className="text-[10px] font-mono text-[#9CA3AF] whitespace-nowrap mt-0.5">
                          {formatTime(log.time)}
                        </span>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              log.type === "error"
                                ? "text-red-500"
                                : log.type === "warn"
                                  ? "text-amber-500"
                                  : log.type === "agent"
                                    ? "text-blue-500"
                                    : "text-emerald-500",
                            )}
                          >
                            {log.type}
                          </span>
                          <span className="text-xs text-[#4B5563] truncate">
                            {log.msg}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recently Failed & Currently Running Snapshots */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PipelineList
                title="Recently Failed"
                icon={AlertTriangle}
                pipelines={failedPipelines}
                empty="No failures — systems stable."
                accent="rose"
              />
              <PipelineList
                title="Currently Active"
                icon={Activity}
                pipelines={runningPipelines}
                empty="No active jobs running."
                accent="cyan"
              />
            </div>
          </div>
        </main>
      )}

      <ConnectorModal
        open={showModal}
        onClose={() => setShowModal(false)}
        connectors={connectors}
        onChange={reload}
      />
    </>
  );
}
