import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Plus,
  FileText,
  Upload,
  Trash2,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  Wand2,
  ArrowLeft,
} from "lucide-react";
import { api } from "../../services/api";
import type { Runbook, RunbookCategory, RunbookSuggestion } from "../../types";
import { RUNBOOK_CATEGORIES } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (runbook: Runbook) => void;
}

type Phase = "pick" | "analyzing" | "review";

/**
 * Two-phase wizard:
 *   pick      → user picks a file
 *   analyzing → backend extracts text and consults the Sentry Assistant for metadata
 *   review    → form is pre-filled, user can edit, then clicks "Upload & Index"
 *
 * Categories are constrained to ADF / Databricks / Git / AWS Glue.
 */
export function CreateRunbookModal({ open, onClose, onSaved }: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);

  // File & analysis state
  const [file, setFile] = useState<File | null>(null);
  const [suggestion, setSuggestion] = useState<RunbookSuggestion | null>(null);

  // Editable fields (pre-filled from suggestion)
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RunbookCategory>("ADF");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<string[]>([""]);
  const [riskLevel, setRiskLevel] = useState<"Low" | "Medium" | "High">(
    "Medium",
  );
  const [tagsInput, setTagsInput] = useState("");
  const [ragEnabled, setRagEnabled] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPhase("pick");
    setError(null);
    setFile(null);
    setSuggestion(null);
    setTitle("");
    setCategory("ADF");
    setDescription("");
    setSteps([""]);
    setRiskLevel("Medium");
    setTagsInput("");
    setRagEnabled(true);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting || phase === "analyzing") return;
    reset();
    onClose();
  };

  // ───────────────────────────────────────────────────────────────────
  // Phase 1 → Phase 2: send file to LLM and populate the form
  // ───────────────────────────────────────────────────────────────────
  const handleFilePicked = async (f: File) => {
    setFile(f);
    setError(null);
    setPhase("analyzing");
    try {
      const s = await api.analyzeRunbook(f);
      setSuggestion(s);

      // Pre-fill editable form fields from LLM output
      setTitle(s.title);
      setCategory(
        (RUNBOOK_CATEGORIES.includes(s.category as RunbookCategory)
          ? s.category
          : "ADF") as RunbookCategory,
      );
      setDescription(s.description);
      setSteps(s.steps.length ? s.steps : [""]);
      setRiskLevel(s.risk_level);
      setTagsInput(s.tags.join(", "));
      setPhase("review");
    } catch (err: any) {
      setError(err?.message || "Failed to analyze the file");
      setPhase("pick");
      setFile(null);
    }
  };

  // ───────────────────────────────────────────────────────────────────
  // Phase 2: commit → backend stores & ingests
  // ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!file) {
      setError("No file selected");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const stepsBody = steps
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n");

      // We pack the user-edited steps into the description (separated by a
      // marker) so the backend stores them as part of the runbook text. The
      // file itself is still the canonical source for vector indexing.
      const descriptionWithSteps = stepsBody
        ? `${description.trim()}\n\nSteps:\n${stepsBody}`
        : description.trim();

      const created = await api.uploadRunbook({
        file,
        title: title.trim(),
        category,
        description: descriptionWithSteps,
        risk_level: riskLevel,
        tags,
        rag_enabled: ragEnabled,
      });

      onSaved(created);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────
  // Step helpers (used in review phase)
  // ───────────────────────────────────────────────────────────────────
  const addStep = () => setSteps([...steps, ""]);
  const updateStep = (i: number, v: string) => {
    const n = [...steps];
    n[i] = v;
    setSteps(n);
  };
  const removeStep = (i: number) => {
    if (steps.length <= 1) return setSteps([""]);
    setSteps(steps.filter((_, idx) => idx !== i));
  };

  // ───────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4 custom-scrollbar"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-2xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111827] flex items-center justify-center text-white shadow-md">
                  {phase === "review" ? (
                    <Wand2 className="w-5 h-5 text-sky-400" />
                  ) : (
                    <FileText className="w-5 h-5 text-sky-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">
                    {phase === "pick" && "Upload Operational Runbook"}
                    {phase === "analyzing" && "Analyzing document…"}
                    {phase === "review" && "Review AI Suggestions"}
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    {phase === "pick" &&
                      "Drop a file and the Sentry Assistant will pre-draft the catalogue metadata for you"}
                    {phase === "analyzing" &&
                      "Analyzing content… the Assistant is extracting an operational summary…"}
                    {phase === "review" &&
                      "You can edit anything before it is indexed into the RAG store"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={submitting || phase === "analyzing"}
                className="text-[#9CA3AF] hover:text-[#111827] transition-colors p-1.5 rounded-lg hover:bg-gray-200/50 disabled:opacity-40"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* ─── PHASE 1: PICK FILE ─────────────────────────────── */}
              {phase === "pick" && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                    Source File (PDF / DOCX / MD / TXT)
                  </label>
                  <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-10 text-center bg-[#F9FAFB] hover:bg-gray-50/50 transition-colors relative">
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".pdf,.docx,.md,.txt"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFilePicked(f);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Upload file"
                    />
                    <div className="flex flex-col items-center gap-3 pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                        <Upload className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">
                          Drag &amp; drop a runbook here, or click to browse
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          The Sentry Assistant will analyze the document to pre-fill the
                          title, description, and steps for you.
                        </p>
                        <p className="text-[12px] text-gray-500 mt-1">
                          PDF, DOCX, Markdown, or TXT · 20 MB max
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── PHASE 1.5: ANALYZING ─────────────────────────── */}
              {phase === "analyzing" && (
                <div className="py-16 flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-100" />
                    <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-[#111827] animate-spin absolute inset-0" />
                    <Wand2 className="w-6 h-6 text-sky-500 absolute inset-0 m-auto" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#111827]">
                      Reading <span className="font-mono">{file?.name}</span>
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      Extracting insights · the Sentry Assistant is drafting a title and
                      steps from your document…
                    </p>
                  </div>
                </div>
              )}

              {/* ─── PHASE 2: REVIEW & EDIT ───────────────────────── */}
              {phase === "review" && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {suggestion?.relevance_score !== undefined && (
                    <div
                      className={`text-[11px] px-3 py-2 rounded-lg flex items-start gap-2 border ${
                        suggestion.relevance_score >= 75
                          ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                          : "bg-rose-50/50 border-rose-100 text-rose-900"
                      }`}
                    >
                      {suggestion.relevance_score >= 75 ? (
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-500" />
                      )}
                      <span>
                        <strong>Relevance Score: {suggestion.relevance_score}/100</strong>
                        {suggestion.relevance_score < 75
                          ? " — Document relevance is below the 75 threshold. Uploading is disabled."
                          : " — Good quality document detected. Ready for indexing."}
                      </span>
                    </div>
                  )}

                  {/* Title + Category */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                        Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) =>
                          setCategory(e.target.value as RunbookCategory)
                        }
                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white cursor-pointer"
                      >
                        {RUNBOOK_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white resize-none"
                    />
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                        Steps (extracted by AI — edit as needed)
                      </label>
                      <button
                        type="button"
                        onClick={addStep}
                        className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add step
                      </button>
                    </div>
                    <div className="space-y-2">
                      {steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="w-6 h-8 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 select-none pt-1">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            placeholder={`Step ${idx + 1}…`}
                            value={step}
                            onChange={(e) => updateStep(idx, e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-gray-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeStep(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 mt-0.5"
                            title="Delete step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="oom, executor, shuffle-skew"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between gap-3 shrink-0">
              {phase === "review" ? (
                <button
                  type="button"
                  onClick={() => {
                    setPhase("pick");
                    setFile(null);
                    setSuggestion(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  disabled={submitting}
                  className="text-[#6B7280] hover:text-[#111827] text-xs font-bold uppercase tracking-wider flex items-center gap-1 disabled:opacity-40"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Pick a different file
                </button>
              ) : (
                <div /> // spacer
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting || phase === "analyzing"}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#111827] disabled:opacity-40"
                >
                  Cancel
                </button>
                {phase === "review" && (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={submitting || (suggestion?.relevance_score !== undefined && suggestion.relevance_score < 75)}
                    className="px-5 py-2 bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-[#111827] flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Upload &amp; Index
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
