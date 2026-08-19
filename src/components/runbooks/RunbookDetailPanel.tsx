import React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  FileText,
  Download,
  Archive,
  Edit3,
  CheckCircle2,
  Sparkles,
  Layers,
  ShieldCheck,
  GitCommit,
  HelpCircle,
  ExternalLink,
  Activity,
} from "lucide-react";
import type { Runbook } from "../../types";
import { timeAgo, cn } from "../../lib/utils";

interface Props {
  runbook: Runbook | null;
  onClose: () => void;
  onArchive?: (id: string | number) => void;
  onUpdateStatus?: (id: string | number, newStatus: string) => void;
}

export function RunbookDetailPanel({
  runbook,
  onClose,
  onArchive,
  onUpdateStatus,
}: Props) {
  if (!runbook) return null;

  const handleDownload = () => {
    // Generate dummy text blob file to simulate download
    const content = `# ${runbook.title}\n\nCategory: ${runbook.category}\nRisk Tier: ${runbook.risk_level}\nLast Updated: ${runbook.last_updated}\n\n## Description\n${runbook.description}\n\n## Remediation Steps\n${runbook.steps.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${runbook.title.replace(/\s+/g, "_").toLowerCase()}_sop.${runbook.source.toLowerCase() === "markdown" ? "md" : "txt"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-60 flex justify-end"
      >
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-2xl bg-app-surface h-full flex flex-col border-l border-app-border shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Panel */}
          <div className="p-6 border-b border-app-border bg-app-bg flex flex-col gap-4 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#111827] flex items-center justify-center text-white shrink-0 mt-0.5">
                  <FileText className="w-5 h-5 text-sky-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                      {runbook.category}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                        runbook.risk_level === "Low"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : runbook.risk_level === "Medium"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {runbook.risk_level} Risk
                    </span>
                    {runbook.ai_confidence_score && (
                      <span className="text-[10px] font-bold text-app-brand bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 fill-blue-600" />{" "}
                        {runbook.ai_confidence_score}% AI Confidence
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-app-primary mt-1.5 truncate">
                    {runbook.title}
                  </h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Updated by{" "}
                    <span className="text-gray-700 font-medium">
                      {runbook.last_updated_by}
                    </span>{" "}
                    · {timeAgo(runbook.last_updated)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-app-primary rounded-lg hover:bg-gray-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Context Badges */}
            {/* <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-app-border/60"> */}
            {/* <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                Context:
              </span> */}

            {/* Tooltip trigger wrapper */}
            {/* <div className="relative group/badge">
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 cursor-help transition-colors ${
                    runbook.rag_enabled
                      ? "bg-blue-50 text-blue-700 border border-blue-100"
                      : "bg-app-surface text-gray-400 border border-app-border"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-sky-500" /> RAG Enabled
                </span>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/badge:block z-50 w-64 p-2 bg-gray-900 text-white text-[11px] leading-tight rounded-lg shadow-xl font-sans pointer-events-none animate-in fade-in duration-200">
                  This runbook can be retrieved by AI agents during incident
                  remediation.
                  <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
                </div>
              </div> */}

            {/* <span
                className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${
                  runbook.ai_approved
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> AI
                Approved
              </span> */}

            {/* <span
                className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${
                  runbook.human_verified
                    ? "bg-purple-50 text-purple-700 border border-purple-100"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}
              >
                <ShieldCheck className="w-3 h-3" />{" "}
                {runbook.human_verified ? "Human Verified" : "Unverified Draft"}
              </span> */}
            {/* </div> */}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Description Card */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-1.5">
                Description
              </h4>
              <p className="text-xs text-app-secondary leading-relaxed bg-app-surface/50 p-3 rounded-lg border border-app-border">
                {runbook.description}
              </p>
            </div>

            {/* Additional Metadata Grid */}
            {/* <div className="border-t border-app-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-gray-400" /> Associated
                  Target Systems
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {runbook.associated_systems.map((sys, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-app-surface text-app-primary px-2.5 py-1 rounded-md border border-app-border/60"
                    >
                      {sys}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-gray-400" /> Linked
                  Incidents Usage (
                  {runbook.linked_incidents_count ??
                    runbook.last_incidents_used.length}
                  )
                </h4>
                {runbook.last_incidents_used.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No historical incident remediations tracked yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {runbook.last_incidents_used.map((inc, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-bold text-app-brand bg-blue-50 hover:underline cursor-pointer px-2 py-0.5 rounded border border-blue-100 inline-flex items-center gap-1"
                      >
                        {inc} <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div> */}

            {/* Version History */}
            {/* <div className="border-t border-app-border pt-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2.5 flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-gray-400" /> Version
                Control Releases
              </h4>
              <div className="flex flex-wrap gap-2">
                {runbook.version_history.map((ver, idx) => (
                  <div
                    key={idx}
                    className={`px-2.5 py-1 rounded text-xs font-mono border ${
                      idx === 0
                        ? "bg-gray-900 text-white font-bold border-gray-900"
                        : "bg-app-surface text-app-secondary border-app-border"
                    }`}
                  >
                    {ver} {idx === 0 && "· Latest"}
                  </div>
                ))}
              </div>
            </div> */}
          </div>

          {/* Actions Footer */}
          <div className="p-4 bg-app-bg border-t border-app-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const s = runbook.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
                  if (onUpdateStatus) onUpdateStatus(runbook.id, s);
                }}
                className="px-3 py-1.5 bg-app-surface border border-app-border hover:bg-app-bg text-gray-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                title="Toggle Activation State"
              >
                <Edit3 className="w-3.5 h-3.5 text-app-secondary" />
                {runbook.status === "ACTIVE" ? "Set to Draft" : "Activate SOP"}
              </button>

              {onArchive && runbook.status !== "ARCHIVED" && (
                <button
                  onClick={() => {
                    onArchive(runbook.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-app-surface border border-app-border hover:bg-red-50 text-app-secondary hover:text-red-600 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" /> Archive
                </button>
              )}
            </div>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-[#111827] hover:bg-app-hover text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Download Guide
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
