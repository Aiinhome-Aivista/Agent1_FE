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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Header } from "../Header";
import { Loading } from "../Loading";
import { api } from "../../services/api";
import { cn } from "../../lib/utils";
import type { Pipeline } from "../../types";

interface RunInvestigationProps {
  runId: string;
  pipeline: Pipeline;
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
  const [showPatch, setShowPatch] = useState(true);
  const [copiedPatch, setCopiedPatch] = useState(false);
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
    <div className="flex-1 flex flex-col min-h-0 bg-app-bg">
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
            <div className="px-5 py-3 border-b border-app-border flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-app-brand" />
                <h3 className="text-sm font-bold text-app-primary">
                  Logs{" "}
                  <span className="text-xs font-mono text-app-secondary">
                    ({filteredLogs.length})
                  </span>
                </h3>
              </div>
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
            </div>
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
  const [copiedPatch, setCopiedPatch] = useState(false);
  const confidence = analysis.confidence ?? 0;

  const raw = analysis.raw_response || {};
  const explain = raw.confidence_explanation as
    | {
        level?: string;
        headline?: string;
        factors?: {
          label: string;
          detail: string;
          contribution: number;
          polarity: "positive" | "negative" | "neutral";
        }[];
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
  const impact = raw.impact || "";
  const longTermPrevention = raw.long_term_prevention || "";
  const recommendedActions = (Array.isArray(raw.recommended_actions) ? raw.recommended_actions : []).map(cleanItemText).filter(Boolean);

  const immediateFixes: {
    step: number;
    title: string;
    action: string;
    priority: "REQUIRED" | "OPTIONAL" | string;
    expected_outcome?: string;
    validation?: string;
  }[] = (() => {
    if (Array.isArray(raw.immediate_fix) && raw.immediate_fix.length > 0) {
      return raw.immediate_fix.map((item: any, idx: number) => ({
        step: Number(item.step || idx + 1),
        title: String(item.title || `Step ${idx + 1}`),
        action: String(item.action || item.description || ""),
        priority: "REQUIRED",
        expected_outcome: item.expected_outcome || undefined,
        validation: item.validation || undefined,
      }));
    }
    if (Array.isArray(raw.known_fix) && raw.known_fix.length > 0) {
      return raw.known_fix
        .filter((item: any) => String(item.priority || "").toUpperCase() === "REQUIRED" || !String(item.title || "").toLowerCase().includes("quarantine"))
        .map((item: any, idx: number) => ({
          step: idx + 1,
          title: String(item.title || item.action || `Step ${idx + 1}`),
          action: String(item.action || item.description || item.details || ""),
          priority: "REQUIRED",
          expected_outcome: item.expected_outcome || undefined,
          validation: item.validation || undefined,
        }));
    }
    return [];
  })();

  const optionalImprovements: {
    step: number;
    title: string;
    action: string;
    priority: "REQUIRED" | "OPTIONAL" | string;
    expected_outcome?: string;
    validation?: string;
  }[] = (() => {
    if (Array.isArray(raw.optional_improvements) && raw.optional_improvements.length > 0) {
      return raw.optional_improvements.map((item: any, idx: number) => ({
        step: Number(item.step || idx + 1),
        title: String(item.title || `Improvement ${idx + 1}`),
        action: String(item.action || item.description || ""),
        priority: "OPTIONAL",
        expected_outcome: item.expected_outcome || undefined,
        validation: item.validation || undefined,
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
          expected_outcome: item.expected_outcome || undefined,
          validation: item.validation || undefined,
        }));
    }
    return [];
  })();

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

        {/* Classification + confidence explanation */}
        {(classification || explain || raw.diagnosis_status === "partial") && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {raw.diagnosis_status === "partial" && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Partial Diagnosis
                </span>
              )}
              {classification && (
                <>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded",
                      classification.is_known
                        ? "bg-app-input text-emerald-400 border border-emerald-500/30"
                        : "bg-app-input text-amber-400 border border-amber-500/30",
                    )}
                  >
                    {classification.is_known ? "Known Pattern" : "New Error Type"}
                  </span>
                  {classification.matched_historical_incidents ? (
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      Matched historical incidents: {classification.matched_historical_incidents}
                    </span>
                  ) : null}
                  {classification.error_type && classification.error_type.toLowerCase() !== "unknown" ? (
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-app-input text-app-secondary border border-app-border/50">
                      Category: {classification.error_type}
                    </span>
                  ) : classification.is_known ? (
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-app-input text-app-secondary border border-app-border/50">
                      Category: Unclassified
                    </span>
                  ) : null}
                </>
              )}
            </div>

            {explain && showWhy && (
              <div className="bg-app-input border border-app-border/50 rounded-xl p-4 space-y-3 shadow-inner">
                <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                  Why confidence is {explain.level}
                </div>
                {explain.headline && (
                  <p className="text-xs text-app-primary leading-relaxed">
                    {explain.headline}
                  </p>
                )}
                <div className="space-y-2.5">
                  {(explain.factors || []).map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1.5 w-2 h-2 rounded-full shrink-0",
                          f.polarity === "positive"
                            ? "bg-emerald-500"
                            : f.polarity === "negative"
                              ? "bg-rose-500"
                              : "bg-gray-300",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-app-primary">
                            {f.label}
                          </span>
                          {f.contribution > 0 && (
                            <span className="text-[10px] font-mono text-app-secondary">
                              {Math.round(f.contribution * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-app-secondary leading-relaxed mt-0.5">
                          {f.detail}
                        </p>
                        {f.contribution > 0 && (
                          <div className="h-1 bg-app-border rounded-full overflow-hidden mt-1.5">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                f.polarity === "negative"
                                  ? "bg-rose-400"
                                  : "bg-blue-400",
                              )}
                              style={{
                                width: `${Math.max(4, Math.min(100, f.contribution * 100))}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
            Summary
          </div>
          <div className="text-sm text-app-primary leading-relaxed font-medium">
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
                <div className="font-mono font-bold text-amber-400 truncate" title={raw.failed_stage}>
                  {raw.failed_stage || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-app-secondary">Error Code</div>
                <div className="font-mono font-bold text-rose-400 truncate" title={raw.error_code}>
                  {raw.error_code || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-app-secondary">Failure Metric</div>
                <div className="font-mono font-bold text-app-primary">
                  {raw.invalid_records !== undefined && raw.total_records !== undefined
                    ? `${raw.invalid_records}/${raw.total_records} unique (${Number(raw.invalid_percentage || 0).toFixed(1)}% vs ${Number(raw.allowed_threshold || 5).toFixed(1)}%)`
                    : raw.allowed_threshold !== undefined
                      ? `Threshold: ${raw.allowed_threshold}%`
                      : "—"}
                </div>
              </div>
            </div>

            {/* Validation violation category breakdown */}
            {raw.validation_failures && Object.keys(raw.validation_failures).length > 0 && (
              <div className="pt-2.5 border-t border-app-border/40 text-[11px] text-app-secondary flex items-start gap-2 flex-wrap">
                <span className="font-bold text-app-primary">
                  Category Violations ({raw.validation_violations_total || 7} total):
                </span>
                {Object.entries(raw.validation_failures).map(([cat, cnt], i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-app-surface border border-app-border/50 text-app-primary font-mono text-[10px]">
                    {cat.replace(/_/g, " ")}: <strong>{String(cnt)}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {errorDetails && (
          <div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
              Error Details
            </div>
            <div className="text-sm text-app-primary leading-relaxed">
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

        {(() => {
          if (isDiagnosisFailed) {
            return (
              <div>
                <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
                  Pipeline Root Cause
                </div>
                <div className="text-sm text-app-secondary italic bg-app-surface p-4 rounded-lg border border-app-border leading-relaxed">
                  Not determinable because AI diagnosis did not complete. Review the execution logs above or re-run analysis.
                </div>
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

          return (
            analysis.root_cause && (
              <div>
                <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
                  Root Cause
                </div>
                <div className="text-sm text-app-primary whitespace-pre-wrap bg-app-surface p-4 rounded-lg border border-app-border leading-relaxed">
                  {analysis.root_cause
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
            )
          );
        })()}

        {rcDetails.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
              Pinpointed Evidence
            </div>
            <ul className="space-y-1.5">
              {rcDetails.map((d, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-app-primary"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {contributingFactors.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
              Contributing Factors
            </div>
            <ul className="space-y-1.5">
              {contributingFactors.map((d: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-app-primary"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="leading-relaxed">
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
              ))}
            </ul>
          </div>
        )}

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

        {impact && (
          <div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
              Impact
            </div>
            <div className="text-sm text-app-primary whitespace-pre-wrap bg-amber-500/10 p-4 rounded-lg border border-amber-500/30 leading-relaxed">
              {impact.split(/\*\*(.*?)\*\*/g).map((part: string, i: number) =>
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

        {/* Immediate Fix (Required Actions) */}
        {immediateFixes.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Immediate Fix ({immediateFixes.length} Required Recovery Actions)</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Required for Recovery
              </span>
            </div>
            <div className="space-y-3">
              {immediateFixes.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border text-sm leading-relaxed transition-all shadow-sm bg-emerald-500/5 border-emerald-500/30 border-l-4 border-l-emerald-500"
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-app-input border border-app-border flex items-center justify-center text-[10px] font-bold text-app-primary shrink-0">
                      {step.step || idx + 1}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Required Immediate Action
                    </span>
                    <span className="font-bold text-app-primary text-sm">
                      {step.title}
                    </span>
                  </div>

                  <div className="text-app-primary whitespace-pre-wrap pl-7 text-xs sm:text-sm leading-relaxed">
                    {step.action
                      .split(/\*\*(.*?)\*\*/g)
                      .map((part: string, i: number) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="font-bold text-app-primary not-italic">
                            {part}
                          </strong>
                        ) : (
                          part
                        ),
                      )}
                  </div>

                  {step.expected_outcome && (
                    <div className="mt-2.5 ml-7 pt-2 border-t border-app-border/40 flex items-start gap-2 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                      <div>
                        <span className="text-app-secondary text-[11px] uppercase tracking-wider mr-1">Expected Outcome:</span>
                        {step.expected_outcome}
                      </div>
                    </div>
                  )}

                  {step.validation && (
                    <div className="mt-1.5 ml-7 flex items-start gap-2 text-xs text-sky-400 font-medium">
                      <span className="text-app-secondary text-[11px] uppercase tracking-wider mr-1">Validation:</span>
                      {step.validation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Improvements (Runbook Recommendations) */}
        {optionalImprovements.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Optional Improvements ({optionalImprovements.length} Runbook Recommendations)</span>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                Runbook Enhancement
              </span>
            </div>
            <div className="space-y-3">
              {optionalImprovements.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border text-sm leading-relaxed transition-all shadow-sm bg-sky-500/5 border-sky-500/30 border-l-4 border-l-sky-500"
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-app-input border border-app-border flex items-center justify-center text-[10px] font-bold text-app-primary shrink-0">
                      {step.step || idx + 1}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Optional Runbook Improvement
                    </span>
                    <span className="font-bold text-app-primary text-sm">
                      {step.title}
                    </span>
                  </div>

                  <div className="text-app-primary whitespace-pre-wrap pl-7 text-xs sm:text-sm leading-relaxed">
                    {step.action}
                  </div>

                  {step.expected_outcome && (
                    <div className="mt-2.5 ml-7 pt-2 border-t border-app-border/40 flex items-start gap-2 text-xs text-sky-300 font-medium">
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

        {/* Long-term prevention */}
        {(() => {
          const ltpList = Array.isArray(raw.long_term_prevention)
            ? raw.long_term_prevention
            : longTermPrevention
              ? [longTermPrevention]
              : [];

          if (ltpList.length === 0) return null;

          return (
            <div>
              <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-2">
                Long-Term Prevention
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

        {/* ── Knowledge Base References ───────────────────────────────────── */}
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
              <div className="text-[10px] font-bold text-app-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <BookOpen size={12} className="text-blue-500" />
                {isDiagnosisFailed
                  ? "Historical Similar Incidents & Runbooks (Reference Only)"
                  : "Knowledge Base References"}
              </div>
              <div className="space-y-2">
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
