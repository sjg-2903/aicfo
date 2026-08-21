import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Landing() {
  const { loginAsDemo, isAuthenticated } = useAuth();

  const explore = async () => {
    if (!isAuthenticated) await loginAsDemo();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <span className="text-base font-bold text-slate-900">AI CFO</span>
                <span className="block text-[10px] text-slate-500 -mt-0.5 font-medium">for MSMEs</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-slate-900 transition">Features</a>
              <a href="#how" className="hover:text-slate-900 transition">How it works</a>
              <a href="#pricing" className="hover:text-slate-900 transition">Pricing</a>
              <a href="#faq" className="hover:text-slate-900 transition">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition">
                Login
              </Link>
              <Link to="/register" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 to-white pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6 animate-in">
            <Sparkles className="w-4 h-4" /> AI-Powered Financial Intelligence
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
            AI CFO & Financial Advisor
            <span className="block text-blue-600">for MSMEs</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            AI-Powered Financial Intelligence for Smarter Business Decisions
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition transform hover:scale-[1.02] shadow-lg shadow-blue-200"
            >
              Get Started
            </Link>
            <Link
              to="/dashboard"
              onClick={explore}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-semibold transition transform hover:scale-[1.02]"
            >
              <Play className="w-4 h-4" /> Explore AI CFO
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { v: '30+', l: 'Finance metrics tracked' },
              { v: '50+', l: 'AI insights generated' },
              { v: '7', l: 'Intelligent agents' },
            ].map((s, i) => (
              <div key={i} className="text-center" style={{ animationDelay: `${i * 100}ms` }}>
                <p className="text-3xl font-bold text-slate-900">{s.v}</p>
                <p className="text-sm text-slate-500 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM + SOLUTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">The Problem</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Most MSMEs run their finances on guesswork</h2>
            <p className="text-slate-600 leading-relaxed">
              Small and medium businesses often lack dedicated CFOs. Financial decisions — pricing, borrowing, hiring,
              collections — are made reactively, based on scattered spreadsheets and intuition rather than data. The
              result is missed cash-flow gaps, delayed GST filings, mounting receivables, and loans taken at poor terms.
            </p>
          </div>
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-8">
            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-3">Our Solution</p>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Your always-on AI CFO</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              AI CFO connects to your business data and provides real-time visibility, forecasts, risk detection and
              loan-readiness assessment — so you can make confident, data-driven decisions.
            </p>
            <ul className="space-y-3">
              {['Real-time financial health scoring', '30-day cash flow forecasting', 'Automated risk & anomaly detection', 'Loan readiness intelligence'].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900">Powerful features for your business</h2>
            <p className="text-slate-600 mt-3 max-w-xl mx-auto">Everything you need to understand, monitor and grow your business finances.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
            <p className="text-slate-600 mt-3">Three simple steps to financial clarity.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Connect your data', desc: 'Link invoices, transactions, expenses, loans and GST records to the platform.' },
              { step: '02', title: 'AI analyzes everything', desc: 'Seven specialized agents continuously analyze your data and detect patterns.' },
              { step: '03', title: 'Act with confidence', desc: 'Get forecasts, risks and recommendations delivered through a conversational AI CFO.' },
            ].map((s) => (
              <div key={s.step} className="text-center p-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl mb-4">{s.step}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AGENT ARCHITECTURE */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">AI Agent Architecture</h2>
            <p className="text-slate-600 mt-3 max-w-xl mx-auto">A multi-agent system that works like a full finance team.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Cash Flow Agent', 'Invoice Agent', 'Risk Agent', 'GST Agent', 'Expense Agent', 'Loan Agent', 'Recommendation Agent', 'Forecast Agent'].map((agent) => (
              <div key={agent} className="bg-white rounded-lg border border-slate-200 p-4 text-center hover:border-blue-300 transition">
                <Sparkles className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">{agent}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-6">Agent availability and status are provided by the backend and never faked.</p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900">Simple, transparent pricing</h2>
            <p className="text-slate-600 mt-3">Start free, upgrade as your business grows.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'Starter', price: '₹0', period: '/mo', features: ['Dashboard & KPI tracking', 'Monthly transaction import', 'Basic financial health score', '1 user'], highlight: false },
              { name: 'Growth', price: '₹2,499', period: '/mo', features: ['Everything in Starter', '30-day cash flow forecast', 'Risk & loan readiness analysis', 'AI CFO assistant', 'GST & tax tracking', '5 users'], highlight: true },
              { name: 'Enterprise', price: 'Custom', period: '', features: ['Everything in Growth', 'Dedicated AI agents', 'Advanced integrations', 'API access', 'Priority support'], highlight: false },
            ].map((p) => (
              <div key={p.name} className={`rounded-xl p-6 ${p.highlight ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-white border border-slate-200'}`}>
                <h3 className={`text-lg font-bold mb-2 ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.name}</h3>
                <div className="mb-4">
                  <span className={`text-4xl font-bold ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.price}</span>
                  <span className={p.highlight ? 'text-blue-200' : 'text-slate-500'}> {p.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${p.highlight ? 'text-blue-50' : 'text-slate-600'}`}>
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.highlight ? 'text-white' : 'text-green-600'}`} /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className={`block text-center py-2.5 rounded-lg font-semibold text-sm transition ${p.highlight ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'How is AI CFO different from accounting software?', a: 'Accounting software records transactions. AI CFO interprets them — providing forecasts, risk detection, loan readiness and conversational insights, working like a virtual CFO.' },
              { q: 'Is my financial data secure?', a: 'Your data is encrypted in transit and at rest. We never store credentials or expose sensitive information in the frontend.' },
              { q: 'Do I need technical skills to use it?', a: 'No. The interface is designed for business owners. Ask questions in plain language and get instant, data-backed answers.' },
              { q: 'Does it file GST for me?', a: 'AI CFO tracks GST obligations and deadlines and alerts you in advance, but filing is only supported through authorized backend integrations.' },
              { q: 'Can it tell me if I should take a loan?', a: 'It provides a loan-readiness score and clear improvement recommendations, empowering you to approach lenders with confidence.' },
            ].map((f, i) => (
              <details key={i} className="bg-white rounded-xl border border-slate-200 group">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-semibold text-slate-800 list-none">
                  {f.q}
                  <span className="text-blue-600 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-500 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Ready to take control of your finances?</h2>
          <p className="text-slate-600 mt-3 mb-8">Join MSMEs making smarter decisions with AI-powered financial intelligence.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-lg shadow-blue-200">
              Get Started Free
            </Link>
            <Link to="/dashboard" onClick={explore} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold transition">
              Explore the Demo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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
                    <li key={l}><a href="#" className="text-sm hover:text-white transition">{l}</a></li>
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
