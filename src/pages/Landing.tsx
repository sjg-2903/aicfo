import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Gauge,
  Sparkles,
  Wallet,
  Receipt,
  Landmark,
  Check,
  ChevronDown,
  ChevronUp,
  Calculator,
  CheckCircle2,
  Layers,
  Zap,
  Activity,
  DollarSign,
  PieChart,
  Banknote,
  FileBarChart,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';
import { CURRENCY } from '@/lib/format';

const APP_NAME = 'AI CFO';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const viewport = { once: true, amount: 0.15 } as const;

/** Animated number counter on scroll */
function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Number((value * eased).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

export default function Landing() {
  // Mobile nav state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active hero interactive preview tab
  const [heroTab, setHeroTab] = useState<'dashboard' | 'forecast' | 'cfo' | 'readiness'>('dashboard');

  // ROI Calculator monthly turnover state (in Lakhs INR)
  const [turnoverLakhs, setTurnoverLakhs] = useState<number>(35);

  // How it works active step
  const [activeStep, setActiveStep] = useState<number>(0);

  // Features active category tab
  const [activeFeatureTab, setActiveFeatureTab] = useState<string>('all');

  // Pricing annual billing toggle
  const [annualBilling, setAnnualBilling] = useState<boolean>(true);

  // FAQ accordion open states
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Footer newsletter email state
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean>(false);

  // Scroll to top handler
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ROI calculations derived from turnover
  const monthlyRevenue = turnoverLakhs * 100000;
  const unlockedWorkingCapital = Math.round(monthlyRevenue * 0.12);
  const costSavings = Math.round(monthlyRevenue * 0.05 * 12);
  const debtInterestSaved = Math.round(monthlyRevenue * 0.03 * 12);
  const totalAnnualBenefit = unlockedWorkingCapital + costSavings + debtInterestSaved;

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim() && newsletterEmail.includes('@')) {
      setNewsletterSubscribed(true);
      setTimeout(() => {
        setNewsletterEmail('');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* ── STICKY NAVBAR ─────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ rotate: -8, scale: 1.08 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20"
              >
                <BrainCircuit className="w-5 h-5 text-white" />
              </motion.div>
              <div className="leading-tight">
                <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {APP_NAME}
                </span>
                <span className="block text-[11px] text-blue-400 font-medium tracking-wide">
                  Autonomous MSME Intelligence
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
              {[
                { label: 'Features', href: '#features' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'AI Agents', href: '#agents' },
                { label: 'ROI Calculator', href: '#roi-calculator' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'FAQ', href: '#faq' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="relative hover:text-white transition py-1 group"
                >
                  {item.label}
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300 group-hover:w-full rounded-full" />
                </a>
              ))}
            </div>

            {/* Desktop CTA buttons */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/dashboard"
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 rounded-lg transition bg-slate-900/60"
              >
                Live Demo
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Log In
              </Link>
              <motion.span whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md shadow-blue-500/25 ring-1 ring-white/20"
                >
                  Get Started Free
                </Link>
              </motion.span>
            </div>

            {/* Mobile menu button */}
            <div className="flex lg:hidden items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 border border-slate-800 rounded-lg"
              >
                Login
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-b border-slate-800 bg-slate-950 px-4 py-4 space-y-3"
            >
              {[
                { label: 'Features', href: '#features' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'AI Agents', href: '#agents' },
                { label: 'ROI Calculator', href: '#roi-calculator' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'FAQ', href: '#faq' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-medium text-slate-300 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-slate-300 border border-slate-700 rounded-xl"
                >
                  Explore Demo
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl text-sm font-semibold"
                >
                  Get Started Free
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Animated Background Mesh & Ambient Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-40 -left-40 w-[45rem] h-[45rem] rounded-full blur-[140px] opacity-25"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, #6366f1 50%, transparent 80%)' }}
          />
          <div
            className="absolute top-1/4 -right-40 w-[40rem] h-[40rem] rounded-full blur-[140px] opacity-20"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, #ec4899 50%, transparent 80%)' }}
          />
          <div
            className="absolute bottom-0 left-1/3 w-[35rem] h-[35rem] rounded-full blur-[150px] opacity-15"
            style={{ background: 'radial-gradient(circle, #10b981 0%, #06b6d4 50%, transparent 80%)' }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Model Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs sm:text-sm font-semibold mb-8 shadow-inner shadow-blue-500/10 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>Next-Gen Financial Intelligence • Powered by Google Gemini &amp; OpenAI</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.7, ease: EASE_OUT }}
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]"
            >
              AI CFO Financial Adviser For{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                MSMEs
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE_OUT }}
              className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed"
            >
              Replace reactive spreadsheets with continuous intelligence. 30-day cash flow forecasts,
              autonomous risk detection, GST optimization, and bank loan readiness—derived directly
              from your business ledgers.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6, ease: EASE_OUT }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-2xl font-bold text-base transition shadow-xl shadow-blue-500/25 ring-1 ring-white/20"
                >
                  <span>Explore Live Demo</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.span>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>256-Bit Bank Grade Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tally, Zoho &amp; Excel Compatible</span>
              </div>
            </motion.div>
          </div>

          {/* ── INTERACTIVE LIVE HERO SHOWCASE PREVIEW ──────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8, ease: EASE_OUT }}
            className="mt-16 relative mx-auto max-w-5xl"
          >
            {/* Glow ring */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 opacity-30 blur-xl" />

            <div className="relative rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
              {/* Mockup Header Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="ml-2 text-xs font-mono text-slate-400">aicfo.app/command-center</span>
                </div>

                {/* Switchable Interactive Tabs */}
                <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { id: 'forecast', label: 'Cash Forecast', icon: TrendingUp },
                    { id: 'cfo', label: 'AI CFO Chat', icon: BrainCircuit },
                    { id: 'readiness', label: 'Loan Readiness', icon: Gauge },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const active = heroTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setHeroTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <TabIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Showcase Content based on active tab */}
              <div className="min-h-[280px] sm:min-h-[340px]">
                {heroTab === 'dashboard' && (
                  <div className="space-y-4 animate-in">
                    {/* 4 Mini KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-[11px] text-slate-400">Monthly Revenue</p>
                        <p className="text-lg font-bold text-white mt-0.5">₹34,80,000</p>
                        <span className="text-[10px] font-semibold text-emerald-400">↑ +14.2% vs last month</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-[11px] text-slate-400">Cash Balance</p>
                        <p className="text-lg font-bold text-white mt-0.5">₹18,45,200</p>
                        <span className="text-[10px] font-semibold text-blue-400">62 Days Runway</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-[11px] text-slate-400">Overdue Receivables</p>
                        <p className="text-lg font-bold text-amber-400 mt-0.5">₹4,20,000</p>
                        <span className="text-[10px] font-semibold text-amber-400">3 invoices pending</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-[11px] text-slate-400">Financial Health</p>
                        <p className="text-lg font-bold text-emerald-400 mt-0.5">84 / 100</p>
                        <span className="text-[10px] font-semibold text-emerald-400">Strong Tier (Top 10%)</span>
                      </div>
                    </div>

                    {/* Telemetry Visual & AI Insight */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-950 border border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                            AI Strategic Action Recommended
                          </p>
                          <p className="text-xs sm:text-sm text-slate-200 font-medium">
                            Sweep ₹6.5L surplus cash into supplier dynamic discounting for an instant ~36% annualized return.
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/recommendations"
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 transition"
                      >
                        Execute Action →
                      </Link>
                    </div>
                  </div>
                )}

                {heroTab === 'forecast' && (
                  <div className="space-y-4 animate-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">30-Day Predictive Cash Runway</h4>
                        <p className="text-xs text-slate-400">ML Trend with Seasonality &amp; Payment Cycle Telemetry</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Positive Net Float (+₹5.4L)
                      </span>
                    </div>

                    {/* Visual Curve Representation */}
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-end h-48 relative overflow-hidden">
                      <div className="absolute inset-x-0 bottom-8 h-28 bg-gradient-to-t from-blue-600/20 via-indigo-600/10 to-transparent" />
                      <div className="flex items-end justify-between h-32 gap-1 z-10">
                        {[40, 48, 55, 52, 45, 60, 68, 72, 70, 65, 80, 85, 92, 88, 95].map((h, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t transition-all duration-500"
                              style={{ height: `${h}%` }}
                            />
                            <span className="text-[9px] text-slate-500">D{i * 2 + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>✓ Cash dip avoided on Day 14 via Net-15 invoice collections</span>
                      <Link to="/cash-flow" className="text-blue-400 hover:underline">
                        Open Full Forecast →
                      </Link>
                    </div>
                  </div>
                )}

                {heroTab === 'cfo' && (
                  <div className="space-y-3 animate-in">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-950/50 border border-blue-900/50 text-xs text-slate-200">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold">
                        U
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Can we afford to purchase a ₹4,50,000 CNC machine this month?</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 text-white">
                        <BrainCircuit className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">AI CFO (Google Gemini 3.6 Flash)</span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">Grounded in Live Data</span>
                        </div>
                        <p className="leading-relaxed">
                          Yes, but with structured financing. Your current cash balance is <strong>₹18,45,200</strong>, with <strong>₹3,80,000</strong> in GST &amp; EMI obligations due by the 20th.
                        </p>
                        <p className="text-slate-400">
                          <strong>CFO Recommendation:</strong> Make a 25% down payment (₹1,12,500) and take a 3-year machinery loan at 11.5% (EMI ~₹11,100/mo) to preserve your 60-day operational buffer.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Link to="/ai-cfo" className="text-xs font-semibold text-blue-400 hover:underline">
                        Try AI CFO Chat Live →
                      </Link>
                    </div>
                  </div>
                )}

                {heroTab === 'readiness' && (
                  <div className="space-y-4 animate-in">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-emerald-950/30 text-emerald-400 font-extrabold text-xl">
                          88
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Bank Loan Readiness: Prime Eligible</h4>
                          <p className="text-xs text-slate-400">Eligible for up to ₹50,00,000 collateral-free CGTMSE loans at 9.5% p.a.</p>
                        </div>
                      </div>

                      <Link
                        to="/reports"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shrink-0"
                      >
                        Export Lender Dossier PDF
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">DSCR Coverage</span>
                        <span className="font-bold text-emerald-400">2.1x (Strong)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">GST Filing Track</span>
                        <span className="font-bold text-emerald-400">100% On-Time</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Vintage &amp; Revenue</span>
                        <span className="font-bold text-emerald-400">Top 15% MSME</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── STATS COUNTER STRIP ─────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto"
          >
            {[
              { value: 500, prefix: '₹', suffix: 'Cr+', label: 'MSME Ledgers Monitored' },
              { value: 98, suffix: '.4%', label: 'Cash Flow Forecast Accuracy' },
              { value: 7, suffix: ' Agents', label: 'Autonomous AI Finance Agents' },
              { value: 14, suffix: ' Days', label: 'Average Net-DSO Reduction' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center backdrop-blur-sm hover:border-slate-700 transition"
              >
                <p className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS (STEPS COMPONENT) ─────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-slate-900/40 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-16"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-400 text-xs font-semibold uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5" /> 4-Step Executive Workflow
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              How AI CFO Operates for Your Business
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
              A continuous loop of ingestion, autonomous telemetry analysis, executive decisioning, and ROI realization.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Connect Your Ledgers',
                desc: 'Upload CSV/Excel bank statements or sync your Tally/Zoho invoices, expenses, and loan schedules in seconds.',
                tip: 'Smart schema mapper auto-identifies columns with zero manual formatting.',
                icon: Layers,
              },
              {
                step: '02',
                title: 'Autonomous Telemetry',
                desc: 'Specialized AI agents continuously audit runway, detect overdue debtors, calculate GST liabilities, and simulate 30-day cash curves.',
                tip: 'Zero hallucination—all math runs deterministically in backend analytics engines.',
                icon: Activity,
              },
              {
                step: '03',
                title: 'Strategic Action Formulation',
                desc: 'Google Gemini & OpenAI synthesize complex ledgers into prioritized, plain-language recommendations for capital deployment and revenue growth.',
                tip: 'Ranked by estimated INR bottom-line impact value.',
                icon: BrainCircuit,
              },
              {
                step: '04',
                title: 'Execute & Realize ROI',
                desc: 'Trigger 1-click collection reminders, renegotiate supplier contracts, download banker dossiers, and track realized cash savings.',
                tip: 'MSMEs unlock an average of ₹8.5L in annual bottom-line value.',
                icon: CheckCircle2,
              },
            ].map((s, idx) => {
              const StepIcon = s.icon;
              const isSelected = activeStep === idx;
              return (
                <motion.div
                  key={s.step}
                  onClick={() => setActiveStep(idx)}
                  whileHover={{ y: -4 }}
                  className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/40 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/30'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                      {s.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">{s.desc}</p>

                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-blue-300 leading-tight">
                    <span className="font-semibold text-blue-400">Pro Tip: </span>
                    {s.tip}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE MSME ROI & SAVINGS CALCULATOR ─────────────────── */}
      <section id="roi-calculator" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-16"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-semibold uppercase tracking-wider"
            >
              <Calculator className="w-3.5 h-3.5" /> Interactive Value Calculator
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              Calculate Your Potential Value Unlocked
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 mt-3 max-w-xl mx-auto text-sm sm:text-base">
              Drag the slider to your approximate monthly revenue to see estimated working capital and annual cost savings.
            </motion.p>
          </motion.div>

          <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            {/* Slider Control */}
            <div className="space-y-4 mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm font-semibold text-slate-300">
                  Monthly Business Turnover:
                </label>
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-400">
                  ₹{turnoverLakhs} Lakhs / month
                </span>
              </div>

              <input
                type="range"
                min="5"
                max="250"
                step="5"
                value={turnoverLakhs}
                onChange={(e) => setTurnoverLakhs(Number(e.target.value))}
                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>₹5 Lakhs/mo</span>
                <span>₹50 Lakhs/mo</span>
                <span>₹1 Crore/mo</span>
                <span>₹2.5 Crores/mo</span>
              </div>
            </div>

            {/* Calculated Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                  <DollarSign className="w-4 h-4" /> Liquidity Unlocked
                </div>
                <p className="text-2xl font-bold text-white mt-1">{CURRENCY(unlockedWorkingCapital)}</p>
                <p className="text-xs text-slate-400 mt-1">Faster collection velocity &amp; sweep yield</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                  <PieChart className="w-4 h-4" /> Spend Waste Prevented
                </div>
                <p className="text-2xl font-bold text-white mt-1">{CURRENCY(costSavings)}</p>
                <p className="text-xs text-slate-400 mt-1">Annual savings via contract audits</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
                  <Banknote className="w-4 h-4" /> Interest Saved
                </div>
                <p className="text-2xl font-bold text-white mt-1">{CURRENCY(debtInterestSaved)}</p>
                <p className="text-xs text-slate-400 mt-1">Via optimized loan prepayment schedules</p>
              </div>
            </div>

            {/* Total Annual Value Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-violet-900/60 border border-blue-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <span className="text-xs uppercase font-bold text-blue-300 tracking-wider">
                  Total Estimated Annual Bottom-Line Impact:
                </span>
                <p className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                  {CURRENCY(totalAnnualBenefit)} / year
                </p>
              </div>

              <Link
                to="/register"
                className="px-6 py-3.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-sm transition shadow-lg shrink-0"
              >
                Unlock This Value Now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-slate-900/30 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-14"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-violet-950 border border-violet-800 text-violet-400 text-xs font-semibold uppercase tracking-wider"
            >
              <Zap className="w-3.5 h-3.5" /> Full Spectrum Finance
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              Everything Your Finance Function Needs
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 mt-3 max-w-xl mx-auto text-sm sm:text-base">
              Built specifically for Indian MSMEs navigating GST compliance, working capital lines, and high-velocity cash flows.
            </motion.p>
          </motion.div>

          {/* Feature Category Tabs */}
          <div className="flex justify-center gap-2 mb-10 flex-wrap">
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'core', label: 'Financial Core' },
              { id: 'intelligence', label: 'AI Intelligence' },
              { id: 'compliance', label: 'Compliance & Tax' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveFeatureTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  activeFeatureTab === t.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: BarChart3,
                title: 'Real-Time Financial Telemetry',
                desc: 'Consolidated revenue, expenses, cash balances, and burn rate telemetry with 6-month historical benchmarking.',
                category: 'core',
              },
              {
                icon: TrendingUp,
                title: '30-Day Cash Flow Forecasting',
                desc: 'Machine learning forecasts projecting daily net inflows and identifying future liquidity shortfalls weeks ahead.',
                category: 'intelligence',
              },
              {
                icon: ShieldAlert,
                title: 'Proactive Risk Radar',
                desc: 'Real-time detection of overdue debtor concentration, margin compression, and debt service vulnerabilities.',
                category: 'compliance',
              },
              {
                icon: Gauge,
                title: 'Bank Loan Readiness Score',
                desc: '0–100 bankability evaluation benchmarking DSCR, revenue vintage, and GST compliance with exportable dossiers.',
                category: 'intelligence',
              },
              {
                icon: Receipt,
                title: 'Invoices & Net-DSO Acceleration',
                desc: 'Aging bucket tracking (0-90+ days) with automated prompt settlement discounts and polite payment nudges.',
                category: 'core',
              },
              {
                icon: Wallet,
                title: 'Expense & Spend Audit',
                desc: 'Line-item categorisation, recurring SaaS detection, and vendor contract benchmarking to eliminate margin leakage.',
                category: 'core',
              },
              {
                icon: Landmark,
                title: 'GST & ITC Reconciliation',
                desc: 'Track GSTR-1 & GSTR-3B liability, reconcile Input Tax Credit, and set automatic reminders to avoid late fees.',
                category: 'compliance',
              },
              {
                icon: BrainCircuit,
                title: 'Multimodal AI CFO Assistant',
                desc: 'Conversational financial reasoning powered by Google Gemini & OpenAI with receipt and invoice image analysis.',
                category: 'intelligence',
              },
              {
                icon: FileBarChart,
                title: 'Audit-Ready Executive Reports',
                desc: 'Generate institutional PDF reports with full data verification timestamps for board members, lenders, and CAs.',
                category: 'compliance',
              },
            ]
              .filter((f) => activeFeatureTab === 'all' || f.category === activeFeatureTab)
              .map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    whileHover={{ y: -4 }}
                    className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  </motion.div>
                );
              })}
          </div>
        </div>
      </section>

      {/* ── AUTONOMOUS MULTI-AGENT ARCHITECTURE ──────────────────────── */}
      <section id="agents" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-16"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-400 text-xs font-semibold uppercase tracking-wider"
            >
              <BrainCircuit className="w-3.5 h-3.5" /> Multi-Agent Swarm Intelligence
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              8 Specialized Agents Working As Your Finance Team
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
              Each autonomous agent monitors a distinct domain of your business ledgers and collaborates to provide unified CFO intelligence.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Cash Flow Agent', role: '30-Day ML Inflow/Outflow Forecasting' },
              { name: 'Invoice Agent', role: 'DSO Reduction & Payment Follow-ups' },
              { name: 'Risk Radar Agent', role: 'Debtor Concentration & Anomaly Scan' },
              { name: 'GST & Tax Agent', role: 'ITC Max & GSTR-1/3B Compliance' },
              { name: 'Expense Agent', role: 'SaaS Audit & Margin Leakage Shield' },
              { name: 'Loan & Debt Agent', role: 'DSCR Coverage & Prepayment Models' },
              { name: 'AI CFO Advisory', role: 'Gemini-Powered Capital Strategy' },
              { name: 'Health Agent', role: '5-Pillar MSME Ratio Score Benchmark' },
            ].map((agent) => (
              <motion.div
                key={agent.name}
                whileHover={{ y: -3 }}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all text-center"
              >
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400 uppercase">Operational</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{agent.name}</h4>
                <p className="text-[11px] text-slate-400 leading-tight">{agent.role}</p>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-500 mt-8">
            * Agent status and telemetry are computed deterministically from verified backend MongoDB ledgers.
          </p>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-14"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 text-xs font-semibold uppercase tracking-wider"
            >
              <DollarSign className="w-3.5 h-3.5" /> Transparent Pricing
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              Simple Plans for Every Stage of Growth
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 mt-3 max-w-xl mx-auto text-sm sm:text-base">
              Start free today with no credit card. Upgrade as your transaction volume and team scale.
            </motion.p>

            {/* Billing toggle */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className={`text-xs font-semibold ${!annualBilling ? 'text-white' : 'text-slate-400'}`}>
                Monthly
              </span>
              <button
                type="button"
                onClick={() => setAnnualBilling(!annualBilling)}
                className="w-12 h-6 rounded-full bg-slate-800 p-1 transition-colors relative"
                aria-label="Toggle Annual Billing"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-blue-500 transition-transform ${
                    annualBilling ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-semibold ${annualBilling ? 'text-white' : 'text-slate-400'}`}>
                Annual <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded-full ml-1">Save 20% + 2 Months Free</span>
              </span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '₹0',
                period: '/month',
                desc: 'Perfect for micro-enterprises and single founders getting started with ledger visibility.',
                highlight: false,
                features: [
                  'Full KPI Dashboard & Cash Ledger',
                  'Monthly CSV/Excel Transaction Import',
                  'Financial Health Ratio Scoring',
                  'Basic Invoices & Expense Log',
                  '1 Team Member Access',
                ],
                cta: 'Start Free Forever',
              },
              {
                name: 'Growth Pro',
                price: annualBilling ? '₹1,999' : '₹2,499',
                period: '/month',
                desc: 'The complete autonomous virtual CFO suite for growing MSMEs with multi-crore turnover.',
                highlight: true,
                badge: 'Most Popular',
                features: [
                  'Everything in Starter',
                  '30-Day Cash Flow ML Forecast',
                  'Full Risk Radar & Anomaly Scanner',
                  '0-100 Bank Loan Readiness Dossier',
                  'Google Gemini & OpenAI Conversational CFO',
                  'GST ITC Maximization & Deadlines',
                  'Audit-Ready PDF Report Exports',
                  '5 Team Member Accounts',
                ],
                cta: 'Explore Live Demo',
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                desc: 'Customized multi-entity corporate deployments with dedicated database isolation and API access.',
                highlight: false,
                features: [
                  'Everything in Growth Pro',
                  'Unlimited Entities & Ledgers',
                  'Direct Tally / ERP Database Sync',
                  'Custom Fine-Tuned AI CFO Models',
                  'Dedicated Chartered Accountant Support',
                  'SLA & Priority 24/7 Hotline',
                  'Unlimited Team Members',
                ],
                cta: 'Contact Sales',
              },
            ].map((plan) => (
              <motion.div
                key={plan.name}
                whileHover={{ y: -6 }}
                className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-blue-900/50 via-slate-900 to-slate-950 border-2 border-blue-500 shadow-2xl shadow-blue-500/20'
                    : 'bg-slate-900/60 border border-slate-800'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">{plan.desc}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-xs text-slate-400 font-medium"> {plan.period}</span>
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to="/register"
                  className={`w-full py-3 rounded-xl font-bold text-sm text-center transition ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-md shadow-blue-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ─────────────────────────────────────────── */}
      <section id="faq" className="py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-16"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-400 text-xs font-semibold uppercase tracking-wider"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Common Questions
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              Frequently Asked Questions
            </motion.h2>
          </motion.div>

          <div className="space-y-3">
            {[
              {
                q: 'How does AI CFO differ from standard accounting software like Tally or Zoho Books?',
                a: 'Traditional accounting software records what happened in the past. AI CFO interprets that data to predict what will happen next—projecting 30-day cash runways, flagging debtor default risks, calculating loan eligibility scores, and recommending exact capital deployment moves.',
              },
              {
                q: 'Is my MSME financial data safe and confidential?',
                a: 'Yes. All data is encrypted with AES-256 at rest and TLS 1.3 in transit. Financial calculations are computed deterministically inside isolated database containers. External AI narrative models (Gemini & OpenAI) only receive synthesized telemetry summaries without banking credentials.',
              },
              {
                q: 'How does the AI model priority work?',
                a: 'The system uses Google Gemini 3.6 Flash as its primary high-speed narrative model for instant conversational chat and multimodal invoice document analysis, with OpenAI GPT-4.1 Mini as an intelligent automated failover. If both are unreachable, deterministic financial engines provide 100% reliable fallback.',
              },
              {
                q: 'Can AI CFO help my business get approved for bank loans?',
                a: 'Yes. The Loan Readiness module calculates your 0–100 bankability score based on actual DSCR coverage, revenue consistency, and GST compliance. It highlights exact steps to fix weak factors and generates an exportable, banker-ready PDF dossier.',
              },
              {
                q: 'Do I need accounting or technical expertise to use AI CFO?',
                a: 'None at all. The interface is designed for MSME founders and business owners. You can upload existing spreadsheets, view clear visual charts, and ask plain-language questions like "How can I increase cash runway by 30 days?" to get actionable advice.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm sm:text-base text-slate-200 hover:text-white transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="p-1 rounded-lg bg-slate-800 text-slate-400 shrink-0 ml-3">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <p className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL HIGH-IMPACT CTA ──────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="rounded-3xl p-10 sm:p-16 bg-gradient-to-br from-blue-900/80 via-indigo-900/60 to-violet-900/80 border border-blue-700/60 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-violet-500/20 blur-3xl" />

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Take Complete Control of Your Business Finances Today
            </h2>
            <p className="mt-4 text-sm sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Join thousands of Indian MSME owners making confident, data-driven decisions with always-on AI intelligence.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-extrabold text-sm sm:text-base transition shadow-xl"
              >
                Get Started Free (No Credit Card)
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-8 py-4 bg-blue-950/80 hover:bg-blue-900 border border-blue-600/60 text-white rounded-2xl font-bold text-sm sm:text-base transition"
              >
                Explore Live Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── ANIMATED & FULLY FUNCTIONAL FOOTER ───────────────────────── */}
      <footer className="relative bg-slate-950 border-t border-slate-800 text-slate-400 overflow-hidden">
        {/* Glowing shimmer line on top of footer */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60 animate-pulse" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Column 1: Brand & Status */}
            <div className="lg:col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">AI CFO</span>
              </Link>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
                Autonomous financial intelligence, 30-day cash flow forecasting, and loan readiness intelligence built for Micro, Small &amp; Medium Enterprises.
              </p>

              {/* Live Status indicator */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>AI Engines Online: Google Gemini 3.6 &amp; OpenAI</span>
              </div>

              {/* Newsletter subscribe form */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-200 mb-2">Subscribe to MSME Financial Insights:</p>
                {newsletterSubscribed ? (
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-in">
                    <CheckCircle2 className="w-4 h-4" /> Thank you for subscribing!
                  </p>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} className="flex gap-2 max-w-sm">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="founder@company.com"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Subscribe
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Column 2: Product Navigation */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#features" className="hover:text-white transition">Features Overview</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
                <li><a href="#agents" className="hover:text-white transition">AI Agent Architecture</a></li>
                <li><a href="#roi-calculator" className="hover:text-white transition">MSME ROI Calculator</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing Plans</a></li>
                <li><a href="#faq" className="hover:text-white transition">Frequently Asked Questions</a></li>
              </ul>
            </div>

            {/* Column 3: Dashboard Direct Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Dashboard Hub</h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link to="/dashboard" className="hover:text-white transition">Executive Dashboard</Link></li>
                <li><Link to="/financial-health" className="hover:text-white transition">Financial Health Score</Link></li>
                <li><Link to="/cash-flow" className="hover:text-white transition">30-Day Cash Forecast</Link></li>
                <li><Link to="/loan-readiness" className="hover:text-white transition">Loan Readiness Dossier</Link></li>
                <li><Link to="/ai-cfo" className="hover:text-white transition">AI CFO Chat Assistant</Link></li>
                <li><Link to="/recommendations" className="hover:text-white transition">AI Strategic Recommendations</Link></li>
                <li><Link to="/gst" className="hover:text-white transition">GST &amp; Tax Compliance</Link></li>
                <li><Link to="/reports" className="hover:text-white transition">PDF Report Generator</Link></li>
              </ul>
            </div>

            {/* Column 4: Account & Legal */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Account &amp; Security</h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link to="/login" className="hover:text-white transition">Account Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition">Create Free Account</Link></li>
                <li><Link to="/forgot-password" className="hover:text-white transition">Reset Password</Link></li>
                <li><Link to="/settings" className="hover:text-white transition">System &amp; AI Settings</Link></li>
                <li><Link to="/profile" className="hover:text-white transition">MSME Business Profile</Link></li>
                <li><Link to="/history" className="hover:text-white transition">Audit History Logs</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar with Back-to-Top */}
          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>© 2026 AI CFO &amp; Financial Advisor for MSMEs. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Encrypted with AES-256</span>
              <span>•</span>
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer"
              >
                Back to Top ↑
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
