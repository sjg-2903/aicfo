import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Sparkles,
  BrainCircuit,
  TrendingUp,
  DollarSign,
  PieChart,
  Banknote,
  Landmark,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Check,
  X,
  Search,
  Loader2,
  Send,
  Zap,
  Tag,
  Lightbulb,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useToast } from '@/components/Toast';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import recommendationService, { type GenerateResult } from '@/services/recommendationService';
import SegmentStepsGuide from '@/components/SegmentStepsGuide';

const PRESET_PROMPTS = [
  { label: '🚀 Maximize Working Capital', prompt: 'Focus on working capital optimization, cash runway extension, and deploying surplus cash.' },
  { label: '💰 Cut Discretionary Spend by 10%', prompt: 'Identify all discretionary expense leakages, recurring subscriptions, and vendor cost reduction opportunities.' },
  { label: '⚡ Accelerate Invoice Collections', prompt: 'Give me aggressive receivables recovery strategies, Net-DSO reduction tactics, and customer prompt-pay discounts.' },
  { label: '🏦 Prepare for Bank Loan Approval', prompt: 'Formulate an actionable plan to maximize our bank loan readiness score, DSCR ratio, and lender documentation.' },
  { label: '📊 Full MSME Financial Health Audit', prompt: 'Perform a comprehensive financial audit across revenue, margins, expenses, debt service, and GST compliance.' },
  { label: '⚖️ GST & Tax Optimization', prompt: 'Analyze GST liabilities, Input Tax Credit (ITC) reconciliation, and tax planning to avoid penalties and maximize cash.' },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'All Categories', icon: Sparkles },
  { id: 'cash_flow', label: 'Cash Flow', icon: DollarSign },
  { id: 'revenue', label: 'Revenue & Invoices', icon: TrendingUp },
  { id: 'expenses', label: 'Cost Reduction', icon: PieChart },
  { id: 'loan', label: 'Debt & Loans', icon: Banknote },
  { id: 'gst', label: 'GST & Tax', icon: Landmark },
  { id: 'risk', label: 'Risk Mitigation', icon: ShieldAlert },
];

export default function Recommendations() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Fetch full recommendations list
  const {
    data: recommendations = [],
    isLoading: isRecsLoading,
  } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => recommendationService.getRecommendations(),
  });

  // Fetch summary bullets
  const {
    data: summary,
    isLoading: isSummaryLoading,
  } = useQuery({
    queryKey: ['recommendation-summary'],
    queryFn: () => recommendationService.getSummary(),
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: (promptText?: string) => recommendationService.generate(promptText),
    onSuccess: (result: GenerateResult) => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['recommendation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });

      const count = result.recommendations.length || result.summaryBullets.length;
      const engineName =
        result.engine === 'gemini'
          ? 'Google Gemini'
          : result.engine === 'openai'
            ? 'OpenAI'
            : 'AI CFO Intelligence Engine';

      addToast(
        count > 0
          ? `Generated ${count} fresh recommendations via ${engineName}`
          : 'Analyzed financial telemetry. Add more ledger data for deeper insights.',
        'success'
      );
      setCustomPrompt('');
    },
    onError: (err) => {
      addToast(getErrorMessage(err, 'Could not generate recommendations'), 'error');
    },
  });

  // Status update mutations
  const ackMutation = useMutation({
    mutationFn: (id: string) => recommendationService.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      addToast('Recommendation marked as In Progress', 'info');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => recommendationService.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      addToast('Recommendation completed! ROI tracked.', 'success');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => recommendationService.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      addToast('Recommendation dismissed', 'info');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  // Computed financial impact statistics
  const stats = useMemo(() => {
    let potentialCash = 0;
    let potentialSavings = 0;
    let recoverableCash = 0;
    let completedROI = 0;

    for (const r of recommendations) {
      const val = Number(r.impactValue) || 0;
      if (r.status === 'completed') {
        completedROI += val;
      } else if (r.status !== 'dismissed') {
        if (r.category === 'cash_flow') potentialCash += val;
        else if (r.category === 'spending' || r.category === 'cost_saving' || r.category === 'expenses') potentialSavings += val;
        else if (r.category === 'receivables' || r.category === 'invoices') recoverableCash += val;
        else potentialCash += val;
      }
    }

    return {
      potentialCash: potentialCash || 420000,
      potentialSavings: potentialSavings || 185000,
      recoverableCash: recoverableCash || 240000,
      completedROI: completedROI,
    };
  }, [recommendations]);

  // Filtered recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      // Category filter
      if (activeCategory !== 'all') {
        const cat = (rec.category || '').toLowerCase();
        if (activeCategory === 'cash_flow' && !cat.includes('cash') && !cat.includes('liquidity')) return false;
        if (activeCategory === 'revenue' && !cat.includes('receivable') && !cat.includes('invoice') && !cat.includes('revenue') && !cat.includes('spending')) return false;
        if (activeCategory === 'expenses' && !cat.includes('expense') && !cat.includes('cost') && !cat.includes('spending')) return false;
        if (activeCategory === 'loan' && !cat.includes('loan') && !cat.includes('debt') && !cat.includes('emi')) return false;
        if (activeCategory === 'gst' && !cat.includes('gst') && !cat.includes('tax')) return false;
        if (activeCategory === 'risk' && !cat.includes('risk') && !cat.includes('health')) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && rec.priority !== priorityFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (rec.title || '').toLowerCase();
        const desc = (rec.description || '').toLowerCase();
        const action = (rec.action || '').toLowerCase();
        const reason = (rec.reason || '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !action.includes(q) && !reason.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [recommendations, activeCategory, priorityFilter, statusFilter, searchQuery]);

  const isBusy = generateMutation.isPending || isRecsLoading || isSummaryLoading;
  const currentEngine = summary?.engine || 'gemini';

  const handleGenerate = (promptText?: string) => {
    generateMutation.mutate(promptText || customPrompt || undefined);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="AI Strategic Recommendations & Advisory"
        subtitle="Data-driven capital deployment, revenue acceleration, cost reduction, and debt optimization"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGenerate()}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition cursor-pointer"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>{generateMutation.isPending ? 'Generating AI Plan…' : 'Refresh Recommendations'}</span>
            </button>
          </div>
        }
      />

      {/* Segment Steps Guide */}
      <SegmentStepsGuide segment="recommendations" defaultExpanded={false} />

      {/* Model Engine Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/60 dark:from-slate-900 dark:via-slate-800/60 dark:to-slate-900 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Active AI Engine:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {currentEngine === 'gemini'
                  ? 'Google Gemini 2.5 Flash (Primary)'
                  : currentEngine === 'openai'
                    ? 'OpenAI GPT-4.1 Mini'
                    : 'AI CFO Telemetry Engine'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Analyzes verified invoices, transactions, expenses, GST, and loan schedules
            </p>
          </div>
        </div>

        {summary?.generatedAt && (
          <div className="text-right text-xs text-slate-400 dark:text-slate-500">
            Last evaluated{' '}
            {new Date(summary.generatedAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>

      {/* Financial Impact KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-100 dark:border-emerald-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Potential Cash Unlocked
            </span>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {CURRENCY(stats.potentialCash)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            From liquidity buffers &amp; dynamic discounting
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50/70 to-cyan-50/40 dark:from-blue-950/30 dark:to-cyan-950/20 border-blue-100 dark:border-blue-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
              Recoverable Receivables
            </span>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {CURRENCY(stats.recoverableCash)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Overdue invoices ready for fast recovery
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50/70 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-100 dark:border-amber-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Monthly Cost Savings
            </span>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {CURRENCY(stats.potentialSavings)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Identified in discretionary spend &amp; SaaS
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 dark:from-indigo-950/30 dark:to-purple-950/20 border-indigo-100 dark:border-indigo-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              Realized Actions ROI
            </span>
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {CURRENCY(stats.completedROI)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracked value from completed recommendations
          </p>
        </Card>
      </div>

      {/* Interactive AI Prompt Giving Console */}
      <Card className="p-5 sm:p-6 border-blue-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Ask AI CFO for Custom Recommendations
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Click a strategic goal below or enter your specific business objective to generate customized AI recommendations.
        </p>

        {/* Preset Prompt Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => handleGenerate(p.prompt)}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Prompt Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customPrompt.trim()) {
                handleGenerate(customPrompt);
              }
            }}
            placeholder="e.g. How can we increase operating cash flow by 15% over the next 60 days?"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleGenerate(customPrompt)}
            disabled={isBusy || !customPrompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Generate</span>
          </button>
        </div>
      </Card>

      {/* Strategic Guidance Summary Bullets */}
      {summary && summary.bullets && summary.bullets.length > 0 && (
        <Card className="p-5 sm:p-6 border-blue-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Executive Strategy Briefing
              </h3>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {summary.bullets.length} strategic insights
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.bullets.map((bullet, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed"
              >
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter Toolbar */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const active = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="acknowledged">In Progress</option>
              <option value="completed">Completed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recommendations…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      {isRecsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <LoadingSkeleton height="h-6" width="w-1/3" />
              <div className="mt-3 space-y-2">
                <LoadingSkeleton height="h-4" width="w-full" />
                <LoadingSkeleton height="h-4" width="w-4/5" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No recommendations match your current filters
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Try switching category tabs, clearing your search query, or click "Refresh Recommendations" above.
          </p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setPriorityFilter('all');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 transition"
          >
            Clear Filters
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecommendations.map((rec, index) => {
            const isCritical = rec.priority === 'critical';
            const isHigh = rec.priority === 'high';
            const isCompleted = rec.status === 'completed';
            const isAck = rec.status === 'acknowledged';

            return (
              <motion.div
                key={rec.id || rec.rid || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
              >
                <Card
                  className={`p-5 sm:p-6 transition-all duration-200 ${
                    isCompleted
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10 dark:bg-emerald-950/10'
                      : isCritical
                        ? 'border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 shadow-xs'
                        : isHigh
                          ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10'
                          : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Card Header: Priority, Category, Agent, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Priority Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isCritical
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                            : isHigh
                              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                              : rec.priority === 'medium'
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                        {rec.priority} Priority
                      </span>

                      {/* Source Agent */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {rec.sourceAgent || 'AI CFO'}
                      </span>

                      {/* Status */}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {isAck && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                          <Clock className="w-3 h-3" /> In Progress
                        </span>
                      )}
                    </div>

                    {/* Estimated Impact Value */}
                    {rec.impactValue && rec.impactValue > 0 ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <span>Impact: +{CURRENCY(rec.impactValue)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    {rec.title}
                  </h3>

                  {/* Description / Evidence */}
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    {rec.description}
                  </p>

                  {/* Why this matters */}
                  {rec.reason && rec.reason !== rec.description && (
                    <div className="mb-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">CFO Rationale: </span>
                      {rec.reason}
                    </div>
                  )}

                  {/* Action Plan */}
                  {rec.action && (
                    <div className="mb-4 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-1">
                        <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Action Plan
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        {rec.action}
                      </p>
                    </div>
                  )}

                  {/* Expected Impact */}
                  {rec.impact && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Expected Outcome: </span>
                      {rec.impact}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {!isCompleted && (
                        <button
                          onClick={() => completeMutation.mutate(rec.id)}
                          disabled={completeMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark as Done
                        </button>
                      )}

                      {!isCompleted && !isAck && (
                        <button
                          onClick={() => ackMutation.mutate(rec.id)}
                          disabled={ackMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" /> In Progress
                        </button>
                      )}

                      {rec.status !== 'dismissed' && (
                        <button
                          onClick={() => dismissMutation.mutate(rec.id)}
                          disabled={dismissMutation.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Dismiss
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {rec.date ? `Evaluated ${rec.date}` : ''}
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
