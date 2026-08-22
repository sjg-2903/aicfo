import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import AuthShell from '@/components/AuthShell';
import { AuthField } from '@/components/AuthField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBER_EMAIL_KEY = 'aicfo_remember_email';

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY) ?? '';

  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(Boolean(rememberedEmail));
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formData, setFormData] = useState({ email: rememberedEmail, password: '' });

  const setField = (field: 'email' | 'password', value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // Live validation
  const emailValid = EMAIL_RE.test(formData.email.trim());
  const passwordValid = formData.password.length >= 1;
  const formValid = emailValid && passwordValid;

  const emailError = touched.email && !emailValid ? (formData.email ? 'Enter a valid email address' : 'Email is required') : '';
  const passwordError = touched.password && !passwordValid ? 'Password is required' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!formValid) {
      setShakeKey((k) => k + 1);
      return;
    }

    setLoading(true);
    try {
      if (remember) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, formData.email.trim());
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      await login(formData.email.trim(), formData.password);
      addToast('Welcome back! Login successful.', 'success');
      navigate('/dashboard');
    } catch (error) {
      addToast(getErrorMessage(error, 'Login failed'), 'error');
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome Back" subtitle="Log in to your AI CFO workspace">
      <motion.form
        key={shakeKey}
        noValidate
        onSubmit={handleSubmit}
        animate={shakeKey > 0 ? { x: [0, -9, 9, -6, 6, 0] } : undefined}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.05 }}>
          <AuthField
            id="login-email"
            label="Email"
            icon={Mail}
            type="email"
            value={formData.email}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={emailError}
            valid={emailValid}
            placeholder="Enter your email"
            autoComplete="email"
          />
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.12 }}>
          <AuthField
            id="login-password"
            label="Password"
            icon={Lock}
            togglePassword
            value={formData.password}
            onChange={(e) => setField('password', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            onKeyUp={(e) => setCapsLockOn(Boolean(e.getModifierState?.('CapsLock')))}
            onKeyDown={(e) => setCapsLockOn(Boolean(e.getModifierState?.('CapsLock')))}
            error={passwordError}
            valid={passwordValid}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {capsLockOn && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 text-xs font-medium text-amber-400"
            >
              ⚠ Caps Lock is on
            </motion.p>
          )}
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.19 }}
          className="flex items-center justify-between text-sm"
        >
          <label className="group flex cursor-pointer select-none items-center gap-2 text-slate-300 hover:text-white transition">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-700 accent-blue-500 transition"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 font-medium transition">
            Forgot password?
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.26 }}>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={loading ? undefined : { scale: 1.02 }}
            whileTap={loading ? undefined : { scale: 0.97 }}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 py-2.5 font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-600 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                Login
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.form>

      <motion.p
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.33 }}
        className="text-center text-slate-400 mt-6"
      >
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition">
          Sign up
        </Link>
      </motion.p>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-700" />
        <span className="text-xs text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-700" />
      </div>
      <Link
        to="/"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-500/60 hover:text-white hover:bg-slate-700/60"
      >
        ← Explore the Landing Page
      </Link>
    </AuthShell>
  );
}
