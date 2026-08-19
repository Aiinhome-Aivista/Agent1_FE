import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
}

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Delete Connector",
  description = "Are you sure you want to delete this connector? This action cannot be undone and will remove all associated pipeline configurations.",
  confirmLabel = "Delete Connector",
  busy = false,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="bg-app-surface rounded-2xl border border-app-border w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <button
                  onClick={onClose}
                  className="text-[#9CA3AF] hover:text-app-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-app-primary mb-2">{title}</h3>
              <p className="text-sm text-app-secondary leading-relaxed">
                {description}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-app-bg border-t border-app-border">
              <button
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-app-secondary hover:bg-[#E5E7EB] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {busy ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
