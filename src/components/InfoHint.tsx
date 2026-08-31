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
        className="text-gray-400 hover:text-app-brand transition-colors focus:outline-none"
      >
        <Info className="w-3.5 h-3.5" strokeWidth={2.25} />
      </button>

      {open && (
        <div
          className={`absolute z-[150] top-6 ${pos} w-80 max-w-sm bg-[#1E1E1E]/95 backdrop-blur-md border border-[#3A3A3A] text-white text-[11px] leading-relaxed rounded-lg shadow-2xl p-3.5 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150 normal-case tracking-normal font-normal text-left`}
        >
          {title && (
            <div className="font-bold text-white mb-2 tracking-wide text-xs border-b border-[#333333] pb-1.5 normal-case">
              {title}
            </div>
          )}
          {lines.length > 1 ? (
            <ul className="space-y-2">
              {lines.map((l, i) => {
                const colonIdx = l.indexOf(":");
                const hasPrefix = colonIdx !== -1 && colonIdx < 35;
                const prefix = hasPrefix ? l.slice(0, colonIdx + 1) : "";
                const rest = hasPrefix ? l.slice(colonIdx + 1) : l;

                return (
                  <li key={i} className="flex gap-2 items-start text-[11px] leading-normal">
                    <span className="text-app-brand font-bold shrink-0 mt-0.5">•</span>
                    <span className="text-gray-300">
                      {hasPrefix ? (
                        <>
                          <strong className="text-white font-semibold mr-1">{prefix}</strong>
                          {rest}
                        </>
                      ) : (
                        l
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <span className="text-gray-300 leading-normal">{lines[0]}</span>
          )}
        </div>
      )}
    </span>
  );
}
