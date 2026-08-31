import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { Skeleton } from "./Skeleton";

interface Props {
  label: string;
  value: string | number;
  trend?: string;
  trendDir?: "up" | "down" | "flat";
  icon?: LucideIcon;
  accent?:
    | "default"
    | "blue"
    | "amber"
    | "emerald"
    | "red"
    | "cyan"
    | "violet"
    | "lime"
    | "rose" | "pwc" | "pwc";
  sub?: string;
  busy?: boolean;
  tooltip?: string;
}

export function StatCard({
  label,
  value,
  trend,
  trendDir = "flat",
  icon: Icon,
  accent = "default",
  sub,
  busy,
  tooltip,
}: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  const trendColor =
    trendDir === "up"
      ? "text-emerald-600"
      : trendDir === "down"
        ? "text-red-600"
        : "text-app-secondary";

  if (busy) {
    return (
      <div className="bg-app-surface border border-app-border p-4 rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-app-surface to-app-bg border border-app-border p-4 rounded-lg hover:border-app-border-orange hover:shadow-[0_4px_20px_rgba(255,90,20,0.05)] transition-all duration-300 group relative cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-app-secondary font-bold">
          {label}
        </p>
        {Icon && (
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer",
                accent === "blue" && "border-blue-100 bg-blue-50 text-app-brand",
                accent === "amber" &&
                  "border-amber-100 bg-amber-50 text-amber-600",
                accent === "emerald" &&
                  "border-emerald-100 bg-emerald-50 text-emerald-600",
                accent === "red" && "border-red-100 bg-red-50 text-red-600",
                accent === "cyan" && "border-cyan-100 bg-cyan-50 text-cyan-600",
                accent === "violet" &&
                  "border-violet-100 bg-violet-50 text-violet-600",
                accent === "lime" && "border-lime-100 bg-lime-50 text-lime-600",
                accent === "rose" &&
                  "border-rose-100 bg-rose-600/10 text-rose-600",
                accent === "default" &&
                  "border-app-border bg-app-surface text-app-secondary",
                accent === "pwc" && "border-app-border-orange bg-app-surface text-app-brand shadow-[0_0_10px_rgba(255,90,20,0.1)]",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>

            {/* Rich styled dark tooltip card positioned cleanly below the icon */}
            {tooltip && showTooltip && (
              <div className="absolute z-[100] top-full right-0 mt-2 w-72 max-w-xs bg-[#1E1E1E]/95 backdrop-blur-md border border-[#3A3A3A] text-white rounded-lg shadow-2xl p-3 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-white mb-1 tracking-wide text-xs">
                  {label}
                </div>
                <div className="text-gray-300 text-[11px] font-normal leading-normal">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <h3 className="text-3xl font-light italic text-app-primary tracking-tight tabular-nums">
          {value}
        </h3>
        <div className="flex items-center justify-between mt-2">
          {sub && (
            <span className="text-[10px] text-app-secondary font-medium italic">
              {sub}
            </span>
          )}
          {trend && (
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-tight",
                trendColor,
              )}
            >
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
