import { useState } from "react";
import { Info } from "lucide-react";

interface InfoHintProps {
  /** Tooltip body. Plain string, or an array rendered as bullet lines. */
  text: string | string[];
  /** Optional bold heading shown at the top of the tooltip. */
  title?: string;
  /** Tooltip alignment relative to the icon. */
  align?: "left" | "right" | "center";
  className?: string;
}

/**
 * A small circled "i" that reveals an explanatory tooltip on hover / focus.
 * Used to give inline guidance (e.g. what kinds of documents a Runbook upload
 * accepts) without cluttering the layout.
 */
export function InfoHint({
  text,
  title,
  align = "left",
  className = "",
}: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const lines = Array.isArray(text) ? text : [text];

  const pos =
    align === "right"
      ? "right-0"
      : align === "center"
        ? "left-1/2 -translate-x-1/2"
        : "left-0";

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="More information"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="text-gray-400 hover:text-gray-700 transition-colors focus:outline-none focus:text-gray-700"
      >
        <Info className="w-3.5 h-3.5" strokeWidth={2.25} />
      </button>

      {open && (
        <div
          className={`absolute z-50 top-6 ${pos} w-72 bg-app-input text-app-primary text-[11px] leading-relaxed rounded-lg shadow-xl px-3.5 py-3 pointer-events-none`}
        >
          {title && (
            <div className="font-bold text-app-primary mb-1.5 tracking-wide">
              {title}
            </div>
          )}
          {lines.length > 1 ? (
            <ul className="space-y-1">
              {lines.map((l, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-gray-400 shrink-0">•</span>
                  <span className="text-gray-200">{l}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-gray-200">{lines[0]}</span>
          )}
        </div>
      )}
    </span>
  );
}
