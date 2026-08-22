import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
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
  Bell,
  Check,
  Play,
  ChevronDown,
} from 'lucide-react';

const APP_NAME = 'AI CFO';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

const viewport = { once: true, amount: 0.2 } as const;

/** Count-up number that animates when it scrolls into view. */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* NAV */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <motion.div
                whileHover={{ rotate: -8, scale: 1.06 }}
                className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/30"
              >
                <BrainCircuit className="w-5 h-5 text-white" />
              </motion.div>
              <div className="leading-tight">
                <span className="text-base font-bold tracking-tight">AI CFO</span>
                <span className="block text-[10px] text-slate-500 -mt-0.5 font-medium">for MSMEs</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              {['Features', 'How it works', 'Pricing', 'FAQ'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="relative hover:text-slate-900 transition group"
                >
                  {item}
                  <span className="absolute left-0 -bottom-1 h-0.5 w-0 bg-blue-600 transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition"
              >
                Login
              </Link>
              <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Link
                  to="/register"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-blue-500/30"
                >
                  Get Started
                </Link>
              </motion.span>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="landing-grid absolute inset-0" />
          <div
            className="landing-blob animate-float-slow w-[34rem] h-[34rem] -top-40 -left-32"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 65%)' }}
          />
          <div
            className="landing-blob animate-float-slower w-[30rem] h-[30rem] top-10 -right-32"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.30), transparent 65%)' }}
          />
          <div
            className="landing-blob animate-float-slow w-[26rem] h-[26rem] bottom-0 left-1/3"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.22), transparent 65%)' }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 text-center">
          {/* Badge */}
          <motion.span
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur border border-blue-100 text-blue-700 text-sm font-medium mb-8 shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> AI-Powered Financial Intelligence
          </motion.span>

          {/* App name — letters fade in one by one */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none">
            {APP_NAME.split('').map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: 44, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.35 + i * 0.09, duration: 0.7, ease: EASE_OUT }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.6, ease: EASE_OUT }}
            className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            Your always-on virtual CFO — real-time visibility, forecasting, risk detection and
            loan-readiness intelligence for smarter business decisions.
          </motion.p>

          {/* CTA — appears after the name */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.45, duration: 0.6, ease: EASE_OUT }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                to="/register"
                className="block w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl font-semibold transition shadow-xl shadow-blue-500/30"
              >
                Get Started
              </Link>
            </motion.span>
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-white/70 backdrop-blur hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-semibold transition shadow-sm"
              >
                <Play className="w-4 h-4" /> Sign in to explore
              </Link>
            </motion.span>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7, duration: 0.7, ease: EASE_OUT }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto"
          >
            {[
              { v: 30, s: '+', l: 'Finance metrics tracked' },
              { v: 50, s: '+', l: 'AI insights generated' },
              { v: 7, s: '', l: 'Intelligent agents' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                  <AnimatedNumber value={s.v} suffix={s.s} />
                </p>
                <p className="text-sm text-slate-500 mt-1">{s.l}</p>
              </div>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.1, duration: 0.6 }}
            className="mt-16 flex justify-center"
          >
            <motion.a
              href="#features"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="text-slate-400 hover:text-blue-600 transition"
              aria-label="Scroll to features"
            >
              <ChevronDown className="w-6 h-6" />
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* PROBLEM + SOLUTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport}>
            <motion.p variants={fadeUp} className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
              The Problem
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold mb-4">
              Most MSMEs run their finances on guesswork
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-600 leading-relaxed">
              Small and medium businesses often lack dedicated CFOs. Financial decisions — pricing,
              borrowing, hiring, collections — are made reactively, based on scattered spreadsheets
              and intuition rather than data. The result is missed cash-flow gaps, delayed GST
              filings, mounting receivables, and loans taken at poor terms.
            </motion.p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            whileHover={{ y: -4 }}
            className="bg-gradient-to-br from-blue-50/80 to-violet-50/60 border border-blue-100 rounded-2xl p-8 shadow-sm"
          >
            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-3">Our Solution</p>
            <h3 className="text-2xl font-bold mb-4">Your always-on AI CFO</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              AI CFO connects to your business data and provides real-time visibility, forecasts,
              risk detection and loan-readiness assessment — so you can make confident,
              data-driven decisions.
            </p>
            <ul className="space-y-3">
              {[
                'Real-time financial health scoring',
                '30-day cash flow forecasting',
                'Automated risk & anomaly detection',
                'Loan readiness intelligence',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold">
              Powerful features for your business
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-600 mt-3 max-w-xl mx-auto">
              Everything you need to understand, monitor and grow your business finances.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {[
              { icon: BarChart3, title: 'Real-time Dashboard', desc: 'KPIs and charts showing revenue, expenses, profit, cash and receivables at a glance.' },
              { icon: TrendingUp, title: 'Cash Flow Forecasting', desc: '30-day forecasts distinguishing historical performance from predicted cash flow.' },
              { icon: ShieldAlert, title: 'Risk Detection', desc: 'Proactive identification of cash shortages, overdue receivables and debt pressure.' },
              { icon: Gauge, title: 'Loan Readiness', desc: 'A 0–100 score with actionable factors to improve your financing eligibility.' },
              { icon: Wallet, title: 'Expense Management', desc: 'Categorized expense tracking with vendor details and recurring detection.' },
              { icon: Receipt, title: 'Invoices & Receivables', desc: 'Track invoices, overdue amounts and collection priority from one place.' },
              { icon: Landmark, title: 'GST & Tax', desc: 'Monitor tax obligations, filing deadlines and payment status.' },
              { icon: Bell, title: 'Smart Alerts', desc: 'Severity-based alerts that route you to the relevant financial section.' },
              { icon: BrainCircuit, title: 'AI CFO Assistant', desc: 'Ask questions about your business and get data-grounded answers instantly.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  className="group bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-violet-600 transition-all duration-300">
                    <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold">
              How it works
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-600 mt-3">
              Three simple steps to financial clarity.
            </motion.p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport} className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Connect your data', desc: 'Link invoices, transactions, expenses, loans and GST records to the platform.' },
              { step: '02', title: 'AI analyzes everything', desc: 'Seven specialized agents continuously analyze your data and detect patterns.' },
              { step: '03', title: 'Act with confidence', desc: 'Get forecasts, risks and recommendations delivered through a conversational AI CFO.' },
            ].map((s) => (
              <motion.div key={s.step} variants={fadeUp} className="text-center p-6">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 4 }}
                  className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center font-bold text-xl mb-4 shadow-lg shadow-blue-500/30"
                >
                  {s.step}
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AGENT ARCHITECTURE */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport} className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold">
              AI Agent Architecture
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-600 mt-3 max-w-xl mx-auto">
              A multi-agent system that works like a full finance team.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {['Cash Flow Agent', 'Invoice Agent', 'Risk Agent', 'GST Agent', 'Expense Agent', 'Loan Agent', 'Recommendation Agent', 'Forecast Agent'].map((agent) => (
              <motion.div
                key={agent}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="bg-white rounded-lg border border-slate-200 p-4 text-center hover:border-blue-300 hover:shadow-md transition-all duration-300"
              >
                <Sparkles className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">{agent}</p>
              </motion.div>
            ))}
          </motion.div>
          <p className="text-xs text-slate-400 text-center mt-6">
            Agent availability and status are provided by the backend and never faked.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold">
              Simple, transparent pricing
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-600 mt-3">
              Start free, upgrade as your business grows.
            </motion.p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport} className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'Starter', price: '₹0', period: '/mo', features: ['Dashboard & KPI tracking', 'Monthly transaction import', 'Basic financial health score', '1 user'], highlight: false },
              { name: 'Growth', price: '₹2,499', period: '/mo', features: ['Everything in Starter', '30-day cash flow forecast', 'Risk & loan readiness analysis', 'AI CFO assistant', 'GST & tax tracking', '5 users'], highlight: true },
              { name: 'Enterprise', price: 'Custom', period: '', features: ['Everything in Growth', 'Dedicated AI agents', 'Advanced integrations', 'API access', 'Priority support'], highlight: false },
            ].map((p) => (
              <motion.div
                key={p.name}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className={`rounded-2xl p-6 ${p.highlight ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-xl shadow-blue-500/30 scale-105' : 'bg-white border border-slate-200 shadow-sm'}`}
              >
                <h3 className={`text-lg font-bold mb-2 ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.name}</h3>
                <div className="mb-4">
                  <span className={`text-4xl font-bold ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.price}</span>
                  <span className={p.highlight ? 'text-blue-100' : 'text-slate-500'}> {p.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${p.highlight ? 'text-blue-50' : 'text-slate-600'}`}>
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.highlight ? 'text-white' : 'text-green-600'}`} /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-2.5 rounded-lg font-semibold text-sm transition ${p.highlight ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  Get Started
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport} className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold">
              Frequently asked questions
            </motion.h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport} className="space-y-4">
            {[
              { q: 'How is AI CFO different from accounting software?', a: 'Accounting software records transactions. AI CFO interprets them — providing forecasts, risk detection, loan readiness and conversational insights, working like a virtual CFO.' },
              { q: 'Is my financial data secure?', a: 'Your data is encrypted in transit and at rest. We never store credentials or expose sensitive information in the frontend.' },
              { q: 'Do I need technical skills to use it?', a: 'No. The interface is designed for business owners. Ask questions in plain language and get instant, data-backed answers.' },
              { q: 'Does it file GST for me?', a: 'AI CFO tracks GST obligations and deadlines and alerts you in advance, but filing is only supported through authorized backend integrations.' },
              { q: 'Can it tell me if I should take a loan?', a: 'It provides a loan-readiness score and clear improvement recommendations, empowering you to approach lenders with confidence.' },
            ].map((f) => (
              <motion.div key={f.q} variants={fadeUp}>
                <details className="bg-white rounded-xl border border-slate-200 group shadow-sm">
                  <summary className="flex items-center justify-between p-5 cursor-pointer font-semibold text-slate-800 list-none">
                    {f.q}
                    <span className="text-blue-600 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-500 leading-relaxed">{f.a}</p>
                </details>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-3xl font-bold"
          >
            Ready to take control of your finances?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-slate-600 mt-3 mb-8"
          >
            Join MSMEs making smarter decisions with AI-powered financial intelligence.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                to="/register"
                className="block w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl font-semibold transition shadow-xl shadow-blue-500/30"
              >
                Get Started Free
              </Link>
            </motion.span>
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition"
              >
                Explore the Demo <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.span>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="w-6 h-6 text-blue-400" />
                <span className="font-bold text-white">AI CFO</span>
              </div>
              <p className="text-sm leading-relaxed">AI-Powered Financial Intelligence for Smarter Business Decisions.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Agents', 'Security'] },
              { title: 'Company', links: ['About', 'Careers', 'Contact', 'Blog'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Compliance'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-semibold mb-3 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm hover:text-white transition">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>© 2026 AI CFO & Financial Advisor. All rights reserved.</p>
            <p>Built for Micro, Small & Medium Enterprises.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
