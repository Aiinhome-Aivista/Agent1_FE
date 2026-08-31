import React, { useState, useRef, useEffect, useMemo } from "react";
import { Clock, ChevronDown, Check, List, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

interface TimePickerProps {
  value: string; // "HH:MM" (24-hour format)
  onChange: (val: string) => void;
  label?: string;
  accent?: "default" | "brand";
  className?: string;
  disabled?: boolean;
}

const PRESETS = [
  { label: "00:00 (Midnight)", val: "00:00" },
  { label: "02:00 (Default UTC)", val: "02:00" },
  { label: "06:00 (Morning)", val: "06:00" },
  { label: "07:30 (Morning IST)", val: "07:30" },
  { label: "12:00 (Noon)", val: "12:00" },
  { label: "18:00 (Evening)", val: "18:00" },
];

export function TimePicker({
  value = "02:00",
  onChange,
  label,
  accent = "default",
  className,
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hours" | "minutes">("hours");
  const [viewType, setViewType] = useState<"clock" | "list">("clock");
  const containerRef = useRef<HTMLDivElement>(null);
  const clockFaceRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Parse 24h time into 12h + period (AM/PM)
  const { hour24, minute, hour12, period } = useMemo(() => {
    const parts = (value || "02:00").split(":");
    const h24 = parseInt(parts[0] || "2", 10);
    const m = parseInt(parts[1] || "0", 10);
    const isPM = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return {
      hour24: isNaN(h24) ? 2 : h24,
      minute: isNaN(m) ? 0 : m,
      hour12: isNaN(h12) ? 2 : h12,
      period: isPM ? ("PM" as const) : ("AM" as const),
    };
  }, [value]);

  // Convert 12h + period + minute back to "HH:MM" 24h string
  const updateTime = (h12Val: number, mVal: number, periodVal: "AM" | "PM") => {
    let finalH = h12Val;
    if (periodVal === "AM") {
      finalH = h12Val === 12 ? 0 : h12Val;
    } else {
      finalH = h12Val === 12 ? 12 : h12Val + 12;
    }
    const hStr = String(finalH).padStart(2, "0");
    const mStr = String(mVal).padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
  };

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Calculate clock hand angle
  const handAngle = useMemo(() => {
    if (mode === "hours") {
      return (hour12 % 12) * 30; // 360 / 12 = 30 deg
    } else {
      return minute * 6; // 360 / 60 = 6 deg
    }
  }, [mode, hour12, minute]);

  // Handle pointer interaction on clock dial
  const handlePointerMath = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!clockFaceRef.current) return;
    const rect = clockFaceRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = e.clientX - cx;
    const y = e.clientY - cy;

    // Angle in degrees from 12 o'clock
    let deg = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    if (mode === "hours") {
      let h = Math.round(deg / 30) % 12;
      if (h === 0) h = 12;
      updateTime(h, minute, period);
    } else {
      let m = Math.round(deg / 6) % 60;
      updateTime(hour12, m, period);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handlePointerMath(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    handlePointerMath(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
      // When finishing hour selection, seamlessly transition to minutes
      if (mode === "hours") {
        setTimeout(() => setMode("minutes"), 180);
      }
    }
  };

  // Dial numbers (12 points around circle)
  const dialItems = useMemo(() => {
    const cx = 110;
    const cy = 110;
    const r = 82; // radius in px

    if (mode === "hours") {
      return Array.from({ length: 12 }, (_, i) => {
        const h = i === 0 ? 12 : i;
        const angle = (h % 12) * 30;
        const rad = (angle - 90) * (Math.PI / 180);
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        const isSelected = h === hour12;
        return { label: String(h), val: h, x, y, isSelected };
      });
    } else {
      return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
        const angle = m * 6;
        const rad = (angle - 90) * (Math.PI / 180);
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        const isSelected = Math.abs(m - minute) < 2.5;
        return {
          label: String(m).padStart(2, "0"),
          val: m,
          x,
          y,
          isSelected,
        };
      });
    }
  }, [mode, hour12, minute]);

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {label && (
        <div
          className={cn(
            "text-[10px] font-black uppercase tracking-widest mb-1 select-none",
            accent === "brand" ? "text-app-brand" : "text-[#9CA3AF]",
          )}
        >
          {label}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(!open);
          setMode("hours");
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all shadow-sm focus:outline-none",
          accent === "brand"
            ? "bg-app-surface border-app-brand/50 text-app-brand hover:border-app-brand font-bold"
            : "bg-app-bg border-app-border text-app-primary hover:border-app-border-orange font-medium",
          open && "border-app-brand ring-1 ring-app-brand/30 shadow-[0_0_12px_rgba(255,90,20,0.15)]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <Clock
          className={cn(
            "w-3.5 h-3.5",
            accent === "brand" ? "text-app-brand" : "text-[#9CA3AF]",
          )}
        />
        <span className="font-mono text-sm tracking-wider font-semibold">
          {String(hour24).padStart(2, "0")}:{String(minute).padStart(2, "0")}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-[#9CA3AF] transition-transform duration-200",
            open && "rotate-180 text-app-brand",
          )}
        />
      </button>

      {/* Floating Analog Clock / Time Picker Modal */}
      {open && (
        <div
          className="absolute z-[150] top-full mt-2 left-0 w-72 bg-[#161616]/95 backdrop-blur-xl border border-[#333333] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-4 text-white animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Top Bar: Digital Display + AM/PM Switcher + Mode Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A] mb-3">
            {/* Interactive HH : MM tabs */}
            <div className="flex items-center gap-1 font-mono text-xl font-bold tracking-wider">
              <button
                type="button"
                onClick={() => setMode("hours")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  mode === "hours"
                    ? "bg-app-brand text-white shadow-md shadow-app-brand/30"
                    : "bg-[#222222] text-gray-400 hover:text-white",
                )}
              >
                {String(hour12).padStart(2, "0")}
              </button>
              <span className="text-gray-500">:</span>
              <button
                type="button"
                onClick={() => setMode("minutes")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  mode === "minutes"
                    ? "bg-app-brand text-white shadow-md shadow-app-brand/30"
                    : "bg-[#222222] text-gray-400 hover:text-white",
                )}
              >
                {String(minute).padStart(2, "0")}
              </button>
            </div>

            {/* AM / PM Segmented Control */}
            <div className="flex items-center bg-[#222222] p-0.5 rounded-lg border border-[#333333]">
              <button
                type="button"
                onClick={() => updateTime(hour12, minute, "AM")}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded-md transition-all",
                  period === "AM"
                    ? "bg-app-brand text-white shadow-sm"
                    : "text-gray-400 hover:text-white",
                )}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => updateTime(hour12, minute, "PM")}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded-md transition-all",
                  period === "PM"
                    ? "bg-app-brand text-white shadow-sm"
                    : "text-gray-400 hover:text-white",
                )}
              >
                PM
              </button>
            </div>

            {/* View Switcher (Analog Clock vs List) */}
            <button
              type="button"
              title={viewType === "clock" ? "Switch to list view" : "Switch to clock dial"}
              onClick={() => setViewType(viewType === "clock" ? "list" : "clock")}
              className="p-1.5 text-gray-400 hover:text-app-brand hover:bg-[#222222] rounded-lg transition-colors"
            >
              {viewType === "clock" ? (
                <List className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Mode Sub-Header Indicator */}
          <div className="text-[11px] text-gray-400 text-center mb-2 flex items-center justify-center gap-1">
            <span>Setting</span>
            <span className="text-app-brand font-bold uppercase tracking-wider">
              {mode === "hours" ? "Hour (1–12)" : "Minutes (00–59)"}
            </span>
          </div>

          {viewType === "clock" ? (
            /* ANALOG RADIAL CLOCK DIAL */
            <div className="flex justify-center my-1">
              <div
                ref={clockFaceRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative w-[220px] h-[220px] rounded-full bg-[#1C1C1C] border border-[#2E2E2E] shadow-inner cursor-pointer select-none touch-none"
              >
                {/* Subtle Dial Markers */}
                <div className="absolute inset-2 rounded-full border border-dashed border-[#282828]" />

                {/* Clock Center Pivot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-app-brand border-2 border-white shadow-md z-20" />

                {/* Rotating Clock Hand Stick & Glowing Needle */}
                <div
                  className="absolute top-1/2 left-1/2 origin-bottom transition-transform duration-75 z-10 pointer-events-none"
                  style={{
                    transform: `translate(-50%, -100%) rotate(${handAngle}deg)`,
                    height: "78px",
                    width: "2px",
                  }}
                >
                  {/* Stick line */}
                  <div className="w-full h-full bg-gradient-to-t from-app-brand via-app-brand to-[#FF7A3D]" />

                  {/* Needle Tip Glowing Circle */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-app-brand border border-white shadow-[0_0_12px_rgba(255,90,20,0.6)] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>

                {/* Clock Dial Numbers */}
                {dialItems.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                    }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-xs font-mono font-bold transition-colors pointer-events-none",
                      item.isSelected
                        ? "text-white font-black scale-110 z-20"
                        : "text-gray-300 hover:text-white",
                    )}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* LIST / GRID VIEW FALLBACK */
            <div className="grid grid-cols-2 gap-2 my-2">
              <div>
                <div className="text-[9px] uppercase font-bold text-gray-400 text-center mb-1">
                  Hours
                </div>
                <div className="h-44 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                  {Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i)).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateTime(h, minute, period)}
                      className={cn(
                        "w-full py-1 text-xs font-mono rounded text-center transition-all",
                        h === hour12
                          ? "bg-app-brand text-white font-bold"
                          : "text-gray-300 hover:bg-[#252525]",
                      )}
                    >
                      {String(h).padStart(2, "0")} {period}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-gray-400 text-center mb-1">
                  Minutes
                </div>
                <div className="h-44 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateTime(hour12, m, period)}
                      className={cn(
                        "w-full py-1 text-xs font-mono rounded text-center transition-all",
                        m === minute
                          ? "bg-app-brand text-white font-bold"
                          : "text-gray-300 hover:bg-[#252525]",
                      )}
                    >
                      {String(m).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Presets */}
          <div className="mt-3 pt-2.5 border-t border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-app-brand" /> Quick Presets
              </span>
              <span className="font-mono text-[10px] text-app-brand font-bold">
                24H: {String(hour24).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onChange(p.val)}
                  className={cn(
                    "text-[10px] py-1 px-1 rounded text-center truncate transition-colors font-mono",
                    value === p.val
                      ? "bg-app-brand text-white font-bold shadow-sm"
                      : "bg-[#202020] text-gray-300 hover:bg-[#2A2A2A] hover:text-white border border-[#2E2E2E]",
                  )}
                >
                  {p.val}
                </button>
              ))}
            </div>
          </div>

          {/* Done Button */}
          <div className="mt-3 pt-2.5 border-t border-[#2A2A2A] flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-mono">
              {mode === "hours" ? "Drag stick to set hour" : "Drag stick to set minute"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 bg-app-brand text-white text-xs font-bold rounded-lg hover:bg-[#E04B0E] transition-all shadow-md shadow-app-brand/20"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
