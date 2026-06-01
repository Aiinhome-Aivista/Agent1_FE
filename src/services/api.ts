import type {
  AgentStatus,
  Connector,
  ConnectorDetail,
  ConnectorType,
  DashboardStats,
  HealthMetric,
  Incident,
  IncidentEvent,
  LogEntry,
  MemoryEntry,
  MetricsSummary,
  Pipeline,
  Recommendation,
  Runbook,
  RunbookSearchResponse,
  RunbookSuggestion,
  PipelinePerformance,
  RagPerformance,
  LlmPerformance,
  SystemMetrics,
  ToolSpec,
  SolutionPattern,
  SolutionKBStats,
  ClassifyResult,
  RaisePRResult,
  KBSettings,
} from "../types";

const BASE = "/api/v1";
const TOKEN_KEY = "auth_token";

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isAuthed: () => !!localStorage.getItem(TOKEN_KEY),
};

let activeRequests = 0;
let loadingListener: ((loading: boolean) => void) | null = null;
let errorListener: ((err: string) => void) | null = null;

export const apiEvents = {
  onLoading: (cb: (loading: boolean) => void) => {
    loadingListener = cb;
  },
  onError: (cb: (err: string) => void) => {
    errorListener = cb;
  },
};

function updateLoading(delta: number) {
  activeRequests += delta;
  loadingListener?.(activeRequests > 0);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  updateLoading(1);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      ...(init?.headers as Record<string, string> | undefined),
    };
    const tok = auth.getToken();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;

    let res;
    try {
      res = await fetch(`${BASE}${path}`, {
        ...init,
        headers,
        cache: "no-store",
      });
    } catch (e: any) {
      const msg = e.message || "Network connection failed";
      errorListener?.(msg);
      throw e;
    }

    if (res.status === 401) {
      auth.clearToken();
      if (!path.startsWith("/auth")) {
        window.location.href = "/login";
      }
      throw new Error("unauthenticated");
    }
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body?.detail) detail = body.detail;
      } catch {
        // ignore
      }
      errorListener?.(detail);
      throw new Error(detail);
    }
    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
  } finally {
    updateLoading(-1);
  }
}

/**
 * Multipart upload helper. Cannot use req() because that one hard-codes
 * Content-Type: application/json, which kills the multipart boundary.
 */
async function uploadForm<T>(path: string, formData: FormData): Promise<T> {
  updateLoading(1);
  try {
    const headers: Record<string, string> = {};
    const tok = auth.getToken();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;

    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      body: formData,
      headers,
    });

    if (res.status === 401) {
      auth.clearToken();
      window.location.href = "/login";
      throw new Error("unauthenticated");
    }
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body?.detail) detail = body.detail;
      } catch {
        /* ignore */
      }
      errorListener?.(detail);
      throw new Error(detail);
    }
    return res.json() as Promise<T>;
  } finally {
    updateLoading(-1);
  }
}

export const api = {
  login: (email: string, password: string) =>
    req<{ access_token: string; expires_in: number }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => req<{ id: string; email: string; is_admin: boolean }>("/auth/me"),
  health: () => req<{ status: string; env: string; llm: string }>("/health"),

  pipelines: (params?: { connector_id?: string | number }) => {
    const q = params?.connector_id
      ? `?connector_id=${params.connector_id}`
      : "";
    return req<Pipeline[]>(`/pipelines${q}`);
  },
  pipeline: (id: string) => req<Pipeline>(`/pipelines/${id}`),
  run: (id: string) => req<any>(`/runs/${id}`),
  runLogs: (id: string) => req<any[]>(`/runs/${id}/logs`),
  runAnalysis: (id: string) => req<any>(`/runs/${id}/analysis`),
  triggerRunAnalysis: (id: string, force: boolean = false) =>
    req<any>(`/runs/${id}/analyze${force ? "?force=true" : ""}`, {
      method: "POST",
    }),

  incidents: (tab?: "open" | "closed" | "all") =>
    req<Incident[]>(`/incidents${tab ? `?tab=${tab}` : ""}`),
  incident: (id: string) => req<Incident>(`/incidents/${id}`),
  incidentEvents: (id: string | number) =>
    req<IncidentEvent[]>(`/incidents/${id}/events`),
  triggerIncident: (body: {
    pipeline_id?: string;
    pipeline_name?: string;
    run_id?: string;
    error_log?: string;
    failed_node?: string;
  }) =>
    req<Incident>("/incidents/trigger", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  approveIncident: (id: string) =>
    req<{ ok: boolean }>(`/incidents/${id}/approve`, { method: "POST" }),
  rejectIncident: (id: string) =>
    req<{ ok: boolean }>(`/incidents/${id}/reject`, { method: "POST" }),
  deleteIncident: (id: string) =>
    fetch(`${BASE}/incidents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.getToken() || ""}` },
    }).then((r) => {
      if (!r.ok && r.status !== 204)
        throw new Error(`${r.status} ${r.statusText}`);
    }),
  deleteIncidents: ({ status }: { status: "closed" | "open" | "all" }) =>
    fetch(`${BASE}/incidents?status=${status}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.getToken() || ""}` },
    }).then(async (r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json() as Promise<{ deleted: number; status: string }>;
    }),

  memory: (kind?: string) =>
    req<MemoryEntry[]>(`/memory${kind ? `?kind=${kind}` : ""}`),
  searchMemory: (q: string, kind = "episodic", k = 5) =>
    req<MemoryEntry[]>(
      `/memory/search?q=${encodeURIComponent(q)}&kind=${kind}&k=${k}`,
    ),
  createMemory: (
    entry: Omit<MemoryEntry, "id" | "created_at" | "times_referenced">,
  ) =>
    req<MemoryEntry>("/memory", {
      method: "POST",
      body: JSON.stringify(entry),
    }),

  audit: (limit = 200) => req<LogEntry[]>(`/audit?limit=${limit}`),
  connectors: () => req<Connector[]>("/connectors"),
  connectorTypes: () => req<ConnectorType[]>("/connectors/types"),
  getConnector: (id: string) => req<ConnectorDetail>(`/connectors/${id}`),
  upsertConnector: (body: {
    type: string;
    name?: string;
    credentials: Record<string, any>;
  }) =>
    req<ConnectorDetail>("/connectors", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteConnector: (id: string) =>
    fetch(`${BASE}/connectors/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.getToken() || ""}` },
    }).then((r) => {
      if (!r.ok && r.status !== 204)
        throw new Error(`${r.status} ${r.statusText}`);
    }),
  testConnector: (id: string) =>
    req<{ status: string; detail: string }>(`/connectors/${id}/test`, {
      method: "POST",
    }),
  syncConnector: (id: string) =>
    req<{ queued: boolean; stats: any }>(`/connectors/${id}/sync`, {
      method: "POST",
    }),
  tools: () => req<ToolSpec[]>("/tools"),

  recommendations: () => req<Recommendation[]>("/recommendations"),
  regenerateRecommendations: () =>
    req<{ count: number; items: Recommendation[] }>(
      "/recommendations/regenerate",
      { method: "POST" },
    ),
  updateRecommendation: (
    id: string,
    status: "open" | "accepted" | "dismissed",
  ) =>
    req<Recommendation>(`/recommendations/${id}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  metricsHealth: () => req<HealthMetric[]>("/metrics/health"),
  metricsSummary: () => req<MetricsSummary>("/metrics/summary"),
  stats: () => req<DashboardStats>("/dashboard/stats"),

  connectAWSGlue: (credentials: {
    name: string;
    aws_access_key_id: string;
    aws_secret_access_key: string;
    region_name: string;
  }) =>
    req<any>("/aws-glue/connect", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  // ─────────────────────────────────────────────────────────────────
  // NEW: Runbooks
  // ─────────────────────────────────────────────────────────────────
  runbooks: (includeArchived = false) =>
    req<Runbook[]>(
      `/runbooks${includeArchived ? "?include_archived=true" : ""}`,
    ),

  runbook: (id: number | string) => req<Runbook>(`/runbooks/${id}`),

  /**
   * PHASE 1 of the runbook ingestion flow.
   * Sends the file to the backend, which extracts text and asks Mistral to
   * suggest title/category/description/steps/tags. Nothing is persisted.
   */
  analyzeRunbook: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return uploadForm<RunbookSuggestion>("/runbooks/analyze", fd);
  },

  uploadRunbook: (params: {
    file: File;
    title?: string;
    category?: string;
    description?: string;
    risk_level?: "Low" | "Medium" | "High";
    tags?: string[];
    rag_enabled?: boolean;
  }) => {
    const fd = new FormData();
    fd.append("file", params.file);
    if (params.title) fd.append("title", params.title);
    if (params.category) fd.append("category", params.category);
    if (params.description) fd.append("description", params.description);
    if (params.risk_level) fd.append("risk_level", params.risk_level);
    if (params.tags?.length) fd.append("tags_csv", params.tags.join(","));
    fd.append("rag_enabled", String(params.rag_enabled ?? true));
    return uploadForm<Runbook>("/runbooks/upload", fd);
  },

  archiveRunbook: (id: number | string) =>
    req<Runbook>(`/runbooks/${id}/archive`, { method: "POST" }),

  deleteRunbook: (id: number | string) =>
    fetch(`${BASE}/runbooks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.getToken() || ""}` },
    }).then((r) => {
      if (!r.ok && r.status !== 204)
        throw new Error(`${r.status} ${r.statusText}`);
    }),

  downloadRunbookUrl: (id: number | string) =>
    `${BASE}/runbooks/${id}/download`,

  searchRunbooks: (query: string, k = 5) =>
    req<RunbookSearchResponse>("/runbooks/search", {
      method: "POST",
      body: JSON.stringify({ query, k }),
    }),

  // ─────────────────────────────────────────────────────────────────
  // NEW: Performance metrics
  // ─────────────────────────────────────────────────────────────────
  pipelinePerformance: (hours = 24) =>
    req<PipelinePerformance[]>(`/metrics/pipelines?hours=${hours}`),

  pipelinePerformanceDetail: (id: number | string, hours = 24) =>
    req<PipelinePerformance>(`/metrics/pipelines/${id}?hours=${hours}`),

  ragPerformance: () => req<RagPerformance>("/metrics/rag"),

  llmPerformance: () => req<LlmPerformance>("/metrics/llm"),

  systemMetrics: (hours = 24) =>
    req<SystemMetrics>(`/metrics/system?hours=${hours}`),

  // ─────────────────────────────────────────────────────────────────
  // NEW: Solution Knowledge Base + auto-fix (learning loop)
  // ─────────────────────────────────────────────────────────────────
  solutions: (limit = 100) =>
    req<SolutionPattern[]>(`/solutions?limit=${limit}`),

  solution: (id: number | string) =>
    req<SolutionPattern>(`/solutions/${id}`),

  solutionStats: () => req<SolutionKBStats>("/solutions/stats"),

  classifyError: (body: {
    error_text: string;
    component?: string;
    llm_confidence?: number;
  }) =>
    req<ClassifyResult>("/solutions/classify", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  raisePR: (incidentId: number | string) =>
    req<RaisePRResult>(`/incidents/${incidentId}/raise-pr`, {
      method: "POST",
    }),

  ingestPR: (
    incidentId: number | string,
    body: {
      pr_url: string;
      diff: string;
      pr_number?: number;
      merged_by?: string;
      file_path?: string;
      new_content?: string;
      explanation?: string;
    },
  ) =>
    req<{
      ok: boolean;
      pattern_id: number;
      is_auto_fixable: boolean;
      confidence: number;
      acceptance_count: number;
    }>(`/incidents/${incidentId}/ingest-pr`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ─────────────────────────────────────────────────────────────────
  // NEW: Knowledge-base schedule + enrichment
  // ─────────────────────────────────────────────────────────────────
  kbSettings: () => req<KBSettings>("/kb/settings"),

  updateKbSettings: (body: {
    daily_refresh_enabled?: boolean;
    daily_refresh_time?: string;
  }) =>
    req<KBSettings>("/kb/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  kbStatus: () =>
    req<{ settings: KBSettings; kb: SolutionKBStats }>("/kb/status"),

  kbRefreshNow: () =>
    req<Record<string, unknown>>("/kb/refresh", { method: "POST" }),

  updateIncidentFix: (
    incidentId: number | string,
    body: { root_cause?: string; fix_steps?: string[]; approve?: boolean },
  ) =>
    req<{
      ok: boolean;
      enriched: Record<string, unknown>;
      confidence: number;
      pattern_id: number | null;
    }>(`/incidents/${incidentId}/update-fix`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const tok = auth.getToken() || "";
  return `${proto}://${window.location.host}/ws?token=${encodeURIComponent(tok)}`;
}
