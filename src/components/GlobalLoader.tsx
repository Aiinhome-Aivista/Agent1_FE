import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';

export function GlobalLoader() {
  const { state } = useStore();

  return (
    <AnimatePresence>
      {state.isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] h-1"
        >
          {/* Progress bar background */}
          <div className="absolute inset-0 bg-app-btn/10" />
          
          {/* Animated progress bar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "linear"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-app-brand to-transparent w-full"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
