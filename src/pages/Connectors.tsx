import { useEffect, useState } from "react";
import {
  Plus,
  TestTube2,
  RotateCw,
  PlayCircle,
  Trash2,
  Database,
  Workflow,
  GitBranch,
  Plug,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { ConnectorModal } from "../components/ConnectorModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { Loading } from "../components/Loading";
import { api } from "../services/api";
import type { Connector } from "../types";
import { cn, timeAgo } from "../lib/utils";

const TYPE_BADGE: Record<string, string> = {
  Orchestrator: "bg-blue-50 text-blue-700 border-blue-100",
  Monitoring: "bg-purple-50 text-purple-700 border-purple-100",
  Logs: "bg-amber-50 text-amber-700 border-amber-100",
  Ticketing: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Communication: "bg-pink-50 text-pink-700 border-pink-100",
  Git: "bg-gray-50 text-gray-700 border-gray-100",
  Runtime: "bg-indigo-50 text-indigo-700 border-indigo-100",
  Cloud: "bg-sky-50 text-sky-700 border-sky-100",
};

function ConnectorIcon({ type, size = 16 }: { type: string; size?: number }) {
  const cfg: Record<string, { icon: React.ElementType; color: string }> = {
    ADF: { icon: Workflow, color: "text-sky-600" },
    DATABRICKS: { icon: Database, color: "text-amber-600" },
    GIT: { icon: GitBranch, color: "text-violet-600" },
  };
  const { icon: Icon, color } = cfg[type] || {
    icon: Database,
    color: "text-gray-400",
  };
  return <Icon size={size} className={color} strokeWidth={2.25} />;
}

export function ConnectorsPage() {
  const navigate = useNavigate();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [open, setOpen] = useState(false);
  const [openOnNew, setOpenOnNew] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      setConnectors(await api.connectors());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    window.addEventListener('connectors-updated', reload);
    return () => window.removeEventListener('connectors-updated', reload);
  }, []);

  const handleTest = async (id: string) => {
    setBusy(id + "-test");
    try {
      await api.testConnector(id);
      await reload();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async (id: string) => {
    setBusy(id + "-sync");
    try {
      await api.syncConnector(id);
      await reload();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusy(deleteId + "-delete");
    try {
      await api.deleteConnector(deleteId);
      await reload();
      setDeleteId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const grouped = connectors.reduce<Record<string, Connector[]>>((acc, c) => {
    acc[c.type] = acc[c.type] || [];
    acc[c.type].push(c);
    return acc;
  }, {});

  return (
    <>
      {loading ? (
        <Loading message="Fetching source connectors..." />
      ) : (
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Counter label="Total" value={connectors.length} />
            <Counter
              label="Connected"
              value={
                connectors.filter((c) => c.status.toUpperCase() === "CONNECTED")
                  .length
              }
              accent="text-emerald-600"
            />
            <Counter
              label="Error"
              value={
                connectors.filter((c) => c.status.toUpperCase() === "ERROR")
                  .length
              }
              accent="text-red-600"
            />
            <Counter
              label="Categories"
              value={Object.keys(grouped).length}
              accent="text-[#6B7280]"
            />
          </div>

          {/* Empty State */}
          {connectors.length === 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center shadow-sm transition-all hover:shadow-md">
              <div className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-50 via-indigo-50/50 to-transparent blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-800 text-white shadow-xl shadow-gray-900/10 ring-8 ring-gray-50 animate-bounce">
                  <Plug className="h-8 w-8 text-sky-400" strokeWidth={2} />
                </div>

                <h3 className="text-xl font-bold tracking-tight text-[#111827]">
                  No Source Connectors Found
                </h3>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-[#6B7280]">
                  Get started by securely connecting your cloud platforms, metadata databases, or repositories. Once linked, the Agent Mesh will autonomously monitor pipeline health and trigger incident workflows.
                </p>

                <button
                  onClick={() => {
                    setOpenOnNew(true);
                    setOpen(true);
                  }}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-gray-900/10 transition-all hover:bg-black hover:scale-105 active:scale-95"
                >
                  <Plus className="h-4 w-4 text-sky-400" strokeWidth={2.5} />
                  Connect First Source
                </button>

                <div className="mt-10 flex items-center gap-6 border-t border-[#F3F4F6] pt-8 text-[#9CA3AF]">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Secure Encryption
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Auto Sync
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* List by Type */}
          {Object.entries(grouped).map(([type, list]) => (
            <section key={type}>
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-[#9CA3AF] mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB]" />
                {type} — {list.length}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {list.map((c) => {
                  const isSyncing = busy === c.id + "-sync";
                  const isTesting = busy === c.id + "-test";
                  const isDeleting = busy === c.id + "-delete";

                  return (
                    <div
                      key={c.id}
                      className="group bg-white border border-[#E5E7EB] rounded-xl p-6 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-sm font-black text-[#111827] tracking-tight">
                            {c.name}
                          </p>
                          <div
                            className={cn(
                              "mt-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest inline-block border",
                              TYPE_BADGE[c.type] ||
                                "bg-gray-50 text-gray-400 border-gray-100",
                            )}
                          >
                            {c.type}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              c.status.toUpperCase() === "CONNECTED"
                                ? "bg-emerald-500"
                                : "bg-red-500",
                            )}
                          />
                          <span
                            className={cn(
                              "text-[10px] uppercase tracking-widest font-black",
                              c.status.toUpperCase() === "CONNECTED"
                                ? "text-emerald-600"
                                : "text-red-600",
                            )}
                          >
                            {c.status}
                          </span>
                        </div>
                      </div>

                      {/* Sync info / Description (subtle) */}
                      <div className="mb-1 min-h-[32px]">
                        <p className="text-[10px] text-[#9CA3AF] font-medium italic">
                          {c.last_synced_at
                            ? `Synced about ${timeAgo(c.last_synced_at)} ago`
                            : "Never synced"}
                        </p>
                      </div>

                      {/* Actions - matching A2 functionality */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#F3F4F6]">
                        <div className="flex items-center gap-1">
                          <ActionButton
                            icon={TestTube2}
                            label="Test"
                            onClick={() => handleTest(c.id)}
                            busy={isTesting}
                            disabled={!!busy}
                          />
                          <ActionButton
                            icon={RotateCw}
                            label="Sync"
                            onClick={() => handleSync(c.id)}
                            busy={isSyncing}
                            disabled={!!busy}
                          />
                          <ActionButton
                            icon={PlayCircle}
                            label="Pipelines"
                            onClick={() =>
                              navigate(`/app/pipelines?connector_id=${c.id}`)
                            }
                            disabled={!!busy}
                          />
                        </div>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={!!busy}
                          className="p-2 rounded-lg text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        </main>
      )}
      <ConnectorModal
        open={open}
        onClose={() => {
          setOpen(false);
          setOpenOnNew(false);
        }}
        connectors={connectors}
        onChange={reload}
        initialView={openOnNew ? "new" : "list"}
      />
      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        busy={!!busy && busy.endsWith("-delete")}
      />
    </>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  busy,
  disabled,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827] transition-all disabled:opacity-50",
        busy && "animate-pulse",
      )}
    >
      <Icon
        className={cn("w-3.5 h-3.5", busy && "animate-spin")}
        strokeWidth={2.5}
      />
      {label}
    </button>
  );
}

function Counter({
  label,
  value,
  accent = "text-[#111827]",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[10px] uppercase tracking-[0.2em] font-black text-[#9CA3AF]">
        {label}
      </p>
      <p className={cn("text-2xl font-light italic mt-2 tabular-nums", accent)}>
        {value}
      </p>
    </div>
  );
}
