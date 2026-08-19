import { useEffect } from 'react';
import { type ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { StoreProvider } from "./hooks/useStore";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/Dashboard";
import { PipelinesPage } from "./pages/Pipelines";
import { IncidentsPage } from "./pages/Incidents";
import { AgentsPage } from "./pages/Agents";
import { MemoryPage } from "./pages/Memory";
import { RecommendationsPage } from "./pages/Recommendations";
import { ConnectorsPage } from "./pages/Connectors";
import { AuditPage } from "./pages/Audit";
import { RunbooksPage } from "./pages/runbooks/RunbooksPage";
import { MetricsPage } from "./pages/Metrics"; // ← NEW
import { LoginPage } from "./pages/Login";
import { LandingPage } from "./pages/Landing";
import { auth } from "./services/api";
import { GlobalLoader } from "./components/GlobalLoader";
import { GlobalToaster } from "./components/GlobalToaster";
import { Header } from "./components/Header";
import { ConnectorModal } from "./components/ConnectorModal";
import { useState } from "react";

function RequireAuth({ children }: { children: ReactNode }) {
  const loc = useLocation();
  if (!auth.isAuthed()) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }
  return <>{children}</>;
}

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  "/app": {
    title: "System Overview",
    subtitle:
      "Autonomous Control Plane · Observe → Reason → Plan → Act → Learn",
  },
  "/app/pipelines": {
    title: "Data Pipelines",
    subtitle: "Monitor and manage cross-platform data processing workflows",
  },
  "/app/incidents": {
    title: "Incident Timeline",
    subtitle:
      "Real-time incident detection, analysis and automated remediation",
  },
  "/app/agents": {
    title: "Agent Mesh",
    subtitle: "Autonomous AI agents collaborating on data operations",
  },
  "/app/connectors": {
    title: "Source Connectors",
    subtitle: "Manage secure connections to cloud platforms and repositories",
  },
  "/app/memory": {
    title: "System History",
    subtitle:
      "Historical context and learned patterns for better decision making",
  },
  "/app/recommendations": {
    title: "Optimize",
    subtitle: "AI-driven suggestions for performance and cost improvements",
  },
  "/app/audit": {
    title: "Audit Trail",
    subtitle: "Complete forensic record of all manual and automated actions",
  },
  "/app/runbooks": {
    title: "Runbooks",
    subtitle:
      "Upload SOPs · stored locally · indexed into the RAG vector store",
  },
  "/app/metrics": {
    // ← NEW
    title: "Performance Metrics",
    subtitle: "Pipelines · RAG retrieval · LLM latency",
  },
};

function Shell() {
  const { pathname } = useLocation();
  const [showConnectorModal, setShowConnectorModal] = useState(false);

  const currentPath =
    Object.keys(PAGE_META)
      .sort((a, b) => b.length - a.length)
      .find((p) => pathname === p || pathname.startsWith(p + "/")) || "/app";

  const meta = PAGE_META[currentPath];

  return (
    <StoreProvider>
      <GlobalLoader />
      <GlobalToaster />
      {showConnectorModal && (
        <ConnectorModal
          open={showConnectorModal}
          onClose={() => setShowConnectorModal(false)}
          initialView="list"
          onSuccess={() => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("connectors-updated"));
            }, 100);
          }}
        />
      )}
      <div className="flex flex-col h-screen bg-app-bg text-app-primary overflow-hidden">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onConnect={() => setShowConnectorModal(true)}
        />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pipelines" element={<PipelinesPage />} />
              <Route path="/pipelines/:id" element={<PipelinesPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/incidents/:id" element={<IncidentsPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route
                path="/recommendations"
                element={<RecommendationsPage />}
              />
              <Route path="/connectors" element={<ConnectorsPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/runbooks" element={<RunbooksPage />} />
              <Route path="/metrics" element={<MetricsPage />} /> {/* ← NEW */}
            </Routes>
          </main>
        </div>
      </div>
    </StoreProvider>
  );
}

export default function App() {
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/runbooks"
        element={<Navigate to="/app/runbooks" replace />}
      />
      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
