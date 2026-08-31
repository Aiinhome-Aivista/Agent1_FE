import { useState, type ReactNode } from "react";
import { cn } from "../lib/utils";

interface TooltipProps {
  content?: string | ReactNode;
  title?: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  containerClassName?: string;
}

export function Tooltip({
  content,
  title,
  children,
  side = "bottom",
  align = "center",
  className,
  containerClassName,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  if (!content && !title) return <>{children}</>;

  let pos = "";
  if (side === "bottom") {
    if (align === "start") pos = "top-full left-0 mt-2";
    else if (align === "end") pos = "top-full right-0 mt-2";
    else pos = "top-full left-1/2 -translate-x-1/2 mt-2";
  } else if (side === "top") {
    if (align === "start") pos = "bottom-full left-0 mb-2";
    else if (align === "end") pos = "bottom-full right-0 mb-2";
    else pos = "bottom-full left-1/2 -translate-x-1/2 mb-2";
  } else if (side === "left") {
    pos = "right-full top-1/2 -translate-y-1/2 mr-2";
  } else if (side === "right") {
    pos = "left-full top-1/2 -translate-y-1/2 ml-2";
  }

  return (
    <div
      className={cn("relative inline-flex items-center", containerClassName)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-[100] w-72 max-w-xs bg-[#1E1E1E]/95 backdrop-blur-md border border-[#3A3A3A] text-white text-[11px] leading-relaxed rounded-lg shadow-2xl p-3 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150 normal-case tracking-normal font-normal text-left",
            pos,
            className,
          )}
        >
          {title && (
            <div className="font-bold text-white mb-1 tracking-wide text-xs">
              {title}
            </div>
          )}
          {content && (
            <div className="text-gray-300 text-[11px] font-normal leading-normal">
              {content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
