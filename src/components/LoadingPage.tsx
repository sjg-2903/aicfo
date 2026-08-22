import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

/**
 * Branded full-screen loading page with the app title.
 *
 * Shown whenever a page takes time to load:
 *  - as the React Suspense fallback while lazy-loaded routes chunk in (App.tsx)
 *  - while the auth session is being restored (ProtectedRoute)
 *
 * A matching pre-React splash with the same branding lives in index.html so the
 * very first paint (before the JS bundle executes) is branded as well.
 */
interface LoadingPageProps {
  /** Line shown under the title while loading */
  message?: string;
}

export default function LoadingPage({ message = 'Loading your workspace' }: LoadingPageProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Ambient animated glows */}
      <motion.div
        aria-hidden
        animate={{ x: [0, 28, 0], y: [0, -22, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, -30, 0], y: [0, 26, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl"
      />

      <div className="relative flex flex-col items-center px-6 text-center">
        {/* Logo with rotating dashed ring + pulse */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative mb-7"
        >
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-3 rounded-[26px] border-2 border-dashed border-blue-400/40"
          />
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-blue-500/40"
          >
            <Brain className="h-9 w-9 text-white" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent"
        >
          AI CFO
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-blue-300/90"
        >
          Finance Advisor For MSME
        </motion.p>

        {/* Message with animated dots */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-6 flex items-center text-sm text-slate-400"
          role="status"
          aria-live="polite"
        >
          {message}
          <span className="ml-1 inline-flex">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.15, 1, 0.15] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
              >
                .
              </motion.span>
            ))}
          </span>
        </motion.p>

        {/* Indeterminate progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-4 h-1.5 w-56 overflow-hidden rounded-full bg-slate-700/60"
        >
          <div className="loading-bar h-full w-1/3 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
        </motion.div>
      </div>
    </div>
  );
}
