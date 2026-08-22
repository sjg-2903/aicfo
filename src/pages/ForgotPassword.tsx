import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import AuthShell from '@/components/AuthShell';
import { AuthField } from '@/components/AuthField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const emailError = touched && !emailValid ? (email ? 'Enter a valid email address' : 'Email is required') : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid) return;
    setSubmitting(true);
    // Simulate a request so the loading state is visible, then show confirmation.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <AuthShell title="Reset Password" subtitle="Enter your email to receive reset instructions">
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthField
            id="forgot-email"
            label="Email"
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            error={emailError}
            valid={emailValid}
            placeholder="Enter your email"
            autoComplete="email"
          />

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={submitting ? undefined : { scale: 1.02 }}
            whileTap={submitting ? undefined : { scale: 0.97 }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 py-2.5 font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-600"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </motion.button>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center"
        >
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-green-400 font-semibold">Check your email!</p>
          <p className="text-slate-400 text-sm mt-2">We&apos;ve sent password reset instructions to your email</p>
        </motion.div>
      )}

      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition">
          ← Back to Login
        </Link>
      </div>
    </AuthShell>
  );
}
