import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Search,
  Plus,
  FileText,
  Sparkles,
  CheckCircle2,
  Edit3,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { StatCard } from "../../components/StatCard";
import { CreateRunbookModal } from "../../components/runbooks/CreateRunbookModal";
import { RunbookDetailPanel } from "../../components/runbooks/RunbookDetailPanel";
import { api } from "../../services/api";
import type { Runbook } from "../../types";
import { timeAgo, cn } from "../../lib/utils";
import { Loading } from "../../components/Loading";

type FilterTab = "ALL" | "ACTIVE" | "PROCESSING" | "FAILED" | "ARCHIVED";


/**
 * Adapts a backend Runbook payload into the shape the existing
 * RunbookDetailPanel expects. The panel was built around the original mock
 * shape (steps[], associated_systems, version_history, …). We synthesize
 * sensible defaults so the same component still renders correctly.
 */
function hydrate(b: Runbook): Runbook {
  return {
    ...b,
    last_updated: b.updated_at || b.created_at || new Date().toISOString(),
    last_updated_by: b.uploaded_by || "Unknown",
    ai_usage_enabled: b.rag_enabled,
    ai_approved: b.ai_approved ?? b.rag_enabled,
    human_verified: b.human_verified ?? false,
    steps: b.steps || [],
    associated_systems: b.associated_systems || [],
    last_incidents_used: b.last_incidents_used || [],
    version_history: b.version_history || ["v1.0.0"],
    tags: b.tags || [],
    linked_incidents_count: b.linked_incidents_count ?? 0,
  };
}

export function RunbooksPage() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRunbookId, setSelectedRunbookId] = useState<
    string | number | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runbookToDelete, setRunbookToDelete] = useState<
    string | number | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const pollRef = useRef<number | null>(null);

  const fetchAll = async () => {
    try {
      const list = await api.runbooks(true /* include archived */);
      setRunbooks(list.map(hydrate));
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load runbooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // While any runbook is still PROCESSING, poll every 3s so the UI updates
  // when ingestion completes in the background.
  useEffect(() => {
    const stillProcessing = runbooks.some((r) => r.status === "PROCESSING");
    if (stillProcessing && pollRef.current == null) {
      pollRef.current = window.setInterval(fetchAll, 3000);
    } else if (!stillProcessing && pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [runbooks]);

  const stats = useMemo(() => {
    const total = runbooks.filter((r) => r.status !== "ARCHIVED").length;
    const active = runbooks.filter((r) => r.status === "ACTIVE").length;
    const processing = runbooks.filter((r) => r.status === "PROCESSING").length;
    const indexed = runbooks.reduce((acc, r) => acc + (r.chunk_count || 0), 0);
    return { total, active, processing, indexed };
  }, [runbooks]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = runbooks.filter((r) => {
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (filter === "ALL") return r.status !== "ARCHIVED";
      return r.status === filter;
    });

    if (filter === "ALL") {
      const order: Record<string, number> = {
        PROCESSING: 1,
        ACTIVE: 2,
        FAILED: 3,
      };
      return [...result].sort(
        (a, b) => (order[a.status] || 99) - (order[b.status] || 99),
      );
    }
    return result;
  }, [runbooks, search, filter]);

  const selectedRunbook = useMemo(
    () =>
      runbooks.find((r) => String(r.id) === String(selectedRunbookId)) || null,
    [runbooks, selectedRunbookId],
  );

  const handleSaved = (rb: Runbook) => {
    setRunbooks((prev) => [hydrate(rb), ...prev]);
  };

  const handleArchive = async (id: string | number) => {
    try {
      const updated = await api.archiveRunbook(id);
      setRunbooks((prev) =>
        prev.map((r) => (String(r.id) === String(id) ? hydrate(updated) : r)),
      );
    } catch (e: any) {
      setError(e?.message || "Archive failed");
    }
  };

  const targetRb = useMemo(
    () =>
      runbooks.find((r) => String(r.id) === String(runbookToDelete)) || null,
    [runbooks, runbookToDelete],
  );

  const confirmDelete = async () => {
    if (runbookToDelete == null) return;
    setDeleting(true);
    try {
      await api.deleteRunbook(runbookToDelete);
      setRunbooks((prev) =>
        prev.filter((r) => String(r.id) !== String(runbookToDelete)),
      );
      if (String(selectedRunbookId) === String(runbookToDelete))
        setSelectedRunbookId(null);
      setRunbookToDelete(null);
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB]">
      {loading ? (
        <Loading message="Fetching runbooks..." />
      ) : (
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
          {/* Header strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/60">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen
                  className="w-5 h-5 text-gray-700"
                  strokeWidth={2.25}
                />
                <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                  Runbooks
                </h1>
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Upload PDF/DOCX runbooks · stored locally · indexed into the RAG
                vector store
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAll}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm"
                title="Refresh"
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", loading && "animate-spin")}
                />
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4 text-sky-400" strokeWidth={2.5} />
                Upload Runbook
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Total Runbooks"
              value={stats.total}
              icon={BookOpen}
              accent="violet"
              sub="tracked operational SOPs"
            />
            <StatCard
              label="Active"
              value={stats.active}
              icon={CheckCircle2}
              accent="emerald"
              sub="indexed in vector DB"
            />
            <StatCard
              label="Processing"
              value={stats.processing}
              icon={Loader2}
              accent="amber"
              sub="being chunked & embedded"
            />
            <StatCard
              label="Indexed Chunks"
              value={stats.indexed}
              icon={Sparkles}
              accent="cyan"
              sub="vectors in Chroma"
            />
          </div>

          {/* Toolbar */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E5E7EB] p-3 rounded-xl shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search runbooks, tags, or descriptions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9FAFB] border border-transparent rounded-lg focus:border-gray-300 focus:bg-white outline-none transition-colors"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1 bg-[#F9FAFB] p-1 rounded-lg border border-gray-100">
                {(
                  [
                    "ALL",
                    "ACTIVE",
                    "PROCESSING",
                    "FAILED",
                    "ARCHIVED",
                  ] as FilterTab[]
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap",
                      filter === tab
                        ? "bg-[#111827] text-white shadow-sm"
                        : "text-[#6B7280] hover:bg-gray-200/50 hover:text-[#111827]",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Table / empty */}
            {loading ? (
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center shadow-sm">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                <p className="text-xs text-gray-500 mt-3">Loading runbooks…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center shadow-sm flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4 shadow-inner">
                  <FileText className="w-6 h-6 text-gray-400 stroke-1" />
                </div>
                <h3 className="text-base font-bold text-[#111827]">
                  No Runbooks Found
                </h3>
                <p className="text-xs text-[#6B7280] max-w-sm mt-1.5 leading-relaxed">
                  Upload a PDF or DOCX so AI agents can retrieve it during
                  incident diagnosis.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-400" /> Upload first
                  runbook
                </button>
              </div>
            ) : (
              <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Runbook
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Category
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Source
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Chunks
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Status
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Updated
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {filtered.map((rb) => (
                      <tr
                        key={rb.id}
                        onClick={() => setSelectedRunbookId(rb.id)}
                        className="hover:bg-[#F9FAFB] transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 min-w-[220px]">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#111827] group-hover:text-blue-600 transition-colors">
                                {rb.title}
                              </span>
                              {rb.rag_enabled && (
                                <span
                                  className="bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-bold uppercase px-1.5 py-0.2 rounded"
                                  title="Indexed in vector DB"
                                >
                                  RAG
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#9CA3AF] font-medium mt-0.5 line-clamp-1 max-w-md">
                              {rb.description || rb.source_filename}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                            {rb.category}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[11px] font-mono font-semibold text-gray-600 bg-gray-50 border border-gray-200/60 px-1.5 py-0.5 rounded">
                            {rb.source}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-[11px] font-semibold text-gray-700">
                          {rb.chunk_count ?? 0}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1 border",
                              rb.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : rb.status === "PROCESSING"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : rb.status === "FAILED"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-gray-50 text-gray-400 border-gray-200",
                            )}
                          >
                            {rb.status === "PROCESSING" && (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            )}
                            {rb.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-[11px] font-medium text-[#9CA3AF]">
                          {timeAgo(
                            rb.last_updated ||
                              rb.updated_at ||
                              rb.created_at ||
                              "",
                          )}
                        </td>

                        <td
                          className="px-6 py-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedRunbookId(rb.id)}
                              className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] hover:text-[#111827] inline-flex items-center gap-1 transition-all"
                            >
                              view
                            </button>
                            <button
                              onClick={() => setRunbookToDelete(rb.id)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                              title="Delete runbook + vectors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        </main>
      )}

      {/* Modals */}
      <CreateRunbookModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={handleSaved}
      />

      <RunbookDetailPanel
        runbook={selectedRunbook}
        onClose={() => setSelectedRunbookId(null)}
        onArchive={handleArchive}
      />

      <AnimatePresence>
        {runbookToDelete != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">
                    Delete Operational Runbook?
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                    You are about to permanently delete{" "}
                    <span className="font-semibold text-gray-900">
                      "{targetRb?.title}"
                    </span>
                    . This will immediately purge its indexed vector chunks from
                    the RAG retrieval database. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRunbookToDelete(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#111827] disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…
                    </>
                  ) : (
                    "Permanently Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
