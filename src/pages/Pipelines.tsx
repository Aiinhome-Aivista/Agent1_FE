import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Calendar,
  Database,
  Tag,
  User,
  X,
  RotateCw,
  Workflow,
  PlayCircle,
  Filter,
  Activity,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Brain,
  Wrench,
} from "lucide-react";
import { PipelineDetail } from "../components/pipelines/PipelineDetail";
import { RunInvestigation } from "../components/pipelines/RunInvestigation";
import { Header } from "../components/Header";
import { PipelineStatusBadge } from "../components/Badges";
import { ConnectorIcon } from "../components/ConnectorIcon";
import { useStore } from "../hooks/useStore";
import { api } from "../services/api";
import { cn, timeAgo } from "../lib/utils";
import { Loading } from "../components/Loading";
import type { Pipeline, Connector } from "../types";

export function PipelinesPage() {
  const { state, refresh } = useStore();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<
    "ALL" | "SUCCEEDED" | "FAILED" | "RUNNING" | "QUEUED" | "CANCELLED"
  >("ALL");
  const [search, setSearch] = useState("");
  const [localPipelines, setLocalPipelines] = useState<Pipeline[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const connectorId = searchParams.get("connector_id");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pData, cData] = await Promise.all([
          api.pipelines(connectorId ? { connector_id: connectorId } : {}),
          api.connectors(),
        ]);
        setLocalPipelines(pData);
        setConnectors(cData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [connectorId]);

  // Handle individual pipeline detail fetch
  useEffect(() => {
    // Reset run selection when pipeline context changes
    setSelectedRunId(null);

    if (!id) {
      setSelectedPipeline(null);
      return;
    }

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const data = await api.pipeline(id);
        setSelectedPipeline(data);
      } catch (err) {
        console.error("Failed to fetch pipeline detail:", err);
        // Fallback to local search if API fails
        const found =
          localPipelines.find((p) => String(p.id) === String(id)) ||
          state.pipelines.find((p) => String(p.id) === String(id));
        if (found) setSelectedPipeline(found);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [id, localPipelines, state.pipelines]);

  const connectorMap = useMemo(
    () => Object.fromEntries(connectors.map((c) => [c.id, c])),
    [connectors],
  );

  const filtered = useMemo(() => {
    let list =
      localPipelines.length > 0 || connectorId
        ? localPipelines
        : state.pipelines;
    if (search) {
      const lowerSearch = search.toLowerCase();
      list = list.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(lowerSearch);
        const conn = connectorMap[p.connector_id];
        const sourceName = conn ? conn.name : (p.connector_id || "");
        const sourceMatch = String(sourceName).toLowerCase().includes(lowerSearch);
        return nameMatch || sourceMatch;
      });
    }
    if (filter !== "ALL") {
      list = list.filter((p) => {
        const s = (p.last_run_status || p.status || "").toUpperCase();
        return s === filter;
      });
    }
    return list;
  }, [state.pipelines, localPipelines, filter, connectorId, search, connectorMap]);

  const selected = id
    ? localPipelines.find((p) => p.id === String(id)) ||
      state.pipelines.find((p) => String(p.id) === String(id))
    : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-app-bg">

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {id ? (
          loadingDetail ? (
            <Loading message="fetching pipeline architecture..." />
          ) : selectedPipeline ? (
            selectedRunId ? (
              <RunInvestigation
                runId={selectedRunId}
                pipeline={selectedPipeline}
                onBack={() => setSelectedRunId(null)}
              />
            ) : (
              <PipelineDetail
                pipeline={selectedPipeline}
                onBack={() => navigate("/app/pipelines")}
                onViewRun={(rid) => setSelectedRunId(rid)}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-app-secondary mb-4">
                  Pipeline not found or error loading details.
                </p>
                <button
                  onClick={() => navigate("/app/pipelines")}
                  className="btn-secondary"
                >
                  Back to Catalog
                </button>
              </div>
            </div>
          )
        ) : loading ? (
          <Loading message="Syncing pipeline catalog..." />
        ) : (
          <main className="flex-1 flex flex-col min-h-0 p-10">
          {/* ... Catalog List Content ... */}
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 space-y-6">
          {/* Filters & Search */}
          <div className="flex items-center gap-4 bg-app-surface border border-app-border p-3 rounded-lg shadow-sm">
            <div className="relative flex-1">
              <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search by name or source..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-app-bg border-none rounded-md focus:ring-1 focus:ring-gray-300 outline-none"
              />
            </div>
            <div className="flex items-center gap-1 p-1 bg-app-input/30 rounded-lg border border-app-border shadow-inner">
              {[
                "ALL",
                "SUCCEEDED",
                "FAILED",
                "RUNNING",
                "QUEUED",
                "CANCELLED",
              ].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200",
                    filter === f
                      ? "bg-app-surface text-app-primary shadow-sm border border-app-border"
                      : "text-app-secondary hover:text-app-primary hover:bg-app-surface/50",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {connectorId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-app-surface border border-sky-500/30 border border-blue-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-sky-400 w-fit">
              <Tag className="w-3.5 h-3.5" />
              Filtered by Connector ID: {connectorId}
              <button
                onClick={() => setSearchParams({})}
                className="ml-2 hover:text-blue-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Table View */}
          <div className="flex-1 min-h-0 bg-app-surface border border-app-border rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-app-bg border-b border-app-border">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                    Pipeline
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                    Source
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                    Last Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                    Last Run
                  </th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-app-surface flex items-center justify-center">
                          <Database className="w-6 h-6 text-gray-300" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-app-primary">No pipelines found</p>
                          <p className="text-xs text-app-secondary mt-1">
                            {connectorId ? `No pipelines are currently associated with connector ID: ${connectorId}` : "Try adjusting your search or filters to find what you're looking for."}
                          </p>
                        </div>
                        {connectorId && (
                          <button 
                            onClick={() => setSearchParams({})}
                            className="mt-2 text-[10px] font-bold uppercase tracking-widest text-app-brand hover:text-blue-800"
                          >
                            Clear Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const conn = connectorMap[p.connector_id];
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-app-bg transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-app-primary group-hover:text-app-brand transition-colors">
                            {p.name}
                          </span>
                          {p.description && (
                            <span className="text-[10px] text-[#9CA3AF] font-medium mt-0.5 truncate max-w-xs">
                              {p.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {conn ? (
                          <div className="flex items-center gap-2">
                            <ConnectorIcon type={conn.type} size={14} />
                            <span className="text-[11px] font-bold text-app-secondary">
                              {conn.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#9CA3AF]">
                            ID: {p.connector_id}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <PipelineStatusBadge
                          status={p.last_run_status || p.status}
                        />
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-[#9CA3AF]">
                        {timeAgo(p.last_run_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/app/pipelines/${p.id}`)}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] hover:text-app-primary inline-flex items-center gap-1 transition-all"
                        >
                          view <PlayCircle className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
        </main>
      )}
      </div>
    </div>
  );
}

