import { RotateCw } from "lucide-react";
import { cn } from "../lib/utils";

interface LoadingProps {
  message?: string;
  fullPage?: boolean;
  className?: string;
}

export function Loading({
  message = "Loading data...",
  fullPage = false,
  className,
}: LoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullPage ? "fixed inset-0 bg-[#F9FAFB] z-9998" : "flex-1 min-h-[200px]",
        className,
      )}
    >
      <div className="relative">
        <RotateCw className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full scale-150 animate-pulse" />
      </div>
      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.2em] animate-pulse">
        {message}
      </p>
    </div>
  );
}
