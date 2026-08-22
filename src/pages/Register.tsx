import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Building2, Loader2, Check, UserPlus, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import AuthShell from '@/components/AuthShell';
import { AuthField } from '@/components/AuthField';
import { cn } from '@/utils/cn';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

function getPasswordStrength(password: string) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Upper & lowercase letters', ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'At least one number', ok: /\d/.test(password) },
    { label: 'At least one special character', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const meta = [
    { label: 'Very weak', color: 'bg-red-500', text: 'text-red-400' },
    { label: 'Weak', color: 'bg-orange-500', text: 'text-orange-400' },
    { label: 'Fair', color: 'bg-amber-400', text: 'text-amber-300' },
    { label: 'Good', color: 'bg-lime-400', text: 'text-lime-300' },
    { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' },
  ][score];
  return { checks, score, ...meta };
}

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [touched, setTouched] = useState({
    business_name: false,
    owner_name: false,
    email: false,
    password: false,
    confirm: false,
  });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm: '',
    business_name: '',
    owner_name: '',
  });

  const setField = (field: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const touch = (field: keyof typeof touched) => setTouched((t) => ({ ...t, [field]: true }));

  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  // Live validation (matches backend rules: min 2 chars for names, min 8 for password)
  const businessValid = formData.business_name.trim().length >= 2;
  const ownerValid = formData.owner_name.trim().length >= 2;
  const emailValid = EMAIL_RE.test(formData.email.trim());
  const passwordValid = formData.password.length >= 8;
  const confirmValid = formData.confirm.length > 0 && formData.confirm === formData.password;
  const formValid = businessValid && ownerValid && emailValid && passwordValid && confirmValid;

  const errors = {
    business_name:
      touched.business_name && !businessValid ? 'Business name must be at least 2 characters' : '',
    owner_name: touched.owner_name && !ownerValid ? 'Owner name must be at least 2 characters' : '',
    email: touched.email && !emailValid ? (formData.email ? 'Enter a valid email address' : 'Email is required') : '',
    password: touched.password && !passwordValid ? 'Password must be at least 8 characters' : '',
    confirm: touched.confirm && !confirmValid ? (formData.confirm ? 'Passwords do not match' : 'Please confirm your password') : '',
  };

  const completedSteps = [businessValid, ownerValid, emailValid, passwordValid, confirmValid].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ business_name: true, owner_name: true, email: true, password: true, confirm: true });
    if (!formValid) {
      setShakeKey((k) => k + 1);
      return;
    }

    setLoading(true);
    try {
      await register(formData.email.trim(), formData.password, formData.business_name.trim(), formData.owner_name.trim());
      addToast('Account created successfully. Welcome to AI CFO!', 'success');
      navigate('/dashboard');
    } catch (error) {
      addToast(getErrorMessage(error, 'Registration failed'), 'error');
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  let fieldDelay = 0.05;

  return (
    <AuthShell title="Create Account" subtitle="Start making smarter financial decisions today">
      {/* Live progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1.5">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Profile completion
          </span>
          <span className={cn(completedSteps === 5 ? 'text-emerald-400' : 'text-slate-400')}>{completedSteps}/5</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
          <motion.div
            className={cn(
              'h-full rounded-full transition-colors',
              completedSteps === 5 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-violet-500',
            )}
            animate={{ width: `${(completedSteps / 5) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      <motion.form
        key={shakeKey}
        noValidate
        onSubmit={handleSubmit}
        animate={shakeKey > 0 ? { x: [0, -9, 9, -6, 6, 0] } : undefined}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: (fieldDelay += 0.07) }}>
          <AuthField
            id="register-business"
            label="Business Name"
            icon={Building2}
            type="text"
            value={formData.business_name}
            onChange={(e) => setField('business_name', e.target.value)}
            onBlur={() => touch('business_name')}
            error={errors.business_name}
            valid={businessValid}
            placeholder="Your business name"
            autoComplete="organization"
          />
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: (fieldDelay += 0.07) }}>
          <AuthField
            id="register-owner"
            label="Owner Name"
            icon={User}
            type="text"
            value={formData.owner_name}
            onChange={(e) => setField('owner_name', e.target.value)}
            onBlur={() => touch('owner_name')}
            error={errors.owner_name}
            valid={ownerValid}
            placeholder="Your name"
            autoComplete="name"
          />
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: (fieldDelay += 0.07) }}>
          <AuthField
            id="register-email"
            label="Email"
            icon={Mail}
            type="email"
            value={formData.email}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => touch('email')}
            error={errors.email}
            valid={emailValid}
            placeholder="your@email.com"
            autoComplete="email"
          />
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: (fieldDelay += 0.07) }}>
          <AuthField
            id="register-password"
            label="Password"
            icon={Lock}
            togglePassword
            value={formData.password}
            onChange={(e) => setField('password', e.target.value)}
            onBlur={() => {
              touch('password');
              setPasswordFocused(false);
            }}
            onFocus={() => setPasswordFocused(true)}
            error={errors.password}
            valid={passwordValid && strength.score >= 3}
            placeholder="Create a strong password"
            autoComplete="new-password"
          />

          {/* Live password strength meter */}
          <AnimatePresence initial={false}>
            {(passwordFocused || formData.password.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1.5 flex-1 mr-3">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-colors duration-300',
                          i < strength.score ? strength.color : 'bg-slate-700',
                        )}
                        initial={false}
                      />
                    ))}
                  </div>
                  <span className={cn('text-[11px] font-semibold', formData.password ? strength.text : 'text-slate-500')}>
                    {formData.password ? strength.label : ''}
                  </span>
                </div>
                <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                  {strength.checks.map((c) => (
                    <li
                      key={c.label}
                      className={cn(
                        'flex items-center gap-1.5 text-[11px] transition-colors duration-200',
                        c.ok ? 'text-emerald-400' : 'text-slate-500',
                      )}
                    >
                      <motion.span
                        initial={false}
                        animate={{ scale: c.ok ? [0.6, 1.15, 1] : 1 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          'flex h-3.5 w-3.5 items-center justify-center rounded-full border',
                          c.ok ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-600',
                        )}
                      >
                        {c.ok && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                      </motion.span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: (fieldDelay += 0.07) }}>
          <AuthField
            id="register-confirm"
            label="Confirm Password"
            icon={Lock}
            togglePassword
            value={formData.confirm}
            onChange={(e) => setField('confirm', e.target.value)}
            onBlur={() => touch('confirm')}
            error={errors.confirm}
            valid={confirmValid}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
          <AnimatePresence>
            {confirmValid && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} /> Passwords match
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: (fieldDelay += 0.07) }}>
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
                Creating account...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
                Sign Up
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.form>

      <motion.p
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: fieldDelay + 0.07 }}
        className="text-center text-slate-400 mt-6"
      >
        Already have an account?{' '}
        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition">
          Login
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
