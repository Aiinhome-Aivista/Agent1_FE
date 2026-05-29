import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldAlert,
  History,
  Database,
  Brain,
  Lightbulb,
  Plug,
  Zap,
  Wrench,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Gauge, // ← NEW icon for Metrics
} from "lucide-react";
import { cn } from "../lib/utils";
import { useStore } from "../hooks/useStore";
import { auth } from "../services/api";

const NAV = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/connectors", icon: Plug, label: "Connectors" },
  { to: "/app/pipelines", icon: Database, label: "Pipelines" },
  { to: "/app/runbooks", icon: BookOpen, label: "Runbooks" },
  { to: "/app/incidents", icon: ShieldAlert, label: "Incident Timeline" },
  // { to: "/app/agents", icon: Brain, label: "Agent Mesh" },
  { to: "/app/memory", icon: History, label: "History" },
  { to: "/app/metrics", icon: Gauge, label: "Metrics" }, // ← NEW
  // { to: "/app/recommendations", icon: Lightbulb, label: "Optimize" },
  { to: "/app/audit", icon: Wrench, label: "Audit Trail" },
];

export function Sidebar() {
  const { state } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const openIncidents = state.incidents.filter(
    (i) => i.is_active !== false,
  ).length;

  const handleLogout = () => {
    auth.clearToken();
    window.location.href = "/";
  };

  return (
    <aside
      className={cn(
        "bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 transition-all duration-300 ease-in-out relative group",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-3 top-24 w-6 h-12 bg-white border border-[#E5E7EB] rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all z-50 hover:bg-[#F9FAFB] hover:border-[#D1D5DB]",
          "after:content-[''] after:w-0.5 after:h-4 after:bg-[#E5E7EB] after:rounded-full after:hover:bg-[#9CA3AF] after:transition-colors",
        )}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-[#6B7280]" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-[#6B7280]" />
        )}
      </button>

      <div
        className={cn(
          "px-6 pt-8 pb-6 flex flex-col",
          isCollapsed ? "items-center" : "",
        )}
      >
        <nav className="space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-[13px] font-medium overflow-hidden",
                  isActive
                    ? "bg-[#F3F4F6] text-[#111827]"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]",
                  isCollapsed ? "justify-center px-0 w-10 mx-auto" : "",
                )
              }
              title={isCollapsed ? item.label : ""}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 whitespace-nowrap animate-in fade-in duration-300">
                    {item.label}
                  </span>
                  {/* Temporarily commented out for UI
                  {item.to === "/app/incidents" && openIncidents > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#111827] text-white text-[10px] font-bold">
                      {openIncidents}
                    </span>
                  )}
                  */}
                </>
              )}
              {/* Temporarily commented out for UI
              {isCollapsed &&
                item.to === "/app/incidents" &&
                openIncidents > 0 && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-[#111827] rounded-full border border-white" />
                )}
              */}
            </NavLink>
          ))}
        </nav>
      </div>

      <div
        className={cn(
          "mt-auto p-6 border-t border-[#E5E7EB]",
          isCollapsed ? "flex flex-col items-center gap-4 px-0" : "",
        )}
      >
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-1 mb-6">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
              Stream
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  state.connected ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              <span className="text-[9px] uppercase tracking-tight font-bold text-[#6B7280]">
                {state.connected ? "Live" : "Reconnecting"}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "w-2 h-2 rounded-full mb-2",
              state.connected ? "bg-emerald-500" : "bg-amber-500",
            )}
            title={state.connected ? "Live" : "Reconnecting"}
          />
        )}

        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[#6B7280] hover:bg-rose-50 hover:text-rose-600 transition-all text-[13px] font-medium group/logout overflow-hidden",
            isCollapsed ? "justify-center px-0 w-10 mx-auto" : "",
          )}
          title={isCollapsed ? "Sign Out" : ""}
        >
          <LogOut className="w-4 h-4 group-hover/logout:rotate-12 transition-transform shrink-0" />
          {!isCollapsed && (
            <span className="whitespace-nowrap animate-in fade-in duration-300">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
