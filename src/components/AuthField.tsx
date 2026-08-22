import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Interactive auth form input with:
 *  - icon that reacts to focus / validity state
 *  - green check when the field is valid, red border + message when invalid
 *  - optional show/hide password toggle
 */
interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
  valid?: boolean;
  hint?: string;
  togglePassword?: boolean;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, icon: Icon, error, valid, hint, togglePassword, className, id, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  const state: 'error' | 'valid' | 'idle' = error ? 'error' : valid ? 'valid' : 'idle';

  const inputClasses = cn(
    'w-full bg-slate-700/70 border rounded-lg pl-10 pr-11 py-2.5 text-white placeholder-slate-500 outline-none transition-all duration-200',
    state === 'error'
      ? 'border-red-500/80 ring-2 ring-red-500/20'
      : state === 'valid'
        ? 'border-emerald-500/70 ring-2 ring-emerald-500/15'
        : focused
          ? 'border-blue-500 ring-2 ring-blue-500/25 bg-slate-700'
          : 'border-slate-600 hover:border-slate-500',
    className,
  );

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <Icon
          className={cn(
            'absolute left-3 top-3 w-5 h-5 transition-colors duration-200',
            state === 'error' ? 'text-red-400' : state === 'valid' ? 'text-emerald-400' : focused ? 'text-blue-400' : 'text-slate-400',
          )}
        />
        <input
          ref={ref}
          id={id}
          {...inputProps}
          type={togglePassword ? (show ? 'text' : 'password') : inputProps.type}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          className={inputClasses}
        />

        <div className="absolute right-3 top-3 flex items-center">
          <AnimatePresence mode="wait" initial={false}>
            {togglePassword ? (
              <motion.button
                key="toggle"
                type="button"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                onClick={() => setShow((s) => !s)}
                className="text-slate-400 hover:text-slate-200 transition p-0.5"
                aria-label={show ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </motion.button>
            ) : state === 'valid' ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Check className="w-5 h-5 text-emerald-400" />
              </motion.span>
            ) : state === 'error' ? (
              <motion.span
                key="alert"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <AlertCircle className="w-5 h-5 text-red-400" />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.18 }}
            className="text-xs text-red-400 overflow-hidden"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="text-xs text-slate-500 mt-1.5"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
