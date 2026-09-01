import { useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  History,
  RefreshCw,
  RotateCw,
  Sparkles,
  Terminal,
  Wrench,
  Activity,
  CheckCircle2,
  Clock,
  Database,
  Info,
  List,
  User,
  Copy,
  Check,
  Target,
  Zap,
  X,
  Search,
  Shield,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Header } from "../Header";
import { Loading } from "../Loading";
import { api } from "../../services/api";
import { cn } from "../../lib/utils";
import type { Pipeline } from "../../types";

interface RunInvestigationProps {
  runId: string;
  pipeline?: Pipeline;
  onBack: () => void;
}

export function RunInvestigation({
  runId,
  pipeline,
  onBack,
}: RunInvestigationProps) {
  const [run, setRun] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [logFilter, setLogFilter] = useState("ALL");
  const [showLogs, setShowLogs] = useState(false);
  const [showPatch, setShowPatch] = useState(true);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string; type?: "success" | "info" | "error" } | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch essential data first
      const [runData, logsData] = await Promise.all([
        api.run(runId),
        api.runLogs(runId),
      ]);
      setRun(runData);
      setLogs(logsData);

      // Attempt to fetch analysis, but don't fail if it's missing (404)
      try {
        const analysisData = await api.runAnalysis(runId);
        setAnalysis(analysisData);
        setAnalysisMessage(null);
      } catch (ae: any) {
        console.warn("No analysis found for this run yet.");
        setAnalysis(null);
        // Extract message from response if available
        setAnalysisMessage(
          ae.response?.data?.detail || "No analysis available for this run yet",
        );
      }
    } catch (e) {
      console.error("Failed to load run forensic data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [runId]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const triggerAnalysis = async () => {
    setAnalyzing(true);
    try {
      // If we already have analysis, we want to force re-analysis
      const result = await api.triggerRunAnalysis(runId, !!analysis);
      setAnalysis(result);
      const completeness = result?.raw_response?.telemetry_completeness;
      const statusLabel = completeness?.level === "COMPLETE" ? "Complete Diagnosis" : completeness?.level === "PARTIAL" ? "Partial Diagnosis" : "Complete Diagnosis";
      const detailMsg = completeness?.reason || "Pipeline forensic investigation and root-cause synthesis completed.";
      setToast({
        title: statusLabel,
        message: detailMsg,
        type: "success"
      });
      setTimeout(() => setToast(null), 5000);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === "ALL") return true;
    return l.level === logFilter;
  });

  if (loading) {
    return <Loading message="analyzing run forensics..." />;
  }

  if (!run) {
    return (
      <div className="flex-1 flex items-center justify-center bg-app-bg">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-app-secondary mx-auto mb-4" />
          <h3 className="text-sm font-bold text-app-primary mb-2">
            Run data not found
          </h3>
          <button onClick={onBack} className="btn-secondary">
            Back to Pipeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-app-bg relative">
      {/* Complete Diagnosis Toaster */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-app-surface/95 backdrop-blur-md p-4 text-app-primary shadow-2xl shadow-emerald-950/20 ring-1 ring-emerald-500/20 animate-in fade-in slide-in-from-top-4 max-w-sm w-full pointer-events-auto">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="flex-1 pt-0.5 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {toast.title}
            </p>
            <p className="mt-0.5 text-xs text-app-secondary leading-relaxed font-medium">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="rounded-lg p-1 text-app-secondary hover:text-app-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Back Action */}
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 bg-app-surface border border-app-border rounded text-[10px] font-bold uppercase tracking-[0.15em] text-app-secondary hover:bg-app-bg transition-all shadow-sm"
            >
              <ArrowLeft size={12} />
              Back to Pipeline
            </button>
          </div>

          {/* Status Strip */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest",
                  run.status === "FAILED"
                    ? "bg-app-surface text-rose-400 border border-rose-500/30"
                    : "bg-app-surface text-emerald-400 border border-app-brand/30",
                )}
              >
                {run.status}
              </span>
              <span className="font-mono text-xs text-app-secondary">
                {run.started_at &&
                  format(
                    new Date(
                      run.started_at.endsWith("Z")
                        ? run.started_at
                        : `${run.started_at}Z`,
                    ),
                    "dd/MM/yyyy HH:mm:ss",
                  )}
                {run.duration_seconds != null &&
                  ` · ${run.duration_seconds.toFixed(1)}s`}
              </span>
            </div>
            {(run.status === "FAILED" || analysis) && (
              <button
                onClick={triggerAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2 bg-app-brand text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded hover:bg-[#E04B0E] transition-all shadow-md disabled:opacity-50"
              >
                {analyzing ? (
                  <RotateCw size={14} className="animate-spin" />
                ) : (
                  <Brain size={14} />
                )}
                {analysis ? "Re-Thinking" : "Think on Failure"}
              </button>
            )}
          </div>

          {/* Error Message */}
          {run.error_message && (
            <div className="bg-app-input border border-rose-500/30 rounded-xl p-4 shadow-inner">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={16}
                  className="text-rose-400 mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">
                    Error Message
                  </div>
                  <div className="text-sm font-mono text-app-primary wrap-break-word">
                    {run.error_message}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LLM Analysis Panel */}
          {analysis ? (
            <AnalysisPanel analysis={analysis} />
          ) : (
            analysisMessage && (
              <div className="bg-app-surface border border-app-border rounded-xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-app-surface border border-app-border blur-3xl rounded-full pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-md bg-app-surface border border-sky-500/30 text-sky-400">
                    <Sparkles size={18} className="text-app-brand" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-app-primary">
                      {analysisMessage}
                    </div>
                    <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest">
                      AI diagnosis has not been triggered for this run
                    </div>
                  </div>
                </div>
                <button
                  onClick={triggerAnalysis}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-app-btn text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-app-hover transition-all shadow-sm disabled:opacity-50"
                >
                  {analyzing ? (
                    <RotateCw size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Run AI Diagnosis
                </button>
              </div>
            )
          )}

          {/* Logs Viewer */}
          <div className="bg-app-surface border border-app-border rounded-xl shadow-sm overflow-hidden">
            <div className={cn("px-5 py-3 flex items-center justify-between flex-wrap gap-3", showLogs && "border-b border-app-border")}>
              <button
                type="button"
                onClick={() => setShowLogs((v) => !v)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left group"
                title={showLogs ? "Collapse Logs" : "Expand Logs"}
              >
                <span className="text-app-secondary group-hover:text-app-primary transition-colors">
                  {showLogs ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <Terminal size={16} className="text-app-brand" />
                <h3 className="text-sm font-bold text-app-primary">
                  Logs{" "}
                  <span className="text-xs font-mono text-app-secondary">
                    ({filteredLogs.length})
                  </span>
                </h3>
              </button>
              {showLogs && (
                <div className="flex items-center gap-1">
                  {["ALL", "ERROR", "WARNING", "INFO"].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLogFilter(lvl)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border transition-all",
                        logFilter === lvl
                          ? "border-app-brand text-app-brand bg-app-surface border border-app-border"
                          : "border-app-border text-app-secondary hover:border-[#9CA3AF]",
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {showLogs && (
              <div className="bg-app-input p-5 font-mono text-[11px] max-h-[600px] overflow-auto custom-scrollbar">
                {filteredLogs.length === 0 ? (
                  <div className="text-app-secondary italic text-sm py-4 text-center">
                    No logs available for this run.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredLogs.map((l, i) => (
                      <div
                        key={i}
                        className="flex gap-3 hover:bg-app-surface/5 px-2 py-0.5 rounded transition-colors group"
                      >
                        <span className="text-app-secondary shrink-0 select-none">
                          {format(new Date(l.timestamp), "dd/MM/yyyy HH:mm:ss")}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 w-16 font-bold",
                            l.level === "ERROR"
                              ? "text-rose-500"
                              : l.level === "WARNING"
                                ? "text-amber-500"
                                : "text-emerald-500",
                          )}
                        >
                          [{l.level}]
                        </span>
                        {l.source && (
                          <span className="text-blue-600 dark:text-blue-400 shrink-0 max-w-[150px] truncate">
                            {l.source}
                          </span>
                        )}
                        <span
                          className={cn(
                            "flex-1 whitespace-pre-wrap wrap-break-word",
                            l.level === "ERROR"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-app-primary",
                          )}
                        >
                          {l.message}
                        </span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function repairJson(jsonStr: string) {
  let repaired = jsonStr.trim();
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") stack.push("}");
      else if (char === "[") stack.push("]");
      else if (char === "}" || char === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  if (inString) repaired += '"';

  // Remove trailing comma if it exists after repair (e.g., from truncated object)
  repaired = repaired.replace(/,\s*$/, "");

  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

function parseRootCause(rootCause: string) {
  try {
    if (!rootCause || typeof rootCause !== "string") return null;

    let jsonStr = rootCause.trim();
    // Only attempt JSON parsing if it actually looks like JSON/code block
    const match = jsonStr.match(/```(?:json)?\n?([\s\S]*?)```/i);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
      return null;
    }

    try {
      return JSON.parse(jsonStr);
    } catch {
      const repaired = repairJson(jsonStr);
      return JSON.parse(repaired);
    }
  } catch {
    return null;
  }
}

function StructuredAnalysis({ data: rawData }: { data: any }) {
  // Normalize data: Some LLMs return everything inside a 'pipeline_status' or 'analysis' key
  const data = rawData.pipeline_status || rawData.analysis || rawData;

  const renderValue = (val: any, fallback: string = "N/A") => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === "object") {
      if (val.name && typeof val.name === "string") return val.name;
      if (val.id && typeof val.id === "string") return val.id;
      return JSON.stringify(val);
    }
    return String(val);
  };

  // Normalized data mapping for resilience
  const metadata = data.metadata || data.error?.metadata || {};
  const creator = metadata.creator_user_name || metadata.owner || "System";
  const source = data.source || data.provider || "N/A";
  const pipeline = data.pipeline_name || data.pipeline || "Unknown Pipeline";
  const task =
    data.error?.task ||
    metadata.tasks?.[0] ||
    metadata.failed_tasks?.[0] ||
    "N/A";
  const severity =
    data.additional_context?.severity || data.severity || "normal";

  const analysisObj = data.analysis || {};
  const summary =
    analysisObj.summary || data.error?.top_level_error || data.summary;
  const detailedError =
    analysisObj.detailed_error || data.error?.detailed_error;

  // Normalize recommended actions into a flat array
  let actions = [];
  const rawActions =
    analysisObj.recommendations ||
    data.recommended_actions ||
    analysisObj.next_steps;

  if (Array.isArray(rawActions)) {
    actions = rawActions.map((a: any) => {
      if (typeof a === "string")
        return { action: a, description: "AI Recommended Action" };
      return a;
    });
  } else if (typeof rawActions === "object" && rawActions !== null) {
    actions = Object.values(rawActions).flat();
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-app-bg border border-app-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
            <Database size={12} className="text-app-brand" /> Source
          </div>
          <div className="text-sm font-bold text-app-primary">
            {renderValue(source)}
          </div>
          <div className="text-[10px] font-medium text-app-secondary mt-1 truncate">
            {renderValue(pipeline)}
          </div>
        </div>

        <div className="bg-app-bg border border-app-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
            <Activity size={12} className="text-amber-500" /> Task
          </div>
          <div className="text-sm font-bold text-app-primary truncate">
            {renderValue(task)}
          </div>
          <div className="text-[10px] font-medium text-rose-600 mt-1 uppercase tracking-tighter">
            {renderValue(data.error?.status || data.status, "FAILED")}
          </div>
        </div>

        <div className="bg-app-bg border border-app-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
            <User size={12} className="text-emerald-500" /> Creator
          </div>
          <div className="text-sm font-bold text-app-primary truncate">
            {renderValue(creator).split("@")[0]}
          </div>
          <div className="text-[10px] font-medium text-app-secondary mt-1 truncate">
            {renderValue(creator)}
          </div>
        </div>

        <div className="bg-app-bg border border-app-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
            <Info size={12} className="text-purple-500" /> Severity
          </div>
          <div
            className={cn(
              "inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
              severity === "high"
                ? "bg-app-surface text-rose-400 border-rose-500/30"
                : "bg-amber-50 text-amber-600 border-amber-100",
            )}
          >
            {renderValue(severity, "Normal")}
          </div>
        </div>
      </div>

      {/* Error Details Section */}
      <div className="bg-rose-50/30 border border-rose-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2">
          <AlertTriangle size={14} className="text-rose-400" />
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
            Deep Error Analysis
          </span>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
              Incident Summary
            </div>
            <div className="text-sm font-mono text-app-primary bg-app-surface border border-rose-100 p-4 rounded-xl shadow-inner leading-relaxed">
              {renderValue(summary, "No top-level error message provided.")}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
              Contextual Findings
            </div>
            {typeof detailedError === "object" && detailedError !== null ? (
              <div className="space-y-3">
                <div className="text-sm text-app-secondary leading-relaxed italic">
                  {renderValue(
                    detailedError.message ||
                      detailedError.error ||
                      "No detailed message provided.",
                  )}
                </div>
                {detailedError.logs && (
                  <div className="bg-app-input text-app-secondary p-3 rounded-lg font-mono text-[10px] overflow-x-auto border border-app-border shadow-inner">
                    <div className="text-[8px] font-bold text-app-secondary uppercase tracking-widest mb-2 border-b border-app-border pb-1">
                      Technical Logs
                    </div>
                    {detailedError.logs}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-app-secondary leading-relaxed italic">
                {renderValue(
                  detailedError,
                  "No detailed explanation available.",
                )}
              </div>
            )}

            {/* Render structured error logs if they exist at error.logs level */}
            {Array.isArray(data.error?.logs) && data.error.logs.length > 0 && (
              <div className="mt-4 bg-app-input rounded-xl overflow-hidden border border-app-border shadow-lg">
                <div className="px-4 py-2 border-b border-app-border bg-[#1F2937]/30 flex items-center gap-2">
                  <Terminal size={10} className="text-blue-400" />
                  <span className="text-[8px] font-bold text-app-secondary uppercase tracking-widest">
                    Forensic Log Extract
                  </span>
                </div>
                <div className="p-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {data.error.logs.map((log: any, lIdx: number) => (
                    <div
                      key={lIdx}
                      className="flex gap-3 font-mono text-[10px] group"
                    >
                      <span className="text-app-secondary shrink-0">
                        {log.timestamp?.split("T")[1] || "LOG"}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-bold",
                          log.level === "ERROR"
                            ? "text-rose-500"
                            : "text-app-brand",
                        )}
                      >
                        [{log.level}]
                      </span>
                      <span className="text-gray-300 leading-relaxed">
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended Actions Section */}
      {actions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-app-secondary uppercase tracking-widest">
            <Wrench size={14} className="text-app-brand" /> Forensic
            Recommendations
          </div>
          <div className="grid grid-cols-1 gap-4">
            {actions.map((action: any, idx: number) => (
              <div
                key={idx}
                className="group bg-app-surface border border-app-border rounded-2xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-app-surface border border-app-border text-app-brand flex items-center justify-center font-bold text-sm border border-app-border/50 group-hover:bg-app-hover group-hover:text-app-primary transition-colors">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-app-primary">
                          {renderValue(action.action, "Recommended Action")}
                        </h4>
                        <p className="text-[11px] text-app-secondary">
                          {renderValue(action.description)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all",
                        action.priority === "high"
                          ? "bg-app-surface text-rose-400 border border-rose-500/30"
                          : action.priority === "medium"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-app-bg text-app-secondary border-app-border",
                      )}
                    >
                      {renderValue(action.priority || "Action Item")}
                    </div>
                  </div>

                  {Array.isArray(action.steps) && action.steps.length > 0 && (
                    <div className="pl-11 space-y-3">
                      <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <List size={10} /> Execution Steps
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {action.steps.map((step: string, sIdx: number) => (
                          <div
                            key={sIdx}
                            className="flex items-start gap-3 p-2.5 rounded-lg bg-app-bg border border-app-border group-hover:bg-app-surface group-hover:border-app-border/50 transition-colors"
                          >
                            <CheckCircle2
                              size={12}
                              className="text-emerald-500 mt-0.5 shrink-0"
                            />                            <span className="text-xs text-app-secondary leading-snug">
                              {renderValue(step)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight Footer */}
      {(data.additional_context?.potential_causes?.length > 0 ||
        data.additional_context?.impact ||
          data.timestamp) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-app-border">
          <div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" /> Potential Causes
            </div>
            <div className="flex flex-wrap gap-2">
              {data.additional_context?.potential_causes?.map(
                (cause: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-100 flex items-center gap-2"
                  >
                    <div className="w-1 h-1 rounded-full bg-amber-400" />
                    {renderValue(cause)}
                  </span>
                ),
              )}
              {(!data.additional_context?.potential_causes ||
                data.additional_context.potential_causes.length === 0) && (
                <span className="text-[10px] text-app-secondary italic">
                  No specific causes flagged.
                </span>
              )}
            </div>
          </div>
          {data.additional_context?.impact && (
            <div className="bg-app-surface border border-app-border/50 rounded-2xl p-5">
              <div className="text-[10px] font-bold text-app-brand uppercase tracking-widest mb-2">
                Business Impact Assessment
              </div>
              <p className="text-xs text-app-secondary leading-relaxed italic">
                "{renderValue(data.additional_context.impact)}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: any }) {
  const [showPatch, setShowPatch] = useState(true);
  const [showWhy, setShowWhy] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showInvestigationTimeline, setShowInvestigationTimeline] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [expandedFixes, setExpandedFixes] = useState<Record<number, boolean>>({});
  const toggleExpandFix = (stepNum: number) => setExpandedFixes(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    5: true,
    6: true,
    7: true,
    8: true,
  });
  const toggleSection = (num: number) => setCollapsedSections(prev => ({ ...prev, [num]: !prev[num] }));
  const logsEndRef = useRef<HTMLDivElement>(null);
  const confidence = analysis.confidence ?? 0;

  const raw = analysis.raw_response || {};
  const explain = raw.confidence_explanation as
    | {
        score?: number;
        level?: string;
        headline?: string;
        factors?: {
          label: string;
          detail: string;
          contribution: number;
          polarity: "positive" | "negative" | "neutral";
        }[];
        evidence_available?: string[];
        evidence_missing?: string[];
      }
    | undefined;

  const cleanItemText = (val: any): string => {
    if (!val) return "";
    if (typeof val === "object") {
      return String(val.action || val.description || val.title || val.step_description || val.text || JSON.stringify(val));
    }
    let s = String(val).trim();
    if (s.startsWith("{") && (s.includes("'action':") || s.includes('"action":') || s.includes("'description':") || s.includes('"description":'))) {
      try {
        const m = s.match(/['"](?:action|description|title|step_description|text)['"]\s*:\s*['"](.*?)['"]/);
        if (m && m[1]) return m[1];
      } catch {
        // ignore
      }
    }
    return s.replace(/^[\s•→✓✓\-–—]+/, "").replace(/^\d+\.\s*/, "").trim();
  };

  const rcDetails: string[] = Array.isArray(raw.root_cause_details)
    ? raw.root_cause_details.map(cleanItemText).filter(Boolean)
    : [];
  const validation: string[] = Array.isArray(raw.validation_steps)
    ? raw.validation_steps.map(cleanItemText).filter(Boolean)
    : [];
  const classification = raw.classification as
    | { is_known?: boolean; error_type?: string; reason?: string; matched_historical_incidents?: number }
    | undefined;

  // New Industry-Standard RCA fields
  const errorDetails = raw.error_details || "";
  const contributingFactors = (Array.isArray(raw.contributing_factors) ? raw.contributing_factors : []).map(cleanItemText).filter(Boolean);
  const failureMechanism = raw.failure_mechanism || "";
  const impact = typeof raw.impact === "string" ? raw.impact : (raw.impact?.description || "");
  const impactData = raw.impact_data as {
    description?: string;
    operational_impact?: string;
    records_affected?: number | null;
    total_records?: number | null;
    affected_ids?: string[];
    risk_level?: string;
  } | undefined;
  const longTermPrevention = raw.long_term_prevention || "";
  const recommendedActions = (Array.isArray(raw.recommended_actions) ? raw.recommended_actions : []).map(cleanItemText).filter(Boolean);

  // ── New: Blast Radius, Root Cause Classification, Timeline ────────────────
  const blastRadius = raw.blast_radius as {
    records_affected?: number | null;
    total_records?: number | null;
    pct_affected?: number | null;
    failure_categories_count?: number;
    failure_categories?: string[];
    severity_level?: string;
    severity_reason?: string;
    downstream_impact?: string;
  } | null | undefined;

  const rcClassification = raw.root_cause_classification as {
    tier_a_verified_fact?: {
      statement?: string;
      evidence?: string[];
      status?: string;
    };
    tier_b_deterministic_inference?: {
      statement?: string;
      description?: string;
      calculation?: string;
    };
    tier_c_hypothesis?: {
      statement: string;
      confidence_label?: string;
      verification_step?: string;
      caveat?: string;
    }[];
    tier_d_suggested_investigations?: {
      title?: string;
      area?: string;
      action?: string;
      why?: string;
      evidence?: string;
    }[];
    classification_note?: string;
    verified_cause?: { type?: string; description?: string; evidence?: string[] };
    likely_cause?: { type?: string; description?: string; confidence_note?: string } | null;
    contributing?: string[];
    downstream_symptoms?: string[];
  } | null | undefined;

  const telemetryCompleteness = raw.telemetry_completeness as {
    level?: string;
    is_generic?: boolean;
    error_line_count?: number;
    detail_chars?: number;
    reason?: string;
    refetched?: boolean;
  } | null | undefined;

  const investigationTimeline = (Array.isArray(raw.investigation_timeline) ? raw.investigation_timeline : []) as {
    label: string;
    status: string;
    detail: string;
    icon: string;
  }[];

  interface FixSubAction {
    category: string;
    count: number;
    evidence?: string;
    what_we_know?: string[];
    what_to_investigate?: string[];
    suggested_action?: string[];
    validation?: string[];
    what_to_inspect?: string;
    action?: string;
    what_to_fix?: string;
  }

  interface FixStep {
    step: number;
    title: string;
    action: string;
    summary?: string;
    priority: "REQUIRED" | "OPTIONAL" | string;
    priority_code?: string;
    priority_level?: string;
    actionability?: string;
    recommendation_type?: string;
    supported_by?: string;
    fix_readiness?: "READY_TO_FIX" | "INVESTIGATION_REQUIRED" | "KNOWLEDGE_BASED" | string;
    fix_readiness_label?: string;
    why_prioritized?: string[];
    what_we_know?: string[];
    what_we_need_to_determine?: string[];
    what_to_investigate?: string[];
    suggested_fix?: string[];
    validation_steps?: string[];
    steps?: string[];
    sub_actions?: FixSubAction[];
    what_to_inspect?: string;
    what_to_fix?: string;
    why?: string;
    evidence?: string;
    evidence_source?: string;
    evidence_classification?: string;
    expected_outcome?: string;
    validation?: string;
    automation_safety?: { can_automate?: boolean; risk_level?: string; reason?: string } | string;
    automation_safety_badge?: string;
  }

  const allImmediateFixes: FixStep[] = (() => {
    if (Array.isArray(raw.immediate_fix) && raw.immediate_fix.length > 0) {
      return raw.immediate_fix.map((item: any, idx: number) => ({
        step: Number(item.step || idx + 1),
        title: String(item.title || `Step ${idx + 1}`),
        action: String(item.action || item.description || ""),
        summary: item.summary || item.action || item.description || "",
        priority: "REQUIRED",
        priority_code: item.priority_code || item.priority_level || `P${idx}`,
        priority_level: item.priority_level || item.priority_code || `P${idx}`,
        actionability: item.actionability || (item.fix_readiness === "READY_TO_FIX" ? "DIRECT_FIX" : "INVESTIGATION_REQUIRED"),
        recommendation_type: item.recommendation_type || (item.fix_readiness === "READY_TO_FIX" ? "Direct Action" : "Investigation Required"),
        supported_by: item.supported_by || "✓ Verified Task Output",
        fix_readiness: item.fix_readiness || (item.priority_code === "P0" ? "READY_TO_FIX" : "INVESTIGATION_REQUIRED"),
        fix_readiness_label: item.fix_readiness_label || (item.fix_readiness === "READY_TO_FIX" || item.priority_code === "P0" ? "Direct Action" : "Investigation Required"),
        why_prioritized: Array.isArray(item.why_prioritized) ? item.why_prioritized : (item.why ? [item.why] : undefined),
        what_we_know: Array.isArray(item.what_we_know) ? item.what_we_know : undefined,
        what_we_need_to_determine: Array.isArray(item.what_we_need_to_determine) ? item.what_we_need_to_determine : undefined,
        what_to_investigate: Array.isArray(item.what_to_investigate) ? item.what_to_investigate : (item.what_to_inspect ? [item.what_to_inspect] : undefined),
        suggested_fix: Array.isArray(item.suggested_fix) ? item.suggested_fix : (item.what_to_fix ? [item.what_to_fix] : undefined),
        validation_steps: Array.isArray(item.validation_steps) ? item.validation_steps : (item.validation ? [item.validation] : undefined),
        steps: Array.isArray(item.steps) ? item.steps : undefined,
        sub_actions: Array.isArray(item.sub_actions) ? item.sub_actions : undefined,
        what_to_inspect: item.what_to_inspect || undefined,
        what_to_fix: item.what_to_fix || undefined,
        why: item.why || undefined,
        evidence: item.evidence || undefined,
        evidence_source: item.evidence_source || "✓ Verified Task Output",
        evidence_classification: item.evidence_classification || "✓ Verified Task Output",
        expected_outcome: item.expected_outcome || undefined,
        validation: item.validation || undefined,
        automation_safety: item.automation_safety || undefined,
        automation_safety_badge: item.automation_safety_badge || undefined,
      }));
    }
    if (Array.isArray(raw.known_fix) && raw.known_fix.length > 0) {
      return raw.known_fix
        .filter((item: any) => String(item.priority || "").toUpperCase() === "REQUIRED" || !String(item.title || "").toLowerCase().includes("quarantine"))
        .map((item: any, idx: number) => ({
          step: idx + 1,
          title: String(item.title || item.action || `Step ${idx + 1}`),
          action: String(item.action || item.description || item.details || ""),
          summary: item.summary || item.action || item.description || "",
          priority: "REQUIRED",
          priority_code: item.priority_code || item.priority_level || `P${idx}`,
          priority_level: item.priority_level || item.priority_code || `P${idx}`,
          actionability: item.actionability || "INVESTIGATION_REQUIRED",
          recommendation_type: item.recommendation_type || "Investigation Required",
          supported_by: item.supported_by || "✓ Verified Task Output",
          fix_readiness: item.fix_readiness || "INVESTIGATION_REQUIRED",
          fix_readiness_label: item.fix_readiness_label || "Investigation Required",
          why_prioritized: Array.isArray(item.why_prioritized) ? item.why_prioritized : (item.why ? [item.why] : undefined),
          what_we_know: Array.isArray(item.what_we_know) ? item.what_we_know : undefined,
          what_we_need_to_determine: Array.isArray(item.what_we_need_to_determine) ? item.what_we_need_to_determine : undefined,
          what_to_investigate: Array.isArray(item.what_to_investigate) ? item.what_to_investigate : (item.what_to_inspect ? [item.what_to_inspect] : undefined),
          suggested_fix: Array.isArray(item.suggested_fix) ? item.suggested_fix : (item.what_to_fix ? [item.what_to_fix] : undefined),
          validation_steps: Array.isArray(item.validation_steps) ? item.validation_steps : (item.validation ? [item.validation] : undefined),
          steps: Array.isArray(item.steps) ? item.steps : undefined,
          sub_actions: Array.isArray(item.sub_actions) ? item.sub_actions : undefined,
          what_to_inspect: item.what_to_inspect || undefined,
          what_to_fix: item.what_to_fix || undefined,
          why: item.why || undefined,
          evidence: item.evidence || undefined,
          evidence_source: item.evidence_source || "✓ Verified Task Output",
          evidence_classification: item.evidence_classification || "✓ Verified Task Output",
          expected_outcome: item.expected_outcome || undefined,
          validation: item.validation || undefined,
          automation_safety: item.automation_safety || undefined,
          automation_safety_badge: item.automation_safety_badge || undefined,
        }));
    }
    return [];
  })();

  const p0SafetyCheck = allImmediateFixes.find(
    (item) => item.priority_code === "P0" || item.priority_level === "P0" || item.title.startsWith("P0")
  );

  const suggestedFixes = allImmediateFixes.filter(
    (item) => !(item.priority_code === "P0" || item.priority_level === "P0" || item.title.startsWith("P0"))
  );

  const immediateFixes = allImmediateFixes;

  const optionalImprovements: FixStep[] = (() => {
    if (Array.isArray(raw.optional_improvements) && raw.optional_improvements.length > 0) {
      return raw.optional_improvements.map((item: any, idx: number) => ({
        step: Number(item.step || idx + 1),
        title: String(item.title || `Improvement ${idx + 1}`),
        action: String(item.action || item.description || ""),
        priority: "OPTIONAL",
        priority_code: "OPTIONAL",
        priority_level: "OPTIONAL",
        recommendation_type: item.recommendation_type || "Knowledge-Based Suggested Fix",
        supported_by: item.supported_by || "Knowledge Base / Runbook",
        fix_readiness: item.fix_readiness || "KNOWLEDGE_BASED",
        fix_readiness_label: item.fix_readiness_label || "📚 Knowledge-Based Recommendation",
        what_to_inspect: item.what_to_inspect || undefined,
        what_to_fix: item.what_to_fix || undefined,
        why: item.why || undefined,
        evidence: item.evidence || undefined,
        evidence_source: item.evidence_source || item.evidence_classification || "Knowledge Base / Runbook",
        evidence_classification: item.evidence_classification || item.evidence_source || "Knowledge Base / Runbook",
        expected_outcome: item.expected_outcome || undefined,
        validation: item.validation || undefined,
        automation_safety: item.automation_safety || undefined,
        automation_safety_badge: item.automation_safety_badge || undefined,
      }));
    }
    if (Array.isArray(raw.known_fix) && raw.known_fix.length > 0) {
      return raw.known_fix
        .filter((item: any) => String(item.priority || "").toUpperCase() === "OPTIONAL" || String(item.title || "").toLowerCase().includes("quarantine"))
        .map((item: any, idx: number) => ({
          step: idx + 1,
          title: String(item.title || item.action || `Improvement ${idx + 1}`),
          action: String(item.action || item.description || item.details || ""),
          priority: "OPTIONAL",
          priority_code: "OPTIONAL",
          priority_level: "OPTIONAL",
          recommendation_type: item.recommendation_type || "Knowledge-Based Suggested Fix",
          supported_by: item.supported_by || "Knowledge Base / Runbook",
          fix_readiness: item.fix_readiness || "KNOWLEDGE_BASED",
          fix_readiness_label: item.fix_readiness_label || "📚 Knowledge-Based Recommendation",
          what_to_inspect: item.what_to_inspect || undefined,
          what_to_fix: item.what_to_fix || undefined,
          why: item.why || undefined,
          evidence: item.evidence || undefined,
          evidence_source: item.evidence_source || item.evidence_classification || "Knowledge Base / Runbook",
          evidence_classification: item.evidence_classification || item.evidence_source || "Knowledge Base / Runbook",
          expected_outcome: item.expected_outcome || undefined,
          validation: item.validation || undefined,
        }));
    }
    return [];
  })();

  const nextBestAction = raw.next_best_action || (
    suggestedFixes.length > 0 ? suggestedFixes[0] : allImmediateFixes[0]
  );

  // Part 2: Remaining fixes exclude P1 (nextBestAction) so P1 is never rendered twice
  const remainingFixes = suggestedFixes.filter(
    (step) => step.priority_code !== "P1" && step.priority_level !== "P1" && !step.title.startsWith("P1")
  );

  const isDiagnosisFailed =
    raw.diagnosis_status === "failed" ||
    raw.diagnosis_status === "parse_failed" ||
    analysis.summary === "AI diagnosis temporarily unavailable" ||
    analysis.summary === "AI diagnosis response could not be structured" ||
    analysis.summary === "Could not parse LLM response" ||
    analysis.summary === "LLM call failed";
  const diagnosisError = raw.diagnosis_error || raw.error || "";

  return (
    <div className="bg-app-surface border border-app-border/50 rounded-xl shadow-sm relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-app-surface border border-app-border/30 blur-3xl rounded-full pointer-events-none" />

      <div className="px-5 py-4 border-b border-app-border/50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-app-input border border-sky-500/30 shadow-inner">
            <Sparkles size={18} className="text-app-brand" />
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              Agentic Ops Diagnosis
            </div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mt-0.5">
              Generated{" "}
              {formatDistanceToNow(
                new Date(
                  analysis.created_at.endsWith("Z")
                    ? analysis.created_at
                    : `${analysis.created_at}Z`,
                ),
                {
                  addSuffix: true,
                },
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-app-secondary uppercase tracking-widest">
            Confidence
          </span>
          <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                isDiagnosisFailed
                  ? "bg-gray-400"
                  : confidence >= 0.7
                    ? "bg-emerald-500"
                    : confidence >= 0.4
                      ? "bg-amber-500"
                      : "bg-rose-500",
              )}
              style={{ width: `${isDiagnosisFailed ? 0 : confidence * 100}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-bold font-mono",
              isDiagnosisFailed
                ? "text-gray-400"
                : confidence >= 0.7
                  ? "text-emerald-600 dark:text-emerald-400"
                  : confidence >= 0.4
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400",
            )}
          >
            {isDiagnosisFailed ? "Unavailable (0%)" : `${Math.round(confidence * 100)}%`}
          </span>
          {explain && (
            <button
              onClick={() => setShowWhy((v) => !v)}
              className="text-[10px] font-bold text-app-brand uppercase tracking-widest hover:text-blue-700 transition-colors"
            >
              {showWhy ? "Hide" : "Why?"}
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ── Quick Navigation Sticky Bar (Part 1 & 11) ────────────────────── */}
        <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 py-2.5 bg-app-surface/95 backdrop-blur-md border-b border-app-border/70 flex items-center gap-2 overflow-x-auto custom-scrollbar text-[11px] font-bold shadow-sm">
          <span className="text-[10px] text-app-secondary uppercase tracking-widest mr-1 shrink-0">Quick Jump:</span>
          <a
            href="#sec-what-happened"
            onClick={() => setCollapsedSections(prev => ({ ...prev, 1: false }))}
            className="px-2.5 py-1 rounded-lg bg-app-input/60 hover:bg-app-input border border-app-border/40 text-app-secondary hover:text-app-primary transition-all shrink-0 flex items-center gap-1"
          >
            <span>1. What Happened</span>
          </a>
          <a
            href="#sec-why-failed"
            onClick={() => setCollapsedSections(prev => ({ ...prev, 2: false }))}
            className="px-2.5 py-1 rounded-lg bg-app-input/60 hover:bg-app-input border border-app-border/40 text-app-secondary hover:text-app-primary transition-all shrink-0 flex items-center gap-1"
          >
            <span>2. Why It Failed</span>
          </a>
          <a
            href="#sec-safety-check"
            onClick={() => setCollapsedSections(prev => ({ ...prev, 3: false }))}
            className="px-2.5 py-1 rounded-lg bg-app-input/60 hover:bg-app-input border border-app-border/40 text-app-secondary hover:text-app-primary transition-all shrink-0 flex items-center gap-1"
          >
            <span>3. Safety Check</span>
          </a>
          <a
            href="#sec-suggested-fix"
            className="px-3 py-1 rounded-lg bg-app-input hover:bg-app-surface border border-app-border text-app-primary font-bold transition-all shrink-0 flex items-center gap-1 shadow-sm"
          >
            <Sparkles size={12} className="text-app-primary" />
            <span>4. Suggested Fix</span>
          </a>
          <a
            href="#sec-investigation"
            onClick={() => setCollapsedSections(prev => ({ ...prev, 5: false }))}
            className="px-2.5 py-1 rounded-lg bg-app-input/60 hover:bg-app-input border border-app-border/40 text-app-secondary hover:text-app-primary transition-all shrink-0 flex items-center gap-1"
          >
            <span>5. Investigation</span>
          </a>
          <a
            href="#sec-impact"
            onClick={() => setCollapsedSections(prev => ({ ...prev, 6: false }))}
            className="px-2.5 py-1 rounded-lg bg-app-input/60 hover:bg-app-input border border-app-border/40 text-app-secondary hover:text-app-primary transition-all shrink-0 flex items-center gap-1"
          >
            <span>6. Impact</span>
          </a>
          <a
            href="#sec-prevention"
            onClick={() => setCollapsedSections(prev => ({ ...prev, 7: false }))}
            className="px-2.5 py-1 rounded-lg bg-app-input/60 hover:bg-app-input border border-app-border/40 text-app-secondary hover:text-app-primary transition-all shrink-0 flex items-center gap-1"
          >
            <span>7. Prevention</span>
          </a>
          <a
            href="#sec-validate-recovery"
            onClick={() => setCollapsedSections(prev => ({ ...prev, 8: false }))}
            className="px-2.5 py-1 rounded-lg bg-app-input/60 hover:bg-app-input border border-app-border/40 text-app-secondary hover:text-app-primary transition-all shrink-0 flex items-center gap-1"
          >
            <span>8. Validate Recovery</span>
          </a>
        </div>

        {/* ── Collapsible Diagnosis Telemetry & Investigation Timeline ──── */}
        {(telemetryCompleteness?.level || classification || investigationTimeline.length > 0) && (() => {
          const level = telemetryCompleteness?.level;
          const isComplete = level === "COMPLETE";
          const isPartial = level === "PARTIAL";
          const statusText = isComplete ? "Complete Diagnosis" : isPartial ? "Partial Diagnosis" : (level || "Diagnosis Status");

          return (
            <div className="rounded-xl border border-app-border bg-app-surface shadow-sm overflow-hidden space-y-0">
              {/* Header Toggle */}
              <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowInvestigationTimeline((v) => !v)}
                  className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left group"
                  title={showInvestigationTimeline ? "Collapse Timeline" : "Expand Timeline"}
                >
                  <span className="text-app-secondary group-hover:text-app-primary transition-colors">
                    {showInvestigationTimeline ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      isComplete ? "bg-emerald-400" : isPartial ? "bg-amber-400" : "bg-sky-400"
                    )} />
                    <span className="text-xs font-bold uppercase tracking-wider text-app-primary">
                      {statusText}
                    </span>
                  </div>
                  {classification?.is_known !== undefined && (
                    <span className={cn(
                      "text-[10px] font-mono font-bold px-2 py-0.5 rounded border ml-1",
                      classification.is_known
                        ? "bg-app-input text-emerald-400 border-emerald-500/30"
                        : "bg-app-input text-amber-400 border-amber-500/30"
                    )}>
                      {classification.is_known ? "Known Pattern" : "New Error Type"}
                    </span>
                  )}
                  {classification?.matched_historical_incidents ? (
                    <span className="text-[10px] font-mono text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 hidden sm:inline-block">
                      Matched: {classification.matched_historical_incidents}
                    </span>
                  ) : null}
                  {classification?.error_type && classification.error_type.toLowerCase() !== "unknown" && (
                    <span className="text-[10px] text-app-secondary px-2 py-0.5 rounded bg-app-input border border-app-border hidden md:inline-block">
                      Category: {classification.error_type}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-2 text-[11px] text-app-secondary">
                  {telemetryCompleteness?.reason && (
                    <span className="truncate max-w-xs text-right hidden sm:inline-block">
                      {telemetryCompleteness.reason}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowInvestigationTimeline((v) => !v)}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 ml-1"
                  >
                    {showInvestigationTimeline ? "Hide Details" : "View Timeline"}
                  </button>
                </div>
              </div>

              {/* Collapsible Body */}
              {showInvestigationTimeline && (
                <div className="p-4 pt-3 border-t border-app-border/50 bg-app-input/20 space-y-4 text-xs">
                  {/* Detailed Timeline Steps */}
                  {investigationTimeline.length > 0 && (
                    <div className="rounded-lg border border-app-border/50 overflow-hidden bg-app-surface/60">
                      <div className="px-3.5 py-2 border-b border-app-border/50 flex items-center gap-2">
                        <Activity size={12} className="text-sky-400" />
                        <span className="text-[10px] font-bold text-app-secondary uppercase tracking-widest">
                          Investigation Timeline
                        </span>
                      </div>
                      <div className="divide-y divide-app-border/30">
                        {investigationTimeline.map((step, i) => {
                          const iconMap: Record<string, React.ReactNode> = {
                            check: <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />,
                            x: <AlertTriangle size={13} className="text-rose-400 shrink-0" />,
                            warn: <AlertTriangle size={13} className="text-amber-400 shrink-0" />,
                            skip: <span className="w-3.5 h-3.5 rounded-full border border-app-border/60 inline-block shrink-0" />,
                          };
                          return (
                            <div key={i} className="flex items-start gap-3 px-3.5 py-2">
                              <div className="mt-0.5">{iconMap[step.icon] ?? iconMap.skip}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-app-primary">{step.label}</div>
                                {step.detail && (
                                  <div className="text-[10px] text-app-secondary mt-0.5 leading-relaxed">
                                    {step.detail}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Confidence Breakdown & Checklist */}
                  {explain && (
                    <div className="bg-app-surface border border-app-border/60 rounded-lg p-3.5 space-y-3">
                      <div>
                        <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                          Why confidence is {explain.level}
                        </div>
                        {explain.headline && (
                          <p className="text-xs text-app-primary leading-relaxed mt-1 font-medium">
                            {explain.headline}
                          </p>
                        )}
                      </div>

                      {((explain.evidence_available && explain.evidence_available.length > 0) || (explain.evidence_missing && explain.evidence_missing.length > 0)) && (
                        <div className="p-3 rounded-lg bg-app-input/30 border border-app-border/60 space-y-2">
                          <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest flex items-center justify-between">
                            <span>Evidence Checklist</span>
                            <span className="text-[9px] font-mono text-emerald-400 font-bold">
                              {explain.evidence_available?.length || 0} Verified / {explain.evidence_missing?.length || 0} Missing
                            </span>
                          </div>

                          {explain.evidence_available && explain.evidence_available.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={11} /> Verified Available Telemetry
                              </div>
                              <ul className="space-y-1 pl-1">
                                {explain.evidence_available.map((ev, i) => (
                                  <li key={i} className="text-[11px] text-app-primary flex items-start gap-1.5 leading-relaxed">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>{ev}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {explain.evidence_missing && explain.evidence_missing.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-app-border/40">
                              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle size={11} /> Missing Telemetry & Hypotheses
                              </div>
                              <ul className="space-y-1 pl-1">
                                {explain.evidence_missing.map((ev, i) => (
                                  <li key={i} className="text-[11px] text-app-secondary flex items-start gap-1.5 leading-relaxed">
                                    <span className="text-amber-400 font-bold">✗</span>
                                    <span>{ev}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Temporary Diagnosis Failure Alert */}
        {isDiagnosisFailed && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3">
            <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={18} />
            <div className="space-y-1 text-xs leading-relaxed">
              <div className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                {raw.diagnosis_status === "parse_failed"
                  ? "Structured Diagnosis Parse Failed"
                  : "AI Diagnosis Temporarily Unavailable"}
              </div>
              <p className="text-app-primary">
                {raw.diagnosis_status === "parse_failed"
                  ? "The diagnosis model response could not be structured into the required JSON schema. Raw execution logs and pipeline metrics are preserved above."
                  : diagnosisError.includes("503") || diagnosisError.includes("high demand")
                    ? "The AI model service is currently experiencing high demand (HTTP 503). Execution logs and metrics are intact above, but automated root-cause synthesis could not complete."
                    : diagnosisError || "The AI diagnosis service could not complete analysis due to a temporary service error."}
              </p>
              <p className="text-[11px] text-app-secondary pt-0.5">
                Root cause could not be determined automatically. Click <strong>Re-analyze</strong> to retry, or switch to <strong>Cloud / Gemini</strong> mode for higher-capacity structured output.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 1: WHAT HAPPENED? ────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div id="sec-what-happened" className="space-y-4 pt-2 border-t border-app-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleSection(1)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left group"
              title={collapsedSections[1] ? "Expand Section 1" : "Collapse Section 1"}
            >
              <span className="text-app-secondary group-hover:text-app-primary transition-colors">
                {collapsedSections[1] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </span>
              <div className="text-xs font-bold text-app-primary group-hover:text-white transition-colors">
                1. What Happened?
              </div>
            </button>
            <button
              type="button"
              onClick={() => toggleSection(1)}
              className="text-xs text-app-secondary hover:text-app-primary transition-colors"
            >
              {collapsedSections[1] ? "Expand" : "Collapse"}
            </button>
          </div>

          {!collapsedSections[1] && (
            <div className="space-y-4 pt-1">
              <div>
                <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-1.5">
                  Executive Summary
                </div>
                <div className="text-sm text-app-primary leading-relaxed font-medium bg-app-input/30 p-4 rounded-xl border border-app-border/50">
                  {isDiagnosisFailed
                    ? "AI root-cause synthesis is temporarily unavailable. Pipeline failure logs and metadata are captured above."
                    : analysis.summary}
                </div>
              </div>

              {/* Verified Execution Facts (Immutable Telemetry) Grid */}
              {(raw.pipeline_name || raw.failed_stage || raw.error_code || raw.invalid_records !== undefined) && (
                <div className="p-4 rounded-xl bg-app-input/40 border border-app-border/60 text-xs space-y-3">
                  <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Verified Execution Facts (Immutable Telemetry)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      Deterministic
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-app-secondary">Pipeline</div>
                      <div className="font-mono font-bold text-app-primary truncate" title={raw.pipeline_name}>
                        {raw.pipeline_name || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-app-secondary">Failed Stage</div>
                      <div className="font-mono font-bold text-amber-400 truncate" title={raw.failed_stage || "Not available from retrieved run telemetry"}>
                        {raw.failed_stage || "Not available from retrieved run telemetry"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-app-secondary">Error Code</div>
                      <div className="font-mono font-bold text-rose-400 truncate" title={raw.error_code || "Not available from retrieved run telemetry"}>
                        {raw.error_code || "Not available from retrieved run telemetry"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-app-secondary">Failure Metric</div>
                      <div className="font-mono font-bold text-app-primary">
                        {typeof raw.invalid_records === "number" && typeof raw.total_records === "number" && raw.invalid_records !== null && raw.total_records !== null
                          ? `${raw.invalid_records}/${raw.total_records} unique (${Number(raw.invalid_percentage || 0).toFixed(1)}% vs ${Number(raw.allowed_threshold || 5).toFixed(1)}%)`
                          : typeof raw.allowed_threshold === "number" && raw.allowed_threshold !== null
                            ? `Threshold: ${raw.allowed_threshold}%`
                            : "Not available from retrieved run telemetry"}
                      </div>
                    </div>
                  </div>

                  {/* Validation violation category breakdown */}
                  {raw.validation_failures && Object.keys(raw.validation_failures).length > 0 && (
                    <div className="pt-2.5 border-t border-app-border/40 space-y-1.5">
                      <div className="text-[11px] text-app-secondary flex items-start gap-2 flex-wrap">
                        <span className="font-bold text-app-primary">
                          Category Violations ({raw.validation_violations_total || 13} total):
                        </span>
                        {Object.entries(raw.validation_failures).map(([cat, cnt], i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-app-surface border border-app-border/50 text-app-primary font-mono text-[10px]">
                            {cat.replace(/_/g, " ")}: <strong>{String(cnt)}</strong>
                          </span>
                        ))}
                      </div>
                      {(raw.category_violation_explanation || raw.verified_facts?.category_violation_explanation) && (
                        <p className="text-[10px] text-app-secondary/90 italic leading-relaxed pl-1 flex items-start gap-1">
                          <Info size={11} className="text-app-secondary shrink-0 mt-0.5" />
                          <span>{raw.category_violation_explanation || raw.verified_facts?.category_violation_explanation}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Affected Record IDs (Raw + Unique + Duplicates) */}
                  {((Array.isArray(raw.affected_ids_raw) && raw.affected_ids_raw.length > 0) || (Array.isArray(raw.affected_ids_unique) && raw.affected_ids_unique.length > 0)) && (
                    <div className="pt-2.5 border-t border-app-border/40 space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-bold text-app-primary text-[11px]">
                          Affected Entity IDs ({raw.affected_ids_unique?.length || raw.affected_ids_raw?.length} Unique, {raw.affected_ids_raw?.length || 0} Total):
                        </span>
                        {raw.affected_ids_duplicates && raw.affected_ids_duplicates.length > 0 && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            Duplicate Instances: {raw.affected_ids_duplicates.join(", ")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(raw.affected_ids_raw || raw.affected_ids_unique || []).map((id: string, idx: number) => {
                          const isDup = raw.affected_ids_duplicates?.includes(id);
                          return (
                            <span
                              key={idx}
                              className={cn(
                                "px-2 py-0.5 rounded font-mono text-[10px] border transition-colors",
                                isDup
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold"
                                  : "bg-app-surface border-app-border/60 text-app-primary"
                              )}
                              title={isDup ? `Record ${id} appears multiple times in batch failure telemetry` : undefined}
                            >
                              {id}
                              {isDup && <span className="ml-1 text-[8px] text-amber-400 font-sans">(dup)</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 2: WHY DID IT FAIL? ──────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div id="sec-why-failed" className="space-y-4 pt-2 border-t border-app-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleSection(2)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left group"
              title={collapsedSections[2] ? "Expand Section 2" : "Collapse Section 2"}
            >
              <span className="text-app-secondary group-hover:text-app-primary transition-colors">
                {collapsedSections[2] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </span>
              <div className="text-xs font-bold text-app-primary group-hover:text-white transition-colors">
                2. Why Did It Fail?
              </div>
            </button>
            <button
              type="button"
              onClick={() => toggleSection(2)}
              className="text-xs text-app-secondary hover:text-app-primary transition-colors"
            >
              {collapsedSections[2] ? "Expand" : "Collapse"}
            </button>
          </div>

          {!collapsedSections[2] && (
            <div className="space-y-4 pt-1">
              {(() => {
                if (isDiagnosisFailed) {
                  return (
                    <div className="text-sm text-app-secondary italic bg-app-surface p-4 rounded-lg border border-app-border leading-relaxed">
                      Not determinable because AI diagnosis did not complete. Review the execution logs above or re-run analysis.
                    </div>
                  );
                }

                const structuredData = parseRootCause(analysis.root_cause);
                if (
                  analysis.summary === "Could not parse LLM response" &&
                  structuredData
                ) {
                  return <StructuredAnalysis data={structuredData} />;
                }

                const verifiedRootCause = rcClassification?.tier_a_verified_fact?.statement || raw.verified_root_cause || analysis.root_cause;
                const tierBInference = rcClassification?.tier_b_deterministic_inference;

                return (
                  <div className="space-y-4">
                    {/* Level A — Verified Fact */}
                    {verifiedRootCause && (
                      <div>
                        <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Level A — Verified Fact (Direct Telemetry)
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                            Direct Telemetry
                          </span>
                        </div>
                        <div className="text-sm text-app-primary bg-app-surface p-4 rounded-xl border border-emerald-500/30 leading-relaxed font-sans space-y-2">
                          <div>
                            {verifiedRootCause
                              .split(/\*\*(.*?)\*\*/g)
                              .map((part: string, i: number) =>
                                i % 2 === 1 ? (
                                  <strong key={i} className="font-bold text-app-primary">
                                    {part}
                                  </strong>
                                ) : (
                                  part
                                ),
                              )}
                          </div>
                          {rcClassification?.tier_a_verified_fact?.evidence && rcClassification.tier_a_verified_fact.evidence.length > 0 && (
                            <ul className="pt-2 border-t border-app-border/40 space-y-1">
                              {rcClassification.tier_a_verified_fact.evidence.map((ev, i) => (
                                <li key={i} className="text-xs text-app-secondary flex items-start gap-1.5">
                                  <span className="text-emerald-400">✓</span>
                                  <span>{ev}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Level B — Deterministic Inference */}
                    {tierBInference && (
                      <div>
                        <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                            Level B — Deterministic Inference (Mathematical / Logical Deduction)
                          </span>
                          <span className="text-[10px] font-mono text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30">
                            Deduction
                          </span>
                        </div>
                        <div className="text-sm text-app-primary bg-sky-500/5 p-4 rounded-xl border border-sky-500/30 leading-relaxed font-sans space-y-1.5">
                          <div>{tierBInference.statement}</div>
                          {tierBInference.calculation && (
                            <div className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-1 rounded inline-block">
                              {tierBInference.calculation}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {failureMechanism && (
                <div>
                  <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
                    Failure Mechanism
                  </div>
                  <div className="text-sm text-app-primary whitespace-pre-wrap bg-rose-500/10 p-4 rounded-lg border border-rose-500/30 leading-relaxed">
                    {failureMechanism
                      .split(/\*\*(.*?)\*\*/g)
                      .map((part: string, i: number) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="font-bold text-app-primary">
                            {part}
                          </strong>
                        ) : (
                          part
                        ),
                      )}
                  </div>
                </div>
              )}

              {errorDetails && (
                <div>
                  <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
                    Error Details
                  </div>
                  <div className="text-sm text-app-primary leading-relaxed bg-app-surface/60 p-4 rounded-xl border border-app-border/50">
                    {errorDetails
                      .split(/\*\*(.*?)\*\*/g)
                      .map((part: string, i: number) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="font-bold text-app-primary">
                            {part}
                          </strong>
                        ) : (
                          part
                        ),
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 3: PRE-FIX SAFETY CHECK (P0 CONTAINMENT) ─────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {p0SafetyCheck && (
          <div id="sec-safety-check" className="space-y-4 pt-2 border-t border-app-border/50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleSection(3)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left group"
                title={collapsedSections[3] ? "Expand Section 3" : "Collapse Section 3"}
              >
                <span className="text-app-secondary group-hover:text-app-primary transition-colors">
                  {collapsedSections[3] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                </span>
                <div className="text-xs font-bold text-app-primary group-hover:text-white transition-colors">
                  3. Pre-Fix Safety Check
                </div>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-app-secondary px-2 py-0.5 rounded bg-app-input border border-app-border hidden sm:inline-block">
                  Downstream Containment
                </span>
                <button
                  type="button"
                  onClick={() => toggleSection(3)}
                  className="text-xs text-app-secondary hover:text-app-primary transition-colors"
                >
                  {collapsedSections[3] ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>

            {!collapsedSections[3] && (
              <div className="space-y-4 pt-1">
                <p className="text-xs text-app-secondary leading-relaxed font-medium">
                  Verify downstream containment before making changes. This is a safety check to ensure corrupt data has not propagated downstream, and does not resolve the root cause.
                </p>

                <div className="p-4 sm:p-5 rounded-xl border border-app-border bg-app-surface text-sm leading-relaxed space-y-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded font-black font-mono text-[11px] bg-amber-500 text-black shrink-0">
                      P0
                    </span>
                    <span className="font-bold text-app-primary text-sm sm:text-base">
                      {p0SafetyCheck.title}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-app-input text-app-secondary border border-app-border/50">
                      {p0SafetyCheck.recommendation_type || "Evidence-Based Suggested Fix"}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-app-input text-app-secondary border border-app-border/50">
                      Supported By: {p0SafetyCheck.supported_by || "Verified Task Output"}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-app-border bg-app-input text-sky-400 ml-auto flex items-center gap-1">
                      <Zap size={11} className="text-sky-400" />
                      <span>Safe to Automate</span>
                    </span>
                  </div>

                  <div className="text-app-primary whitespace-pre-wrap text-xs sm:text-sm leading-relaxed font-medium">
                    {p0SafetyCheck.action}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-app-border/40 text-xs">
                    {p0SafetyCheck.what_to_inspect && (
                      <div className="p-2.5 rounded-lg bg-app-input/40 border border-app-border/40 space-y-1">
                        <div className="text-[10px] font-bold text-app-secondary uppercase tracking-wider flex items-center gap-1">
                          <Search size={11} className="text-app-secondary" />
                          <span>What to Inspect</span>
                        </div>
                        <p className="text-[11px] text-app-primary leading-relaxed">
                          {p0SafetyCheck.what_to_inspect}
                        </p>
                      </div>
                    )}

                    {p0SafetyCheck.what_to_fix && (
                      <div className="p-2.5 rounded-lg bg-app-input/40 border border-app-border/40 space-y-1">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Shield size={11} className="text-amber-400" />
                          <span>Containment Action</span>
                        </div>
                        <p className="text-[11px] text-app-primary leading-relaxed">
                          {p0SafetyCheck.what_to_fix}
                        </p>
                      </div>
                    )}
                  </div>

                  {p0SafetyCheck.why && (
                    <div className="text-xs text-app-secondary leading-snug">
                      <span className="text-app-secondary text-[11px] uppercase tracking-wider mr-1 font-bold">Why This Is Prioritized:</span>
                      {p0SafetyCheck.why}
                    </div>
                  )}

                  {p0SafetyCheck.evidence && (
                    <div className="text-xs text-app-secondary leading-snug">
                      <span className="text-app-secondary text-[11px] uppercase tracking-wider mr-1 font-bold">Evidence:</span>
                      <span className="font-mono text-app-primary">{p0SafetyCheck.evidence}</span>
                    </div>
                  )}

                  {p0SafetyCheck.expected_outcome && (
                    <div className="pt-2 border-t border-app-border/40 flex items-start gap-2 text-xs text-app-primary font-medium">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                      <div>
                        <span className="text-app-secondary text-[11px] uppercase tracking-wider mr-1">Expected Outcome:</span>
                        {p0SafetyCheck.expected_outcome}
                      </div>
                    </div>
                  )}

                  {p0SafetyCheck.validation && (
                    <div className="flex items-start gap-2 text-xs text-sky-400 font-medium">
                      <span className="text-app-secondary text-[11px] uppercase tracking-wider mr-1">Validation:</span>
                      {p0SafetyCheck.validation}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 4: SUGGESTED FIX ─────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {suggestedFixes.length > 0 && (
          <div
            id="sec-suggested-fix"
            className="p-5 sm:p-6 rounded-xl bg-app-surface border border-app-border space-y-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-app-primary flex items-center gap-2">
                  4. Suggested Fix
                </h3>
                <p className="text-xs text-app-secondary mt-1">
                  Follow these prioritized actions to investigate and resolve the pipeline failure.
                </p>
              </div>
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-app-input text-app-secondary border border-app-border">
                {suggestedFixes.length} Prioritized Action{suggestedFixes.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* NEXT BEST ACTION — P1 ACTION CARD (Part 1, 2, 3, 11, 12) */}
            {nextBestAction && (() => {
              const isReady = nextBestAction.fix_readiness === "READY_TO_FIX";
              const isDirect = nextBestAction.actionability === "DIRECT_FIX" || isReady;

              return (
                <div className="p-5 sm:p-6 rounded-xl bg-app-surface border border-app-border border-l-4 border-l-amber-500 space-y-4 shadow-sm">
                  {/* Top Status Row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-amber-500 font-mono tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-500" />
                      <span>NEXT BEST ACTION</span>
                    </span>
                    <span className="text-xs text-amber-400/90 font-semibold flex items-center gap-1.5">
                      {isDirect ? (
                        <>
                          <Wrench size={12} className="text-amber-400" />
                          <span>Direct Action</span>
                        </>
                      ) : (
                        <>
                          <Search size={12} className="text-amber-400" />
                          <span>Investigation Required</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title & Short Summary */}
                  <div className="space-y-1">
                    <h4 className="text-base sm:text-lg font-bold text-app-primary">
                      {nextBestAction.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-app-secondary leading-relaxed font-medium">
                      {nextBestAction.summary || nextBestAction.action}
                    </p>
                  </div>

                  {/* WHY THIS IS THE NEXT ACTION */}
                  <div className="space-y-1.5 pt-3 border-t border-app-border/50 text-xs">
                    <div className="text-[11px] font-bold text-app-secondary uppercase tracking-wider">
                      Why This Is The Next Action
                    </div>
                    <ul className="space-y-1 text-app-primary">
                      {(nextBestAction.why_prioritized && nextBestAction.why_prioritized.length > 0
                        ? nextBestAction.why_prioritized
                        : [
                            "Highest observed failure category: 5 violations.",
                            "Resolving this category may reduce the invalid-record rate significantly.",
                          ]
                      ).map((whyItem, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-app-secondary">•</span>
                          <span>{whyItem}</span>
                        </li>
                      ))}
                    </ul>
                    {nextBestAction.evidence && (
                      <div className="text-xs text-app-secondary pt-1 font-medium">
                        <span className="font-semibold text-app-primary mr-1">Evidence:</span>
                        <span className="text-emerald-400 font-mono">
                          ✓ {Array.isArray(nextBestAction.evidence) ? nextBestAction.evidence.join(", ") : nextBestAction.evidence}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* WHAT WE KNOW vs WHAT WE STILL NEED TO DETERMINE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-app-border/50 text-xs">
                    {nextBestAction.what_we_know && nextBestAction.what_we_know.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-app-input/30 border border-app-border/60 space-y-2">
                        <div className="text-[11px] font-bold text-app-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>What We Know</span>
                        </div>
                        <ul className="space-y-1.5 text-app-primary">
                          {nextBestAction.what_we_know.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-400 font-bold">✓</span>
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {nextBestAction.what_we_need_to_determine && nextBestAction.what_we_need_to_determine.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-app-input/30 border border-app-border/60 space-y-2">
                        <div className="text-[11px] font-bold text-app-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <span className="text-amber-400 font-bold">?</span>
                          <span>What We Still Need to Determine</span>
                        </div>
                        <ul className="space-y-1.5 text-app-primary">
                          {nextBestAction.what_we_need_to_determine.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-400 font-bold">?</span>
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* WHAT TO INVESTIGATE */}
                  <div className="space-y-1.5 pt-3 border-t border-app-border/50 text-xs">
                    <div className="text-[11px] font-bold text-app-secondary uppercase tracking-wider">
                      What to Investigate
                    </div>
                    <ul className="space-y-1.5 text-app-primary">
                      {(nextBestAction.what_to_investigate && nextBestAction.what_to_investigate.length > 0
                        ? nextBestAction.what_to_investigate
                        : [
                            "Open the affected inventory records.",
                            "Inspect the values evaluated by the reconciliation validation rule.",
                            "Compare the source values with the expected reconciliation values.",
                            "Identify the exact records causing the validation failures.",
                          ]
                      ).map((stepItem, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-app-secondary">•</span>
                          <span className="leading-relaxed">{stepItem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* SUGGESTED FIX */}
                  <div className="space-y-1.5 pt-3 border-t border-app-border/50 text-xs">
                    <div className="text-[11px] font-bold text-app-secondary uppercase tracking-wider">
                      Suggested Fix
                    </div>
                    <ul className="space-y-1.5 text-app-primary">
                      {(nextBestAction.suggested_fix && nextBestAction.suggested_fix.length > 0
                        ? nextBestAction.suggested_fix
                        : [
                            "Determine the underlying discrepancy before modifying source data.",
                            "Identify and correct the input discrepancies causing the reconciliation validation rule to fail.",
                          ]
                      ).map((fixItem, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-app-secondary">•</span>
                          <span className="leading-relaxed">{fixItem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* HOW TO VALIDATE */}
                  <div className="space-y-1.5 pt-3 border-t border-app-border/50 text-xs">
                    <div className="text-[11px] font-bold text-app-secondary uppercase tracking-wider">
                      How to Validate
                    </div>
                    <ul className="space-y-1.5 text-app-primary">
                      {(nextBestAction.validation_steps && nextBestAction.validation_steps.length > 0
                        ? nextBestAction.validation_steps
                        : [
                            "Re-run the reconciliation validation.",
                            "Confirm Inventory Reconciliation Mismatch violations = 0.",
                            "Confirm corrected records pass validation.",
                            "Confirm the overall invalid record rate is strictly below 25.0%.",
                          ]
                      ).map((valItem, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-app-secondary font-mono">□</span>
                          <span className="leading-relaxed">{valItem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}

            {/* REMAINING SUGGESTED FIXES (P2, P3, P4, P5...) — NO DUPLICATION OF P1 (Part 4, 5) */}
            {remainingFixes.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-app-border/50">
                <h4 className="text-xs font-bold text-app-secondary uppercase tracking-wider">
                  Remaining Suggested Fixes ({remainingFixes.length})
                </h4>

                <div className="space-y-3">
                  {remainingFixes.map((step, idx) => {
                    const isExpanded = !!expandedFixes[step.step];
                    const isP5 = step.priority_code === "P5" || step.title.startsWith("P5") || (step.sub_actions && step.sub_actions.length > 0);
                    const isDirect = step.actionability === "DIRECT_FIX" || step.fix_readiness === "READY_TO_FIX";

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-app-surface border border-app-border space-y-3 transition-all"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-sm font-bold text-app-primary">
                            {step.title}
                          </span>
                          <span className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5">
                            {isDirect ? (
                              <>
                                <Wrench size={12} className="text-amber-400" />
                                <span>Direct Action</span>
                              </>
                            ) : (
                              <>
                                <Search size={12} className="text-amber-400" />
                                <span>Investigation Required</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Short Summary Bullets */}
                        <ul className="space-y-1 text-xs text-app-primary">
                          {step.summary ? (
                            <li className="flex items-start gap-1.5">
                              <span className="text-app-secondary">•</span>
                              <span>{step.summary}</span>
                            </li>
                          ) : (
                            <li className="flex items-start gap-1.5">
                              <span className="text-app-secondary">•</span>
                              <span>{step.action}</span>
                            </li>
                          )}
                        </ul>

                        {/* Expand/Collapse Trigger */}
                        <button
                          type="button"
                          onClick={() => toggleExpandFix(step.step)}
                          className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 pt-1 transition-colors"
                        >
                          {isExpanded ? "▲ Collapse Details" : "▼ [Expand Details]"}
                        </button>

                        {/* Expandable Details Area */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-app-border/40 space-y-3 text-xs">
                            {isP5 && step.sub_actions && step.sub_actions.length > 0 ? (
                              <div className="space-y-3">
                                <div className="text-[11px] font-bold text-app-secondary uppercase tracking-wider">
                                  Remaining Issues
                                </div>
                                {step.sub_actions.map((sub, sIdx) => (
                                  <div key={sIdx} className="p-3.5 rounded-lg bg-app-input/20 border border-app-border/50 space-y-2">
                                    <div className="font-bold text-app-primary text-xs">
                                      {sub.category} — {sub.count}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-bold text-app-secondary uppercase">What we know:</div>
                                      <div className="text-app-primary flex items-start gap-1.5">
                                        <span className="text-emerald-400 font-bold">✓</span>
                                        <span>{sub.what_we_know?.[0] || `One record failed the ${sub.category} validation rule.`}</span>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-bold text-app-secondary uppercase">What to investigate:</div>
                                      {(sub.what_to_investigate || (sub.action ? [sub.action] : [sub.what_to_inspect || "Inspect source inputs."])).map((wi, wIdx) => (
                                        <div key={wIdx} className="text-app-primary flex items-start gap-1.5">
                                          <span className="text-app-secondary">•</span>
                                          <span>{wi}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-bold text-app-secondary uppercase">Suggested action:</div>
                                      <div className="text-app-primary flex items-start gap-1.5">
                                        <span className="text-app-secondary">•</span>
                                        <span>{sub.suggested_action?.[0] || sub.what_to_fix || "Correct or map the value after verification."}</span>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-bold text-app-secondary uppercase">Validation:</div>
                                      <div className="text-app-primary flex items-start gap-1.5">
                                        <span className="text-app-secondary font-mono">□</span>
                                        <span>{sub.validation?.[0] || `Re-run ${sub.category} validation.`}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {step.what_we_know && step.what_we_know.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-app-secondary uppercase">What we know:</div>
                                    {step.what_we_know.map((item, kIdx) => (
                                      <div key={kIdx} className="text-app-primary flex items-start gap-1.5">
                                        <span className="text-emerald-400 font-bold">✓</span>
                                        <span>{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {step.what_we_need_to_determine && step.what_we_need_to_determine.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-app-secondary uppercase">What we still need to determine:</div>
                                    {step.what_we_need_to_determine.map((item, dIdx) => (
                                      <div key={dIdx} className="text-app-primary flex items-start gap-1.5">
                                        <span className="text-amber-400 font-bold">?</span>
                                        <span>{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <div className="text-[10px] font-bold text-app-secondary uppercase">What to investigate:</div>
                                  {(step.what_to_investigate || (step.what_to_inspect ? [step.what_to_inspect] : [step.action])).map((item, iIdx) => (
                                    <div key={iIdx} className="text-app-primary flex items-start gap-1.5">
                                      <span className="text-app-secondary">•</span>
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-bold text-app-secondary uppercase">Suggested fix:</div>
                                  {(step.suggested_fix || (step.what_to_fix ? [step.what_to_fix] : ["Determine the underlying discrepancy before modifying source data."])).map((item, fIdx) => (
                                    <div key={fIdx} className="text-app-primary flex items-start gap-1.5">
                                      <span className="text-app-secondary">•</span>
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-bold text-app-secondary uppercase">How to validate:</div>
                                  {(step.validation_steps || (step.validation ? [step.validation] : ["Re-run validation checks."])).map((item, vIdx) => (
                                    <div key={vIdx} className="text-app-primary flex items-start gap-1.5">
                                      <span className="text-app-secondary font-mono">□</span>
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 5: SUPPORTING INVESTIGATION ──────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div id="sec-investigation" className="space-y-4 pt-2 border-t border-app-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleSection(5)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left group"
              title={collapsedSections[5] ? "Expand Section 5" : "Collapse Section 5"}
            >
              <span className="text-app-secondary group-hover:text-app-primary transition-colors">
                {collapsedSections[5] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </span>
              <div className="text-xs font-bold text-app-primary group-hover:text-white transition-colors">
                5. Supporting Investigation
              </div>
            </button>
            <button
              type="button"
              onClick={() => toggleSection(5)}
              className="text-xs text-app-secondary hover:text-app-primary transition-colors"
            >
              {collapsedSections[5] ? "Expand" : "Collapse"}
            </button>
          </div>

          {!collapsedSections[5] && (
            <div className="space-y-4 pt-1">
              {/* Level C — Hypotheses */}
              {(() => {
                const tierCHypotheses = rcClassification?.tier_c_hypothesis;
                const inferredContributingCause = raw.inferred_contributing_cause;
                if (!tierCHypotheses?.length && !inferredContributingCause) return null;

                return (
                  <div>
                    <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Level C — Hypotheses (Potential Upstream Causes)
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                        Unproven (Requires Verification)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {tierCHypotheses && tierCHypotheses.length > 0 ? (
                        tierCHypotheses.map((h, i) => (
                          <div key={i} className="text-xs text-app-secondary bg-app-surface/60 p-3 rounded-xl border border-amber-500/20 leading-relaxed space-y-1">
                            <div className="text-app-primary font-medium">{h.statement}</div>
                            {h.caveat && (
                              <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                                <Search size={11} className="text-amber-400 shrink-0" />
                                <span>Note: {h.caveat}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-app-secondary bg-app-surface/60 p-4 rounded-xl border border-amber-500/20 leading-relaxed font-sans italic">
                          {inferredContributingCause}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Level D — Suggested Investigations (Part 6) */}
              {(() => {
                const tierDInvestigations = rcClassification?.tier_d_suggested_investigations;
                if (!tierDInvestigations?.length) return null;

                return (
                  <div>
                    <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        Level D — Suggested Operational Investigations
                      </span>
                      <span className="text-[10px] font-mono text-purple-400 font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">
                        Investigation Only
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tierDInvestigations.map((inv, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-app-surface/60 border border-purple-500/30 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <div className="font-bold text-app-primary flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              {inv.title || `Investigation ${i + 1}`} {inv.area ? `— ${inv.area}` : ""}
                            </div>
                            {inv.evidence && (
                              <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                {inv.evidence}
                              </span>
                            )}
                          </div>
                          <div className="text-app-primary leading-relaxed">{inv.action}</div>
                          {inv.why && (
                            <div className="text-[11px] text-app-secondary italic pt-1 border-t border-app-border/30">
                              {inv.why}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Contributing Factors with Fact/Inference Classification (Part 7) */}
              {contributingFactors.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
                    Contributing Factors
                  </div>
                  <ul className="space-y-2">
                    {contributingFactors.map((d: string, i: number) => {
                      const lower = d.toLowerCase();
                      let badge = { label: "Hypothesis", className: "text-amber-400 font-semibold font-mono" };
                      if (lower.includes("verified") || lower.includes("telemetry") || lower.includes("stopped execution") || lower.includes("exceeded allowed") || lower.includes("failed stage") || lower.includes("terminated during") || lower.includes("multiple validation rule violations")) {
                        badge = { label: "Verified", className: "text-emerald-400 font-semibold font-mono" };
                      } else if (lower.includes("inference") || lower.includes("deterministic") || lower.includes("calculated") || lower.includes("mathematical") || lower.includes("deduction") || lower.includes("amplified the impact") || lower.includes("rate of")) {
                        badge = { label: "Derived", className: "text-sky-400 font-semibold font-mono" };
                      } else if (lower.includes("investigat") || lower.includes("inspect")) {
                        badge = { label: "Investigation", className: "text-purple-400 font-semibold font-mono" };
                      }

                      return (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg bg-app-surface border border-app-border/50 text-xs sm:text-sm text-app-primary"
                        >
                          <span className={cn("text-xs shrink-0 mt-0.5 px-2 py-0.5 rounded bg-app-input border border-app-border/60", badge.className)}>
                            {badge.label}
                          </span>
                          <span className="leading-relaxed font-medium">
                            {d
                              .split(/\*\*(.*?)\*\*/g)
                              .map((part: string, idx: number) =>
                                idx % 2 === 1 ? (
                                  <strong
                                    key={idx}
                                    className="font-bold text-app-primary"
                                  >
                                    {part}
                                  </strong>
                                ) : (
                                  part
                                ),
                              )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 6: UNDERSTAND THE IMPACT ─────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div id="sec-impact" className="space-y-4 pt-2 border-t border-app-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleSection(6)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left group"
              title={collapsedSections[6] ? "Expand Section 6" : "Collapse Section 6"}
            >
              <span className="text-app-secondary group-hover:text-app-primary transition-colors">
                {collapsedSections[6] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </span>
              <div className="text-xs font-bold text-app-primary group-hover:text-white transition-colors">
                6. Understand the Impact
              </div>
            </button>
            <button
              type="button"
              onClick={() => toggleSection(6)}
              className="text-xs text-app-secondary hover:text-app-primary transition-colors"
            >
              {collapsedSections[6] ? "Expand" : "Collapse"}
            </button>
          </div>

          {!collapsedSections[6] && (
            <div className="space-y-4 pt-1">
              {/* ── Blast Radius Card ───────────────────────────────────────── */}
              {blastRadius && (
                <div className={cn(
                  "p-4 rounded-xl border space-y-3",
                  blastRadius.severity_level === "CRITICAL"
                    ? "bg-rose-500/10 border-rose-500/40"
                    : blastRadius.severity_level === "HIGH"
                      ? "bg-orange-500/10 border-orange-500/40"
                      : blastRadius.severity_level === "MEDIUM"
                        ? "bg-amber-500/10 border-amber-500/40"
                        : "bg-app-input border-app-border/50",
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={13} className={cn(
                        blastRadius.severity_level === "CRITICAL" ? "text-rose-400"
                          : blastRadius.severity_level === "HIGH" ? "text-orange-400"
                            : blastRadius.severity_level === "MEDIUM" ? "text-amber-400"
                              : "text-app-secondary"
                      )} />
                      <span className="text-[10px] font-bold text-app-secondary uppercase tracking-widest">Blast Radius</span>
                    </div>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                      blastRadius.severity_level === "CRITICAL"
                        ? "text-rose-400 border-rose-500/40 bg-rose-500/10"
                        : blastRadius.severity_level === "HIGH"
                          ? "text-orange-400 border-orange-500/40 bg-orange-500/10"
                          : blastRadius.severity_level === "MEDIUM"
                            ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
                            : "text-app-secondary border-app-border bg-app-surface",
                    )}>
                      {blastRadius.severity_level ?? "UNKNOWN"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {blastRadius.records_affected != null && blastRadius.total_records != null && (
                      <div>
                        <div className="text-[10px] text-app-secondary">Records Affected</div>
                        <div className="font-mono font-bold text-app-primary">{blastRadius.records_affected}/{blastRadius.total_records}</div>
                      </div>
                    )}
                    {blastRadius.pct_affected != null && (
                      <div>
                        <div className="text-[10px] text-app-secondary">% of Batch</div>
                        <div className="font-mono font-bold text-app-primary">{Number(blastRadius.pct_affected).toFixed(1)}%</div>
                      </div>
                    )}
                    {(blastRadius.failure_categories_count ?? 0) > 0 && (
                      <div>
                        <div className="text-[10px] text-app-secondary">Failure Categories</div>
                        <div className="font-mono font-bold text-app-primary">{blastRadius.failure_categories_count}</div>
                      </div>
                    )}
                  </div>
                  {blastRadius.severity_reason && (
                    <div className="text-[11px] text-app-secondary leading-relaxed border-t border-app-border/40 pt-2">
                      {blastRadius.severity_reason}
                    </div>
                  )}
                  {blastRadius.downstream_impact && (
                    <div className="text-[11px] text-app-secondary leading-relaxed italic">
                      {blastRadius.downstream_impact}
                    </div>
                  )}
                </div>
              )}

              {/* Structured Impact Assessment */}
              {(impact || impactData) && (
                <div>
                  <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2 flex items-center justify-between">
                    <span>Impact Assessment</span>
                    {impactData?.risk_level && (
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                        impactData.risk_level === "CRITICAL"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : impactData.risk_level === "HIGH"
                            ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      )}>
                        {impactData.risk_level} RISK
                      </span>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-2.5">
                    <div className="text-sm text-app-primary leading-relaxed font-sans">
                      {(impactData?.operational_impact || impactData?.description || impact)
                        .split(/\*\*(.*?)\*\*/g)
                        .map((part: string, i: number) =>
                          i % 2 === 1 ? (
                            <strong key={i} className="font-bold text-app-primary">
                              {part}
                            </strong>
                          ) : (
                            part
                          ),
                        )}
                    </div>

                    {impactData?.affected_ids && impactData.affected_ids.length > 0 && (
                      <div className="pt-2 border-t border-app-border/40 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-app-secondary uppercase tracking-wider mr-1">
                          Directly Affected Entities ({impactData.affected_ids.length}):
                        </span>
                        {impactData.affected_ids.map((id, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-app-surface border border-app-border/60 text-app-primary font-mono text-[10px]">
                            {id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 7: PREVENT FUTURE FAILURES ───────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div id="sec-prevention" className="space-y-4 pt-2 border-t border-app-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleSection(7)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left group"
              title={collapsedSections[7] ? "Expand Section 7" : "Collapse Section 7"}
            >
              <span className="text-app-secondary group-hover:text-app-primary transition-colors">
                {collapsedSections[7] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </span>
              <div className="text-xs font-bold text-app-primary group-hover:text-white transition-colors">
                7. Prevent Future Failures
              </div>
            </button>
            <button
              type="button"
              onClick={() => toggleSection(7)}
              className="text-xs text-app-secondary hover:text-app-primary transition-colors"
            >
              {collapsedSections[7] ? "Expand" : "Collapse"}
            </button>
          </div>

          {!collapsedSections[7] && (
            <div className="space-y-4 pt-1">
              {/* Long-term prevention (Part 7) */}
              {(() => {
                const ltpList = Array.isArray(raw.long_term_prevention)
                  ? raw.long_term_prevention
                  : longTermPrevention
                    ? [longTermPrevention]
                    : [];

                if (ltpList.length === 0) return null;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest">
                        Preventive Recommendations
                      </div>
                      <span className="text-[10px] text-app-secondary font-medium italic">
                        Intended to reduce recurrence; not claims about current pipeline configuration.
                      </span>
                    </div>
                    <ul className="space-y-2 bg-sky-500/5 p-4 rounded-xl border border-sky-500/20">
                      {ltpList.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-app-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 mt-2" />
                          <span className="leading-relaxed">
                            {String(item)
                              .split(/\*\*(.*?)\*\*/g)
                              .map((part: string, idx: number) =>
                                idx % 2 === 1 ? (
                                  <strong key={idx} className="font-bold text-app-primary">
                                    {part}
                                  </strong>
                                ) : (
                                  part
                                ),
                              )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Optional Improvements (Runbook Recommendations - Part 8) */}
              {optionalImprovements.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2 flex items-center justify-between">
                    <span>Optional Improvements ({optionalImprovements.length} Runbook Recommendation{optionalImprovements.length !== 1 ? "s" : ""})</span>
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                      Source: Knowledge Base / Runbook
                    </span>
                  </div>
                  <div className="space-y-3">
                    {optionalImprovements.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border text-sm leading-relaxed transition-all shadow-sm bg-sky-500/5 border-sky-500/30 border-l-4 border-l-sky-500 space-y-2"
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-app-input border border-app-border flex items-center justify-center text-[10px] font-bold text-app-primary shrink-0">
                            {step.step || idx + 1}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {step.recommendation_type || "Knowledge-Based Suggested Fix"}
                          </span>
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-app-surface text-app-secondary border border-app-border/50">
                            Supported By: {step.supported_by || step.evidence_source || "Knowledge Base / Runbook"}
                          </span>
                          <span className="font-bold text-app-primary text-sm">
                            {step.title}
                          </span>
                        </div>

                        <div className="text-app-primary whitespace-pre-wrap pl-7 text-xs sm:text-sm leading-relaxed">
                          {step.action}
                        </div>

                        {step.why && (
                          <div className="ml-7 text-xs text-app-secondary leading-snug">
                            <span className="text-app-secondary text-[11px] uppercase tracking-wider mr-1 font-bold">Why:</span>
                            {step.why}
                          </div>
                        )}

                        {step.expected_outcome && (
                          <div className="ml-7 pt-2 border-t border-app-border/40 flex items-start gap-2 text-xs text-sky-300 font-medium">
                            <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-sky-400" />
                            <div>
                              <span className="text-app-secondary text-[11px] uppercase tracking-wider mr-1">Expected Outcome:</span>
                              {step.expected_outcome}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendedActions.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
                    Recommended Operational Follow-ups
                  </div>
                  <ul className="space-y-2">
                    {recommendedActions.map((v: string, i: number) => {
                      const cleaned = v.replace(/^[\s•→\-–—]+/, "").trim();
                      return (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg bg-app-surface/60 border border-app-border/40 text-sm text-app-primary"
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <span className="leading-relaxed">
                            {cleaned
                              .split(/\*\*(.*?)\*\*/g)
                              .map((part: string, idx: number) =>
                                idx % 2 === 1 ? (
                                  <strong key={idx} className="font-bold text-app-primary">
                                    {part}
                                  </strong>
                                ) : (
                                  part
                                ),
                              )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 8: CONFIRM THE FIX & VALIDATE RECOVERY ───────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div id="sec-validate-recovery" className="space-y-4 pt-2 border-t border-app-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleSection(8)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left group"
              title={collapsedSections[8] ? "Expand Section 8" : "Collapse Section 8"}
            >
              <span className="text-app-secondary group-hover:text-app-primary transition-colors">
                {collapsedSections[8] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </span>
              <div className="text-xs font-bold text-app-primary group-hover:text-white transition-colors">
                8. Confirm the Fix & Validate Recovery
              </div>
            </button>
            <button
              type="button"
              onClick={() => toggleSection(8)}
              className="text-xs text-app-secondary hover:text-app-primary transition-colors"
            >
              {collapsedSections[8] ? "Expand" : "Collapse"}
            </button>
          </div>

          {!collapsedSections[8] && (
            <div className="space-y-4 pt-1">
              {/* Recovery Target Criteria (Part 8) */}
              {raw.recovery_success_criteria && (
                <div className="p-4 rounded-xl bg-app-surface border border-app-border space-y-3 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                        <Target className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-app-primary text-xs uppercase tracking-wider">
                        Recovery Target
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-app-input border border-app-border">
                      {raw.recovery_success_criteria.comparison_operator === "<" ? "Strictly below" : "At or below"} {raw.recovery_success_criteria.threshold_percentage || 25.0}%
                    </span>
                  </div>

                  {/* Clean Metric Grid (Part 8) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-app-input/30 border border-app-border/60">
                      <div className="text-[10px] text-app-secondary">Current Invalid Records</div>
                      <div className="font-mono font-bold text-rose-400 text-sm mt-0.5">
                        {raw.recovery_success_criteria.invalid_records ?? raw.invalid_records ?? "—"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-app-input/30 border border-app-border/60">
                      <div className="text-[10px] text-app-secondary">Maximum Allowed Invalid</div>
                      <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                        {raw.recovery_success_criteria.allowed_invalid_count ?? "—"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-app-input/30 border border-app-border/60">
                      <div className="text-[10px] text-app-secondary">Minimum Records to Correct or Exclude</div>
                      <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">
                        {raw.recovery_success_criteria.records_to_resolve ?? "—"}
                      </div>
                    </div>
                  </div>

                  {/* Mathematical Logic & Note */}
                  <p className="text-[11px] text-app-secondary leading-relaxed border-t border-app-border/40 pt-2 font-medium">
                    {raw.recovery_success_criteria.reason || raw.recovery_success_criteria.message}
                  </p>
                </div>
              )}

              {validation.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
                    Validation Steps
                  </div>
                  <ul className="space-y-2">
                    {validation.map((v: string, i: number) => {
                      const cleaned = v.replace(/^[\s•✓✓\-–—]+/, "").trim();
                      return (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm text-app-primary"
                        >
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            {cleaned
                              .split(/\*\*(.*?)\*\*/g)
                              .map((part: string, idx: number) =>
                                idx % 2 === 1 ? (
                                  <strong key={idx} className="font-bold text-app-primary">
                                    {part}
                                  </strong>
                                ) : (
                                  part
                                ),
                              )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Knowledge Base References (Supporting Context Only) (Part 9) ── */}
        {(() => {
          const raw = analysis.raw_response || {};
          const rawRefs: Array<{
            kind: string;
            title: string;
            similarity: number;
            risk_tier?: string;
            incident_id?: string;
            source?: string;
          }> = Array.isArray(raw.kb_references) ? raw.kb_references : [];
          
          // Deduplicate refs
          const seen = new Set<string>();
          const refs = rawRefs.filter((r) => {
            const key = `${r.kind}:${r.incident_id || r.title}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          if (refs.length === 0) return null;
          return (
            <div className="pt-6 border-t border-app-border">
              <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <BookOpen size={12} className="text-blue-500" />
                Similar Past Incidents & Runbooks (Supporting Context Only)
              </div>
              <p className="text-[11px] text-app-secondary/80 italic mb-3">
                Historical incident similarity provides supporting operational context only and does not override verified telemetry.
              </p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1.5 custom-scrollbar">
                {refs.map((ref, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-app-surface border border-app-border/60 hover:border-blue-500/40 transition-colors"
                  >
                    <div className="shrink-0 mt-0.5">
                      {ref.kind === "runbook" ? (
                        <BookOpen size={14} className="text-blue-500" />
                      ) : (
                        <History size={14} className="text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-app-primary truncate">
                          {ref.title}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                            ref.kind === "runbook"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
                          )}
                        >
                          {ref.kind === "runbook" ? "Runbook" : "Past Incident"}
                        </span>
                        {ref.risk_tier && (
                          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400">
                            {ref.risk_tier} Risk
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-app-secondary">
                          {Math.round(ref.similarity * 100)}% similarity
                        </span>
                        {ref.source && (
                          <span className="text-[10px] text-app-secondary truncate">
                            {ref.source}
                          </span>
                        )}
                        {ref.incident_id && (
                          <span className="text-[10px] text-app-secondary font-mono">
                            #{ref.incident_id}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            ref.similarity >= 0.8
                              ? "bg-emerald-500"
                              : ref.similarity >= 0.6
                                ? "bg-amber-500"
                                : "bg-rose-400",
                          )}
                          style={{ width: `${Math.round(ref.similarity * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {analysis.fix_patch && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowPatch((v) => !v)}
                className="flex items-center gap-2 text-[10px] font-bold text-app-brand uppercase tracking-widest hover:text-orange-500 transition-all"
              >
                {showPatch ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                Proposed Code Patch
              </button>
              <button
                onClick={() => {
                  if (!analysis?.fix_patch) return;
                  navigator.clipboard.writeText(analysis.fix_patch);
                  setCopiedPatch(true);
                  setTimeout(() => setCopiedPatch(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-app-secondary hover:text-app-primary hover:border-app-brand text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm active:scale-95"
                title="Copy patch to clipboard"
              >
                {copiedPatch ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy Patch</span>
                  </>
                )}
              </button>
            </div>
            {showPatch && (
              <pre className="bg-app-input border border-app-border/50 rounded-lg p-4 text-[11px] font-mono text-gray-300 overflow-auto max-h-80 whitespace-pre custom-scrollbar shadow-inner">
                {analysis.fix_patch}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
