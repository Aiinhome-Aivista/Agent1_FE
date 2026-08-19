import React from 'react';
import { Link } from "react-router-dom";
import { Moon, Sun, 
  ArrowRight,
  Brain,
  Eye,
  GitBranch,
  RefreshCw,
  Sparkles,
  Zap,
 } from 'lucide-react';


function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(
    document.documentElement.classList.contains('dark')
  );

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  React.useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-app-border bg-app-surface hover:bg-app-bg text-app-primary transition-colors flex items-center justify-center gap-2"
      title="Toggle Dark Mode"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-app-muted text-app-primary">
      {/* Top nav */}
      <header className="border-b border-app-border">
        <div className="max-w-[90rem] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-app-btn flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight">AgenticOps</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm text-app-primary hover:text-app-primary px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-app-btn text-white text-sm font-medium hover:bg-app-hover"
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[90rem] mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-app-surface border border-app-border text-[11px] font-medium text-app-primary mb-6">
            <Sparkles className="w-3 h-3" />
            Autonomous DataOps
          </div>
          <h1 className="text-5xl font-semibold tracking-tight leading-[1.05]">
            AI agents that detect, diagnose, and repair
            <br />
            <span className="text-app-secondary">your data pipeline failures.</span>
          </h1>
          <p className="mt-6 text-lg text-app-secondary leading-relaxed max-w-2xl">
            Connect your orchestrators — Azure Data Factory, Git, AWS Glue and
            Databricks — and a coordinated agent ensemble watches every run.
            When something breaks, it reasons over your incident history,
            proposes a fix, asks for approval on risky operations, and learns
            from every resolution.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-app-btn text-white text-sm font-medium hover:bg-app-hover"
            >
              Sign in to console
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="px-5 py-2.5 rounded-lg border border-app-border text-sm font-medium text-app-primary hover:bg-app-bg"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Scope / Features */}
      <section className="border-t border-app-border bg-app-bg">
        <div className="max-w-[90rem] mx-auto px-6 py-16">
          <h2 className="text-xs uppercase tracking-[0.18em] font-black text-app-secondary">
            Project scope
          </h2>
          <p className="mt-2 text-2xl font-semibold tracking-tight max-w-3xl">
            A control plane for the on-call data engineer that never sleeps and
            never escalates the easy stuff.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              icon={Eye}
              title="Detect"
              body="Continuously monitors ADF pipelines, Git, AWS Glue and Databricks jobs. Newly failed runs are picked up within seconds and turned into structured incidents."
            />
            <FeatureCard
              icon={Brain}
              title="Diagnose"
              body="An LLM-driven Diagnosis Agent retrieves similar past incidents and operator playbooks from a Qdrant vector store, then proposes a root cause with a confidence score."
            />
            <FeatureCard
              icon={RefreshCw}
              title="Remediate"
              body="The Remediation Agent invokes real connector tools — clear an rerun an ADF pipeline, repair a Databricks run, rerun a Glue job — behind a circuit breaker, with a human approval gate on destructive operations."
            />
            <FeatureCard
              icon={GitBranch}
              title="Learn"
              body="Each resolved incident gets a Reflexion-style writeback to episodic history. High-confidence fixes get promoted to procedural playbooks the next agent run can cite."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-[90rem] mx-auto px-6 py-20">
        <h2 className="text-xs uppercase tracking-[0.18em] font-black text-app-secondary">
          How it works
        </h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight max-w-2xl">
          The canonical Observe → Reason → Plan → Act → Evaluate → Learn loop.
        </p>

        <ol className="mt-10 space-y-4">
          <Step
            n="1"
            title="Connect your orchestrator"
            body="Add ADF, Git, AWS Glue or Databricks via the UI. Credentials are encrypted at rest. The moment you save, the system fetches every pipeline on the account and starts watching for failures."
          />
          <Step
            n="2"
            title="A failure is detected"
            body="The IngestionService polls each orchestrator continuously. The first time it sees a run in a failed state, it materializes a structured incident with the actual error log."
          />
          <Step
            n="3"
            title="The Diagnosis Agent reasons"
            body="Five guardrails run in sequence — input PII redaction, prompt-injection neutralization, retrieval threshold, execution rail, output schema — around an LLM call grounded by RAG over three history tiers."
          />
          <Step
            n="4"
            title="Plan is proposed (and gated)"
            body="The agent emits a JSON plan: which tools to invoke, with what arguments, at what risk. High-risk operations and low-confidence plans pause for human approval."
          />
          <Step
            n="5"
            title="Tools execute against real systems"
            body="Each tool wraps a real connector call: rerun_adf_pipeline, repair_databricks_run, restart_k8s_deployment, notify_slack — behind per-tool circuit breakers and timeouts."
          />
          <Step
            n="6"
            title="The Learning Agent reflects"
            body="On success, write back to history. On failure, escalate to on-call. Either way, the next similar incident benefits from the recorded experience."
          />
        </ol>
      </section>

      {/* Stack */}
      {/* <section className="border-t border-app-border bg-app-bg">
        <div className="max-w-[90rem] mx-auto px-6 py-12">
          <h3 className="text-xs uppercase tracking-[0.18em] font-black text-app-secondary mb-6">
            Built on
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-app-primary">
            <StackItem icon={Layers} label="FastAPI + SQLAlchemy 2 async" />
            <StackItem icon={Activity} label="Qdrant + sentence-transformers" />
            <StackItem icon={Brain} label="Anthropic Claude / OpenAI-compatible" />
            <StackItem icon={Zap} label="React + Vite + Tailwind" />
          </div>
        </div>
      </section> */}

      <footer className="border-t border-app-border">
        <div className="max-w-[90rem] mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-xs text-app-secondary">
            AgenticOps — Autonomous Data Pipeline Orchestrator
          </p>
          <Link
            to="/login"
            className="text-xs text-app-secondary hover:text-app-primary"
          >
            Sign in →
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Eye;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-5">
      <div className="w-9 h-9 rounded-lg bg-app-surface flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-app-primary" />
      </div>
      <h3 className="text-sm font-semibold text-app-primary mb-1.5">{title}</h3>
      <p className="text-[13px] text-app-secondary leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <div className="w-8 h-8 shrink-0 rounded-full bg-app-btn text-white text-xs font-semibold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 pb-4 border-b border-app-border last:border-b-0">
        <h3 className="text-base font-semibold text-app-primary">{title}</h3>
        <p className="mt-1 text-[13px] text-app-secondary leading-relaxed max-w-3xl">
          {body}
        </p>
      </div>
    </li>
  );
}

function StackItem({ icon: Icon, label }: { icon: typeof Eye; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-app-secondary" />
      <span>{label}</span>
    </div>
  );
}
