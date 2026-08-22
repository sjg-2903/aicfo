import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain } from 'lucide-react';

/**
 * Shared layout shell for the auth pages (Login / Register / Forgot Password).
 *
 * Provides the animated gradient backdrop, a "Back to Home" button that
 * returns to the landing page, and the AI CFO brand header.
 */
interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated decorative glow blobs */}
      <motion.div
        aria-hidden
        animate={{ x: [0, 30, 0], y: [0, -25, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, -35, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem]"
      />

      {/* Back to landing page */}
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <Link
          to="/"
          className="group absolute top-4 left-4 sm:top-6 sm:left-6 z-10 inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/60 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-300 shadow-lg backdrop-blur transition hover:border-blue-500/60 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Back to Home
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative z-[1] w-full max-w-md"
      >
        <div className="rounded-2xl border border-blue-500/20 bg-slate-800/80 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <Link to="/" className="group flex items-center justify-center gap-2 mb-2">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="p-2 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg shadow-lg shadow-blue-500/30"
            >
              <Brain className="w-6 h-6 text-white" />
            </motion.div>
            <span className="text-xl font-bold text-white group-hover:text-blue-300 transition">AI CFO</span>
          </Link>
          <p className="text-center text-[11px] font-medium uppercase tracking-widest text-blue-400/80 mb-8">
            Finance Advisor For MSME
          </p>

          <h1 className="text-2xl font-bold text-white mb-1.5 text-center">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mb-6 text-center">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}

          {children}
        </div>
      </motion.div>
    </div>
  );
}
