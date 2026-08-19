import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { apiEvents } from "../services/api";

interface Toast {
  id: number;
  message: string;
}

export function GlobalToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    apiEvents.onError((msg) => {
      setToasts((prev) => {
        // Prevent duplicate spam within active list
        if (prev.some((t) => t.message === msg)) return prev;
        const id = Date.now();
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setToasts((current) => current.filter((t) => t.id !== id));
        }, 5000);
        return [...prev, { id, message: msg }];
      });
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-red-500/20 bg-gray-900/95 backdrop-blur-md p-4 text-white shadow-2xl shadow-red-950/20 ring-1 ring-white/10 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <AlertCircle className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="flex-1 pt-0.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              API Error
            </p>
            <p className="mt-1 text-xs text-gray-200 wrap-break-word leading-relaxed font-medium">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() =>
              setToasts((prev) => prev.filter((t) => t.id !== toast.id))
            }
            className="rounded-lg p-1.5 text-gray-400 hover:bg-app-surface/5 hover:text-app-primary transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
