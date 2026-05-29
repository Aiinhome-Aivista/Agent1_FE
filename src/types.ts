export type RiskTier = "Low" | "Medium" | "High";

export type IncidentStatus =
  | "Detected"
  | "Reasoning"
  | "Planning"
  | "Awaiting Approval"
  | "Processing" // NEW — set when DataOps Eng clicks Check button in email
  | "Executing"
  | "Evaluating"
  | "Remediated"
  | "Failed"
  | "Escalated";

export type PipelineStatus = "healthy" | "unhealthy" | "degraded" | "paused";

export type AgentRoleId =
  | "orchestrator"
  | "monitoring"
  | "diagnosis"
  | "remediation"
  | "optimization"
  | "learning";

export type ConnectorTypeId =
  | "Orchestrator"
  | "Monitoring"
  | "Logs"
  | "Ticketing"
  | "Communication"
  | "Git"
  | "Runtime"
  | "Cloud";

export type NodeTypeId = "sensor" | "ingest" | "transform" | "load";

export interface DAGNode {
  id: string;
  name: string;
  type: NodeTypeId;
  dependencies: string[];
  avg_runtime_sec?: number;
}

export interface ResourceMetric {
  time: string;
  cpu: number;
  memory: number;
  io: number;
}

export interface PipelineRun {
  id: string;
  pipeline_id: string;
  external_run_id: string;
  status: "SUCCEEDED" | "FAILED" | "CANCELLED" | "RUNNING" | "QUEUED" | string;
  started_at: string;
  duration_seconds: number | null;
  analysis?: any;
}

export interface Pipeline {
  id: string;
  connector_id: number;
  name: string;
  description?: string | null;
  status: PipelineStatus;
  last_run: string;
  throughput?: number;
  latency?: number;
  schedule?: string;
  owner?: string;
  sla_minutes?: number;
  dag?: DAGNode[];
  resource_metrics?: ResourceMetric[];
  runs: PipelineRun[];
  last_run_status?: string;
  last_run_at?: string;
  created_at?: string;
  tags: string[];
}

export interface ToolCallRecord {
  tool: string;
  args: Record<string, any>;
  result?: Record<string, any>;
  status?: string;
  duration_ms?: number;
}

export interface IncidentTimelineEntry {
  ts: string;
  stage: string;
  agent: string;
  detail: string;
}

export interface EscalationRecipient {
  email: string;
  role: string;
}

export interface IncidentEvent {
  id: number;
  incident_id: number;
  event_type: string;
  escalation_level?: string | null;
  recipients?: EscalationRecipient[] | null;
  related_run_id?: number | null;
  details?: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  pipeline_id: string;
  pipeline_name: string;
  status: IncidentStatus;
  risk_tier: RiskTier;
  detected_at: string;
  resolved_at?: string | null;
  error_log: string;
  failed_node?: string | null;
  root_cause?: string | null;
  proposed_action?: string | null;
  agent_thought?: string | null;
  remediation_plan?: string[] | null;
  similar_incidents: string[];
  confidence_score?: number | null;
  tool_calls: ToolCallRecord[];
  timeline: IncidentTimelineEntry[];

  // ─── Email-dispatch lifecycle (drives the Incident Timeline page) ──
  initial_email_sent_at?: string | null;
  initial_email_recipient?: string | null;
  initial_email_role?: string | null;
  escalation_email_sent_at?: string | null;
  escalation_email_recipients?: EscalationRecipient[] | null;

  // ─── NEW: Check-button acknowledgement + explicit user resolution ──
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  resolved?: "yes" | "no" | string | null;
  resolved_time?: string | null;

  jira_ticket_key?: string | null;
  jira_ticket_url?: string | null;

  // ─── Pipeline-level escalation tracking ──
  is_active?: boolean;
  escalation_count?: number;
  last_escalation_at?: string | null;
  last_known_run_count?: number;
}

export interface AgentStatus {
  role: AgentRoleId;
  name: string;
  description: string;
  color: string;
  status: "idle" | "thinking" | "acting" | "error";
  last_action: string;
  tasks_completed: number;
}

export interface Connector {
  id: string;
  name: string;
  type: ConnectorTypeId | string;
  status: "CONNECTED" | "ERROR" | "PENDING" | "NOT_CONFIGURED" | string;
  last_synced_at: string | null;
  last_error?: string | null;
  description?: string;
}

export interface ConnectorDetail extends Connector {
  type_id: string;
  config: Record<string, any>;
}

export interface ConnectorTypeField {
  name: string;
  label: string;
  kind: "text" | "password" | "url" | "select" | "textarea" | "number";
  placeholder?: string;
  required?: boolean;
  secret?: boolean;
  options?: string[];
  help?: string;
  default?: any;
}

export interface ConnectorType {
  type_id: string;
  name: string;
  category: string;
  description: string;
  icon_hint: string;
  fields: ConnectorTypeField[];
}

export interface MemoryEntry {
  id: string;
  kind: "episodic" | "semantic" | "procedural";
  title: string;
  summary: string;
  payload: Record<string, any>;
  tags: string[];
  created_at: string;
  success?: boolean | null;
  times_referenced: number;
  similarity?: number;
}

export interface LogEntry {
  id: string;
  time: string;
  msg: string;
  type: "info" | "warn" | "error" | "agent" | "tool";
  agent_role?: AgentRoleId | null;
  incident_id?: string | null;
}

export interface DashboardStats {
  total_connectors: number;
  total_pipelines: number;
  runs_last_24h: number;
  success_rate_24h: number;
  failed_runs_24h: number;
  pending_analyses: number;
}

export interface HealthMetric {
  time: string;
  tickets_raised: number;
  tickets_ai_solved: number;
  tickets_human_solved: number;
  mttr_minutes: number;
  success_rate: number;
}

export interface MetricsSummary {
  total_tickets: number;
  ai_resolved: number;
  human_resolved: number;
  ai_resolution_pct: number;
  mttr_avg_minutes: number;
  open_incidents: number;
  jira_tickets_created: number;
}

export interface Recommendation {
  id: string;
  pipeline_id: string;
  pipeline_name: string;
  title: string;
  detail: string;
  savings: string;
  risk: "Low" | "Medium" | "High";
  created_at: string;
  status: "open" | "accepted" | "dismissed";
}

export interface ToolSpec {
  name: string;
  description: string;
  args_schema: Record<string, string>;
  risk: "low" | "medium" | "high";
}

// ─────────────────────────────────────────────────────────────────────
// Runbook — now backed by the backend `/runbooks` API
// The legacy mock-data shape is kept here for backwards compat with the
// existing `RunbookDetailPanel.tsx` component. We add optional backend-only
// fields so the same component can render either shape.
// ─────────────────────────────────────────────────────────────────────
export interface Runbook {
  // legacy fields used by the existing UI components
  id: string | number;
  title: string;
  category: string;
  description: string;
  source: string;
  status:
    | "ACTIVE"
    | "DRAFT"
    | "ARCHIVED"
    | "AI GENERATED"
    | "PROCESSING"
    | "FAILED"
    | string;
  last_updated?: string;
  last_updated_by?: string;
  risk_level: "Low" | "Medium" | "High";
  ai_usage_enabled?: boolean;
  rag_enabled: boolean;
  ai_approved?: boolean;
  human_verified?: boolean;
  steps?: string[];
  associated_systems?: string[];
  last_incidents_used?: string[];
  version_history?: string[];
  tags: string[];
  ai_confidence_score?: number;
  linked_incidents_count?: number;

  // backend-only (when sourced from /runbooks API)
  source_filename?: string | null;
  size_bytes?: number;
  chunk_count?: number;
  ingest_error?: string | null;
  uploaded_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RunbookSearchHit {
  runbook_id: number | null;
  title: string | null;
  chunk_index: number | null;
  similarity: number;
  snippet: string;
}

export interface RunbookSearchResponse {
  query: string;
  hits: RunbookSearchHit[];
  elapsed_ms: number;
}

// ─────────────────────────────────────────────────────────────────────
// Performance metrics
// ─────────────────────────────────────────────────────────────────────
export interface PipelinePerformance {
  pipeline_id: number;
  pipeline_name: string;
  runs: number;
  succeeded: number;
  failed: number;
  success_rate_pct: number;
  avg_duration_sec: number;
  min_duration_sec: number;
  max_duration_sec: number;
  p50_duration_sec: number;
  p95_duration_sec: number;
  p99_duration_sec: number;
}

export interface RagKindSummary {
  query_count: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  hit_rate: number;
  avg_top_similarity: number;
}

export interface RagPerformance {
  collections: { incidents: number; runbooks: number };
  summary: {
    incidents: RagKindSummary;
    runbooks: RagKindSummary;
  };
}

export interface LlmPerformance {
  call_count: number;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  avg_prompt_chars: number;
}

export interface SystemMetrics {
  window_hours: number;
  pipelines: {
    count: number;
    runs_total: number;
    runs_succeeded: number;
    runs_failed: number;
    success_rate_pct: number;
    top_5_busiest: PipelinePerformance[];
  };
  rag: RagPerformance;
  llm: LlmPerformance;
}

// ─────────────────────────────────────────────────────────────────────
// LLM-suggested metadata returned by POST /runbooks/analyze
// ─────────────────────────────────────────────────────────────────────
export type RunbookCategory = "ADF" | "Databricks" | "Git" | "AWS Glue";

export const RUNBOOK_CATEGORIES: RunbookCategory[] = [
  "ADF",
  "Databricks",
  "Git",
  "AWS Glue",
];

export interface RunbookSuggestion {
  title: string;
  category: RunbookCategory | string;
  description: string;
  steps: string[];
  risk_level: "Low" | "Medium" | "High";
  tags: string[];
  llm_used: boolean;
  model?: string | null;
  latency_ms?: number | null;
  extracted_chars?: number;
  relevance_score?: number;
}
