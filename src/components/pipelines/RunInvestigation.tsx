import { useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  ChevronDown,
  ChevronRight,
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
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-[#E5E7EB] mx-auto mb-4" />
          <h3 className="text-sm font-bold text-[#111827] mb-2">
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
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB]">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Back Action */}
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7280] hover:bg-gray-50 transition-all shadow-sm"
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
                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100",
                )}
              >
                {run.status}
              </span>
              <span className="font-mono text-xs text-[#6B7280]">
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
                className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded hover:bg-black transition-all shadow-sm disabled:opacity-50"
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
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={16}
                  className="text-rose-600 mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">
                    Error Message
                  </div>
                  <div className="text-sm font-mono text-[#111827] wrap-break-word">
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
              <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-50/50 blur-3xl rounded-full pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-md bg-blue-50 border border-blue-100">
                    <Sparkles size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#111827]">
                      {analysisMessage}
                    </div>
                    <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                      AI diagnosis has not been triggered for this run
                    </div>
                  </div>
                </div>
                <button
                  onClick={triggerAnalysis}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
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
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Logs{" "}
                  <span className="text-xs font-mono text-[#9CA3AF]">
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
                        ? "border-blue-600 text-blue-600 bg-blue-50"
                        : "border-[#E5E7EB] text-[#6B7280] hover:border-[#9CA3AF]",
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-[#111827] p-5 font-mono text-[11px] max-h-[600px] overflow-auto custom-scrollbar">
              {filteredLogs.length === 0 ? (
                <div className="text-[#4B5563] italic text-sm py-4 text-center">
                  No logs available for this run.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLogs.map((l, i) => (
                    <div
                      key={i}
                      className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group"
                    >
                      <span className="text-[#4B5563] shrink-0 select-none">
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
                        <span className="text-blue-400 shrink-0 max-w-[150px] truncate">
                          {l.source}
                        </span>
                      )}
                      <span
                        className={cn(
                          "flex-1 whitespace-pre-wrap wrap-break-word",
                          l.level === "ERROR"
                            ? "text-rose-200"
                            : "text-gray-300",
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
    if (!rootCause) return null;

    // Extract JSON from markdown code block if present
    // Handles ```json, ```JSON, or just ```
    let jsonStr = rootCause.trim();
    const match = jsonStr.match(/```(?:json)?\n?([\s\S]*?)```/i);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // If parsing fails, try to repair truncated JSON
      const repaired = repairJson(jsonStr);
      return JSON.parse(repaired);
    }
  } catch (e) {
    console.error("Root cause parse failed:", e);
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
        <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
            <Database size={12} className="text-blue-500" /> Source
          </div>
          <div className="text-sm font-bold text-[#111827]">
            {renderValue(source)}
          </div>
          <div className="text-[10px] font-medium text-[#6B7280] mt-1 truncate">
            {renderValue(pipeline)}
          </div>
        </div>

        <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
            <Activity size={12} className="text-amber-500" /> Task
          </div>
          <div className="text-sm font-bold text-[#111827] truncate">
            {renderValue(task)}
          </div>
          <div className="text-[10px] font-medium text-rose-600 mt-1 uppercase tracking-tighter">
            {renderValue(data.error?.status || data.status, "FAILED")}
          </div>
        </div>

        <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
            <User size={12} className="text-emerald-500" /> Creator
          </div>
          <div className="text-sm font-bold text-[#111827] truncate">
            {renderValue(creator).split("@")[0]}
          </div>
          <div className="text-[10px] font-medium text-[#6B7280] mt-1 truncate">
            {renderValue(creator)}
          </div>
        </div>

        <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
            <Info size={12} className="text-purple-500" /> Severity
          </div>
          <div
            className={cn(
              "inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
              severity === "high"
                ? "bg-rose-50 text-rose-600 border-rose-100"
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
          <AlertTriangle size={14} className="text-rose-600" />
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
            Deep Error Analysis
          </span>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Incident Summary
            </div>
            <div className="text-sm font-mono text-[#111827] bg-white border border-rose-100 p-4 rounded-xl shadow-inner leading-relaxed">
              {renderValue(summary, "No top-level error message provided.")}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Contextual Findings
            </div>
            {typeof detailedError === "object" && detailedError !== null ? (
              <div className="space-y-3">
                <div className="text-sm text-[#4B5563] leading-relaxed italic">
                  {renderValue(
                    detailedError.message ||
                      detailedError.error ||
                      "No detailed message provided.",
                  )}
                </div>
                {detailedError.logs && (
                  <div className="bg-[#111827] text-gray-400 p-3 rounded-lg font-mono text-[10px] overflow-x-auto border border-[#1F2937] shadow-inner">
                    <div className="text-[8px] font-bold text-[#4B5563] uppercase tracking-widest mb-2 border-b border-[#1F2937] pb-1">
                      Technical Logs
                    </div>
                    {detailedError.logs}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-[#4B5563] leading-relaxed italic">
                {renderValue(
                  detailedError,
                  "No detailed explanation available.",
                )}
              </div>
            )}

            {/* Render structured error logs if they exist at error.logs level */}
            {Array.isArray(data.error?.logs) && data.error.logs.length > 0 && (
              <div className="mt-4 bg-[#111827] rounded-xl overflow-hidden border border-[#1F2937] shadow-lg">
                <div className="px-4 py-2 border-b border-[#1F2937] bg-[#1F2937]/30 flex items-center gap-2">
                  <Terminal size={10} className="text-blue-400" />
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                    Forensic Log Extract
                  </span>
                </div>
                <div className="p-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {data.error.logs.map((log: any, lIdx: number) => (
                    <div
                      key={lIdx}
                      className="flex gap-3 font-mono text-[10px] group"
                    >
                      <span className="text-[#4B5563] shrink-0">
                        {log.timestamp?.split("T")[1] || "LOG"}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-bold",
                          log.level === "ERROR"
                            ? "text-rose-500"
                            : "text-blue-500",
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
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
            <Wrench size={14} className="text-blue-600" /> Forensic
            Recommendations
          </div>
          <div className="grid grid-cols-1 gap-4">
            {actions.map((action: any, idx: number) => (
              <div
                key={idx}
                className="group bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#111827]">
                          {renderValue(action.action, "Recommended Action")}
                        </h4>
                        <p className="text-[11px] text-[#6B7280]">
                          {renderValue(action.description)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all",
                        action.priority === "high"
                          ? "bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-100"
                          : action.priority === "medium"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-[#F9FAFB] text-[#9CA3AF] border-[#F3F4F6]",
                      )}
                    >
                      {renderValue(action.priority || "Action Item")}
                    </div>
                  </div>

                  {Array.isArray(action.steps) && action.steps.length > 0 && (
                    <div className="pl-11 space-y-3">
                      <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <List size={10} /> Execution Steps
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {action.steps.map((step: string, sIdx: number) => (
                          <div
                            key={sIdx}
                            className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F9FAFB] border border-[#F3F4F6] group-hover:bg-white group-hover:border-blue-50 transition-colors"
                          >
                            <CheckCircle2
                              size={12}
                              className="text-emerald-500 mt-0.5 shrink-0"
                            />
                            <span className="text-xs text-[#4B5563] leading-snug">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#F3F4F6]">
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3 flex items-center gap-1.5">
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
                <span className="text-[10px] text-[#9CA3AF] italic">
                  No specific causes flagged.
                </span>
              )}
            </div>
          </div>
          {data.additional_context?.impact && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">
                Business Impact Assessment
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed italic">
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
  const [showPatch, setShowPatch] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
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

  const rcDetails: string[] = Array.isArray(raw.root_cause_details)
    ? raw.root_cause_details
    : [];
  const validation: string[] = Array.isArray(raw.validation_steps)
    ? raw.validation_steps
    : [];
  const classification = raw.classification as
    | { is_known?: boolean; error_type?: string; reason?: string }
    | undefined;

  // New Industry-Standard RCA fields
  const errorDetails = raw.error_details || "";
  const contributingFactors = raw.contributing_factors || [];
  const failureMechanism = raw.failure_mechanism || "";
  const impact = raw.impact || "";
  const longTermPrevention = raw.long_term_prevention || "";
  const recommendedActions = raw.recommended_actions || [];

  return (
    <div className="bg-white border border-blue-100 rounded-xl shadow-sm relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-50/30 blur-3xl rounded-full pointer-events-none" />

      <div className="px-5 py-4 border-b border-blue-50 bg-blue-50/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-white border border-blue-100 shadow-sm">
            <Sparkles size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              Agentic Ops Diagnosis
              {/* {analysis.model && (
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-widest">
                  {analysis.model}
                </span>
              )} */}
            </div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mt-0.5">
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
          <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
            Confidence
          </span>
          <div className="w-24 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                confidence >= 0.7
                  ? "bg-emerald-500"
                  : confidence >= 0.4
                    ? "bg-amber-500"
                    : "bg-rose-500",
              )}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-bold font-mono",
              confidence >= 0.7
                ? "text-emerald-600"
                : confidence >= 0.4
                  ? "text-amber-600"
                  : "text-rose-600",
            )}
          >
            {Math.round(confidence * 100)}%
          </span>
          {explain && (
            <button
              onClick={() => setShowWhy((v) => !v)}
              className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
            >
              {showWhy ? "Hide" : "Why?"}
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Classification + confidence explanation */}
        {(classification || explain) && (
          <div className="space-y-3">
            {classification && (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded",
                    classification.is_known
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  {classification.is_known ? "Known error" : "New error type"}
                </span>
                {classification.error_type && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {classification.error_type}
                  </span>
                )}
              </div>
            )}

            {explain && showWhy && (
              <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">
                  Why confidence is {explain.level}
                </div>
                {explain.headline && (
                  <p className="text-xs text-[#374151] leading-relaxed">
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
                          <span className="text-xs font-bold text-[#111827]">
                            {f.label}
                          </span>
                          {f.contribution > 0 && (
                            <span className="text-[10px] font-mono text-gray-400">
                              {Math.round(f.contribution * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6B7280] leading-relaxed mt-0.5">
                          {f.detail}
                        </p>
                        {f.contribution > 0 && (
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1.5">
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
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
            Incident Summary
          </div>
          <div className="text-sm text-[#111827] leading-relaxed font-medium">
            {analysis.summary}
          </div>
        </div>
        
        {errorDetails && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Error Details
            </div>
            <div className="text-sm text-[#4B5563] leading-relaxed">
              {errorDetails.split(/\*\*(.*?)\*\*/g).map((part: string, i: number) => 
                i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900">{part}</strong> : part
              )}
            </div>
          </div>
        )}

        {(() => {
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
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
                  Root Cause
                </div>
                <div className="text-sm text-[#4B5563] whitespace-pre-wrap bg-[#F9FAFB] p-4 rounded-lg border border-[#F3F4F6] leading-relaxed">
                  {analysis.root_cause.split(/\*\*(.*?)\*\*/g).map((part: string, i: number) => 
                    i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900">{part}</strong> : part
                  )}
                </div>
              </div>
            )
          );
        })()}

        {rcDetails.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Pinpointed Evidence
            </div>
            <ul className="space-y-1.5">
              {rcDetails.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#4B5563]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {contributingFactors.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Contributing Factors
            </div>
            <ul className="space-y-1.5">
              {contributingFactors.map((d: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#4B5563]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="leading-relaxed">
                    {d.split(/\*\*(.*?)\*\*/g).map((part: string, idx: number) => 
                      idx % 2 === 1 ? <strong key={idx} className="font-bold text-gray-900">{part}</strong> : part
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {failureMechanism && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Failure Mechanism
            </div>
            <div className="text-sm text-[#4B5563] whitespace-pre-wrap bg-rose-50 p-4 rounded-lg border border-rose-100 leading-relaxed">
              {failureMechanism.split(/\*\*(.*?)\*\*/g).map((part: string, i: number) => 
                i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900">{part}</strong> : part
              )}
            </div>
          </div>
        )}

        {impact && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Impact
            </div>
            <div className="text-sm text-[#4B5563] leading-relaxed">
              {impact.split(/\*\*(.*?)\*\*/g).map((part: string, i: number) => 
                i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900">{part}</strong> : part
              )}
            </div>
          </div>
        )}

        {analysis.suggested_fix && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Immediate Fix
            </div>
            <div className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed italic border-l-4 border-emerald-500 pl-4 py-2">
              {analysis.suggested_fix.split(/\*\*(.*?)\*\*/g).map((part: string, i: number) => 
                i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900 not-italic">{part}</strong> : part
              )}
            </div>
          </div>
        )}

        {longTermPrevention && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Long-Term Prevention
            </div>
            <div className="text-sm text-[#4B5563] leading-relaxed">
              {longTermPrevention.split(/\*\*(.*?)\*\*/g).map((part: string, i: number) => 
                i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900">{part}</strong> : part
              )}
            </div>
          </div>
        )}

        {recommendedActions.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Recommended Actions
            </div>
            <ul className="space-y-1.5">
              {recommendedActions.map((v: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#4B5563]">
                  <span className="mt-0.5 text-blue-500 shrink-0">→</span>
                  <span className="leading-relaxed">
                    {v.split(/\*\*(.*?)\*\*/g).map((part: string, idx: number) => 
                      idx % 2 === 1 ? <strong key={idx} className="font-bold text-gray-900">{part}</strong> : part
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {validation.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Validation Steps
            </div>
            <ul className="space-y-1.5">
              {validation.map((v: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#4B5563]">
                  <span className="mt-0.5 text-emerald-500 shrink-0">✓</span>
                  <span className="leading-relaxed">
                    {v.split(/\*\*(.*?)\*\*/g).map((part: string, idx: number) => 
                      idx % 2 === 1 ? <strong key={idx} className="font-bold text-gray-900">{part}</strong> : part
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.fix_patch && (
          <div>
            <button
              onClick={() => setShowPatch((v) => !v)}
              className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-all mb-2"
            >
              {showPatch ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              Proposed Code Patch
            </button>
            {showPatch && (
              <pre className="bg-[#111827] border border-[#374151] rounded-lg p-4 text-[11px] font-mono text-gray-300 overflow-auto max-h-80 whitespace-pre custom-scrollbar shadow-inner">
                {analysis.fix_patch}
              </pre>
            )}
          </div>
        )}

        {analysis.fix_patch && (
          <div className="pt-6 border-t border-[#F3F4F6] flex items-center justify-between flex-wrap gap-4">
            <div className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">
              {analysis.auto_fix_applied ? (
                <span className="text-emerald-600">
                  ✓ Fix submitted: {analysis.auto_fix_result}
                </span>
              ) : (
                "Actionable resolution available for this failure"
              )}
            </div>
            {!analysis.auto_fix_applied && (
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-emerald-700 transition-all shadow-sm">
                <Wrench size={14} />
                Apply Fix to Source
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
