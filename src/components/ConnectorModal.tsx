import { AnimatePresence, motion } from "motion/react";
import {
  Database,
  GitBranch,
  Workflow,
  X,
  Plus,
  TestTube2,
  Trash2,
  ChevronLeft,
  PlayCircle,
  Pencil,
  Zap,
} from "lucide-react";
import { timeAgo } from "../lib/utils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { Connector } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  connectors?: Connector[];
  onChange?: () => void;
  initialView?: View;
}

type ConnectorTypeKey = "ADF" | "DATABRICKS" | "GIT" | "AWS_GLUE";

interface CredMap {
  ADF: {
    type: string;
    tenant_id: string;
    subscription_id: string;
    client_id: string;
    client_secret: string;
    resource_group: string;
    factory_name: string;
  };
  DATABRICKS: {
    type: string;
    workspace_url: string;
    personal_access_token: string;
  };
  GIT: {
    type: string;
    provider: string;
    token: string;
    owner: string;
    repo: string;
  };
  AWS_GLUE: {
    aws_access_key_id: string;
    aws_secret_access_key: string;
    region_name: string;
  };
}

const TYPE_OPTIONS: {
  value: ConnectorTypeKey;
  label: string;
  help: string;
  typeId: string;
}[] = [
  {
    value: "ADF",
    label: "Azure Data Factory",
    help: "Service Principal via Azure AD",
    typeId: "ADF",
  },
  {
    value: "DATABRICKS",
    label: "Databricks",
    help: "Personal Access Token",
    typeId: "DATABRICKS",
  },
  {
    value: "GIT",
    label: "GitHub Actions",
    help: "Personal Access Token",
    typeId: "GIT",
  },
  {
    value: "AWS_GLUE",
    label: "AWS Glue",
    help: "IAM User Access Keys",
    typeId: "AWS_GLUE",
  },
];

const EMPTY_CREDS: CredMap = {
  ADF: {
    type: "ADF",
    tenant_id: "",
    subscription_id: "",
    client_id: "",
    client_secret: "",
    resource_group: "",
    factory_name: "",
  },
  DATABRICKS: {
    type: "DATABRICKS",
    workspace_url: "",
    personal_access_token: "",
  },
  GIT: { type: "GIT", provider: "github", token: "", owner: "", repo: "" },
  AWS_GLUE: {
    aws_access_key_id: "",
    aws_secret_access_key: "",
    region_name: "us-east-1",
  },
};

const STATUS_DOT: Record<string, string> = {
  CONNECTED: "bg-app-brand",
  ERROR: "bg-app-secondary",
  PENDING: "bg-app-btn",
  connected: "bg-app-brand",
  error: "bg-app-secondary",
  not_configured: "bg-app-placeholder",
  pending: "bg-app-btn",
};

// ─── Icon component ───────────────────────────────────────────────────────────

function ConnectorIcon({ type, size = 16 }: { type: string; size?: number }) {
  const cfg: Record<string, { icon: React.ElementType; color: string }> = {
    ADF: { icon: Workflow, color: "text-app-secondary" },
    DATABRICKS: { icon: Database, color: "text-app-brand" },
    GIT: { icon: GitBranch, color: "text-app-primary" },
    AWS_GLUE: { icon: Zap, color: "text-app-brand" },
  };
  const { icon: Icon, color } = cfg[type] ?? cfg.ADF;
  return <Icon size={size} className={color} strokeWidth={2.25} />;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type View = "list" | "new";

export function ConnectorModal({
  open,
  onClose,
  onSuccess,
  connectors,
  onChange,
  initialView,
}: Props) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("list");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [internalConnectors, setInternalConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<
    Record<string, { status: string; detail: string }>
  >({});

  const fetchConnectors = async () => {
    setLoading(true);
    try {
      const data = await api.connectors();
      setInternalConnectors(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load connectors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setView(initialView ?? "list");
      setErr(null);
      if (!connectors) {
        fetchConnectors();
      }
    }
  }, [open, initialView, connectors]);

  const activeConnectors = connectors || internalConnectors;
  const onDataChange = () => {
    onChange?.();
    if (!connectors) fetchConnectors();
  };

  const remove = async (c: Connector) => {
    setBusy(c.id);
    try {
      await api.deleteConnector(c.id);
      onDataChange();
      onSuccess?.();
    } catch (e: any) {
      setErr(e.message || "delete failed");
    } finally {
      setBusy(null);
    }
  };

  const test = async (c: Connector) => {
    setBusy(c.id);
    try {
      const r = await api.testConnector(c.id);
      setTestResults((s) => ({ ...s, [c.id]: r }));
      onDataChange();
    } catch (e: any) {
      setTestResults((s) => ({
        ...s,
        [c.id]: { status: "error", detail: e.message },
      }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="bg-app-surface rounded-2xl border border-app-border w-full max-w-2xl max-h-[85vh] sm:max-h-[88vh] flex flex-col shadow-2xl my-auto relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-app-border bg-app-surface shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                {view === "new" && (
                  <button
                    onClick={() => setView("list")}
                    className="text-app-secondary hover:text-app-primary"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-app-primary">
                    {view === "list" ? "Connectors" : "New connector"}
                  </h2>
                  <p className="text-xs text-app-secondary mt-0.5">
                    {view === "list"
                      ? "Add, edit, test, or remove integrations."
                      : "Credentials are encrypted at rest with Fernet"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#9CA3AF] hover:text-app-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {err && (
              <div className="mx-6 mt-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {err}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {view === "list" && (
                <ListView
                  connectors={activeConnectors}
                  loading={loading && activeConnectors.length === 0}
                  busy={busy}
                  testResults={testResults}
                  onAdd={() => {
                    setErr(null);
                    setView("new");
                  }}
                  onTest={test}
                  onDelete={remove}
                  onViewPipelines={(c) => {
                    navigate(`/app/pipelines?connector_id=${c.id}`);
                    onClose();
                  }}
                />
              )}
              {view === "new" && (
                <NewConnectorForm
                  onSaved={() => {
                    onDataChange();
                    onSuccess?.();
                    setView("list");
                  }}
                  onCancel={onClose}
                  onError={setErr}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({
  connectors,
  loading,
  busy,
  testResults,
  onAdd,
  onTest,
  onDelete,
  onViewPipelines,
}: {
  connectors: Connector[];
  loading?: boolean;
  busy: string | null;
  testResults: Record<string, { status: string; detail: string }>;
  onAdd: () => void;
  onTest: (c: Connector) => void;
  onDelete: (c: Connector) => void;
  onViewPipelines: (c: Connector) => void;
}) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase font-black tracking-[0.18em] text-[#9CA3AF]">
          Configured connectors ({connectors.length})
        </h3>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-app-brand text-white text-xs font-medium hover:bg-app-hover"
        >
          <Plus className="w-3.5 h-3.5" />
          Add connector
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-app-secondary py-8 text-center animate-pulse">
          Loading connectors...
        </p>
      ) : connectors.length === 0 ? (
        <p className="text-sm text-app-secondary py-8 text-center">
          No connectors yet. Click{" "}
          <span className="font-medium">Add connector</span> to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {connectors.map((conn) => {
            const dot = STATUS_DOT[conn.status.toUpperCase()] || "bg-gray-400";
            const tr = testResults[conn.id];
            return (
              <div
                key={conn.id}
                className="group flex items-center justify-between gap-3 px-4 py-4 border border-app-border rounded-xl bg-gradient-to-br from-app-surface to-app-bg shadow-sm hover:border-app-border-orange hover:shadow-[0_4px_20px_rgba(255,90,20,0.05)] transition-all"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-lg bg-app-bg border border-app-border flex items-center justify-center shrink-0">
                    <ConnectorIcon type={conn.type} size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-app-primary tracking-tight truncate">
                      {conn.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                        {conn.type}
                      </span>
                      {conn.last_synced_at && (
                        <span className="text-[10px] text-[#9CA3AF] font-medium italic">
                          • Synced {timeAgo(conn.last_synced_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-[11px] font-black text-app-secondary uppercase tracking-widest">
                      {conn.status}
                    </span>
                  </div>

                  {/* 
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewPipelines(conn)}
                    className="p-1.5 rounded-md text-[#9CA3AF] hover:text-app-primary transition-colors"
                    title="Edit configuration"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onTest(conn)}
                    className="px-3 py-1.5 border border-app-border rounded-md text-xs font-bold text-app-secondary hover:bg-app-bg transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(conn)}
                    disabled={busy === conn.id}
                    className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── New connector form (A2-style) ────────────────────────────────────────────

function NewConnectorForm({
  onSaved,
  onCancel,
  onError,
}: {
  onSaved: () => void;
  onCancel: () => void;
  onError: (m: string) => void;
}) {
  const [type, setType] = useState<ConnectorTypeKey>("ADF");
  const [name, setName] = useState("");
  const [creds, setCreds] = useState<
    | CredMap["ADF"]
    | CredMap["DATABRICKS"]
    | CredMap["GIT"]
    | CredMap["AWS_GLUE"]
  >(EMPTY_CREDS.ADF);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const onTypeChange = (t: ConnectorTypeKey) => {
    setType(t);
    setCreds(EMPTY_CREDS[t] as any);
  };

  const updateCred = (k: string, v: string) =>
    setCreds((c) => ({ ...c, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError("");
    try {
      if (type === "AWS_GLUE") {
        await api.connectAWSGlue({
          name,
          ...(creds as unknown as CredMap["AWS_GLUE"]),
        });
      } else {
        const created = await api.upsertConnector({
          type,
          name,
          credentials: creds,
        });
        // Auto-test
        setTesting(true);
        try {
          const r = await api.testConnector(created.id);
          if (r.status === "connected") {
            // success — handled silently, UI will refresh
          }
        } finally {
          setTesting(false);
        }
      }
      onSaved();
    } catch (e: any) {
      onError(e.message || "Creation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-5" autoComplete="off">
      {/* Type selector */}
      <div>
        <label className="block text-xs uppercase tracking-wide text-app-secondary font-semibold mb-2">
          Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTypeChange(opt.value)}
              className={`p-3 rounded-lg border text-left transition-all ${
                type === opt.value
                  ? "border-app-brand bg-app-bg shadow-sm ring-1 ring-app-brand"
                  : "border-app-border hover:border-[#9CA3AF] bg-app-surface"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ConnectorIcon type={opt.value} size={14} />
                <span className="text-sm font-medium text-app-primary">
                  {opt.label}
                </span>
              </div>
              <div className="text-[10px] text-[#9CA3AF]">{opt.help}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Display name */}
      <div>
        <label className="block text-xs uppercase tracking-wide text-app-secondary font-semibold mb-1.5">
          Display name
        </label>
        <input
          className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-app-primary focus:outline-none focus:border-[#111827]"
          placeholder="e.g. prod-adf-westeurope"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Credential fields */}
      {type === "ADF" && (
        <ADFForm creds={creds as CredMap["ADF"]} update={updateCred} />
      )}
      {type === "DATABRICKS" && (
        <DatabricksForm
          creds={creds as CredMap["DATABRICKS"]}
          update={updateCred}
        />
      )}
      {type === "GIT" && (
        <GitForm creds={creds as CredMap["GIT"]} update={updateCred} />
      )}
      {type === "AWS_GLUE" && (
        <GlueForm
          creds={creds as unknown as CredMap["AWS_GLUE"]}
          update={updateCred}
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-app-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-app-primary hover:bg-app-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || testing}
          className="px-4 py-2 rounded-lg bg-app-brand text-white text-sm font-medium hover:bg-app-hover disabled:opacity-60 transition-colors"
        >
          {busy ? "Saving…" : testing ? "Testing…" : "Connect & sync"}
        </button>
      </div>
    </form>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-app-secondary font-semibold mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#9CA3AF] mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-app-border bg-app-surface text-sm text-app-primary focus:outline-none focus:border-app-brand focus:ring-1 focus:ring-app-brand transition-all";

function ADFForm({
  creds,
  update,
}: {
  creds: CredMap["ADF"];
  update: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-app-bg border border-app-border">
      <p className="text-[11px] text-app-secondary">
        <Workflow size={11} className="inline mr-1 text-app-secondary" />
        Azure AD service principal — needs{" "}
        <strong>Data Factory Contributor</strong> on the target factory.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <FieldGroup label="Tenant ID">
          <input
            className={inputCls}
            value={creds.tenant_id}
            onChange={(e) => update("tenant_id", e.target.value)}
            required
          />
        </FieldGroup>
        <FieldGroup label="Subscription ID">
          <input
            className={inputCls}
            value={creds.subscription_id}
            onChange={(e) => update("subscription_id", e.target.value)}
            required
          />
        </FieldGroup>
        <FieldGroup label="Client (App) ID">
          <input
            className={inputCls}
            value={creds.client_id}
            onChange={(e) => update("client_id", e.target.value)}
            required
          />
        </FieldGroup>
        <FieldGroup label="Client Secret">
          <input
            className={inputCls}
            type="password"
            autoComplete="new-password"
            value={creds.client_secret}
            onChange={(e) => update("client_secret", e.target.value)}
            required
          />
        </FieldGroup>
        <FieldGroup label="Resource Group">
          <input
            className={inputCls}
            value={creds.resource_group}
            onChange={(e) => update("resource_group", e.target.value)}
            required
          />
        </FieldGroup>
        <FieldGroup label="Factory Name">
          <input
            className={inputCls}
            value={creds.factory_name}
            onChange={(e) => update("factory_name", e.target.value)}
            required
          />
        </FieldGroup>
      </div>
    </div>
  );
}

function DatabricksForm({
  creds,
  update,
}: {
  creds: CredMap["DATABRICKS"];
  update: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-app-bg border border-app-border">
      <p className="text-[11px] text-app-secondary">
        <Database size={11} className="inline mr-1 text-app-brand" />
        Generate a PAT in User Settings → Developer → Access Tokens.
      </p>
      <FieldGroup
        label="Workspace URL"
        hint="e.g. https://adb-1234567890.12.azuredatabricks.net"
      >
        <input
          className={inputCls}
          value={creds.workspace_url}
          onChange={(e) => update("workspace_url", e.target.value)}
          placeholder="https://adb-xxx.azuredatabricks.net"
          required
        />
      </FieldGroup>
      <FieldGroup label="Personal Access Token">
        <input
          className={inputCls}
          type="password"
          autoComplete="new-password"
          value={creds.personal_access_token}
          onChange={(e) => update("personal_access_token", e.target.value)}
          required
        />
      </FieldGroup>
    </div>
  );
}

function GitForm({
  creds,
  update,
}: {
  creds: CredMap["GIT"];
  update: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-app-bg border border-app-border">
      <p className="text-[11px] text-app-secondary">
        <GitBranch size={11} className="inline mr-1 text-app-primary" />
        GitHub PAT with <strong>repo</strong> + <strong>actions:read</strong>{" "}
        scopes.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <FieldGroup label="Provider">
          <select
            className={inputCls}
            value={creds.provider}
            onChange={(e) => update("provider", e.target.value)}
          >
            <option value="github">GitHub</option>
            <option value="gitlab" disabled>
              GitLab (coming soon)
            </option>
          </select>
        </FieldGroup>
        <FieldGroup label="Owner / Org">
          <input
            className={inputCls}
            value={creds.owner}
            onChange={(e) => update("owner", e.target.value)}
            placeholder="username or organization"
            required
          />
        </FieldGroup>
        <FieldGroup
          label="Repository (optional)"
          hint="Leave blank to sync all repos owner has access to"
        >
          <input
            className={inputCls}
            value={creds.repo}
            onChange={(e) => update("repo", e.target.value)}
            placeholder="my-repo"
          />
        </FieldGroup>
        <FieldGroup label="Personal Access Token">
          <input
            className={inputCls}
            type="password"
            autoComplete="new-password"
            value={creds.token}
            onChange={(e) => update("token", e.target.value)}
            required
          />
        </FieldGroup>
      </div>
    </div>
  );
}

function GlueForm({
  creds,
  update,
}: {
  creds: CredMap["AWS_GLUE"];
  update: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-app-bg border border-app-border">
      <p className="text-[11px] text-app-secondary">
        <Zap size={11} className="inline mr-1 text-app-brand" />
        Connect to AWS Glue — requires <strong>
          GlueReadOnlyAccess
        </strong> and <strong>CloudWatchLogsReadOnlyAccess</strong>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <FieldGroup label="AWS Access Key ID">
          <input
            className={inputCls}
            value={creds.aws_access_key_id}
            onChange={(e) => update("aws_access_key_id", e.target.value)}
            placeholder="AKIA..."
            required
          />
        </FieldGroup>
        <FieldGroup label="Region Name">
          <input
            className={inputCls}
            value={creds.region_name}
            onChange={(e) => update("region_name", e.target.value)}
            placeholder="us-east-1"
            required
          />
        </FieldGroup>
        <div className="sm:col-span-2">
          <FieldGroup label="AWS Secret Access Key">
            <input
              className={inputCls}
              type="password"
              autoComplete="new-password"
              value={creds.aws_secret_access_key}
              onChange={(e) => update("aws_secret_access_key", e.target.value)}
              placeholder="Enter secret key"
              required
            />
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
