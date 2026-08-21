import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  RefreshCw,
  ArrowRight,
  Receipt,
  Wallet,
  TrendingUp,
  PiggyBank,
  Landmark,
  Banknote,
  Gauge,
  HeartPulse,
  Target,
  ShieldAlert,
  Lightbulb,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import { Card, Pill } from '@/components/ui';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { getErrorMessage } from '@/lib/axios';
import recommendationService from '@/services/recommendationService';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  receivables: Receipt,
  cash_flow: Wallet,
  spending: TrendingUp,
  cost_saving: PiggyBank,
  gst: Landmark,
  loan: Banknote,
  loan_readiness: Gauge,
  health: HeartPulse,
  priorities: Target,
  risk: ShieldAlert,
};

const CATEGORY_TONES: Record<string, string> = {
  receivables: 'bg-orange-50 text-orange-600',
  cash_flow: 'bg-blue-50 text-blue-600',
  spending: 'bg-amber-50 text-amber-600',
  cost_saving: 'bg-green-50 text-green-600',
  gst: 'bg-violet-50 text-violet-600',
  loan: 'bg-slate-100 text-slate-600',
  loan_readiness: 'bg-cyan-50 text-cyan-600',
  health: 'bg-pink-50 text-pink-600',
  priorities: 'bg-indigo-50 text-indigo-600',
  risk: 'bg-red-50 text-red-600',
};

export default function DashboardRecommendations() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-recommendations'],
    queryFn: () => recommendationService.getDashboardRecommendations(),
  });

  const recs = data?.recommendations || [];

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">AI Recommendations</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Generated from your transactions, invoices, expenses, GST and loans
              {data && (
                <span className="ml-1.5 text-xs text-slate-400">
                  · {data.engine === 'gemini' ? 'AI engine' : 'analysis engine'} ·{' '}
                  {data.generatedAt ? new Date(data.generatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/recommendations"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{getErrorMessage(error)}</p>
          <button onClick={() => refetch()} className="text-sm font-medium text-red-700 hover:text-red-800 transition">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
              <LoadingSkeleton height="h-4" width="w-1/3" />
              <LoadingSkeleton height="h-3" width="w-full" count={2} className="mt-2" />
            </div>
          ))}
        </div>
      ) : recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
            <Lightbulb className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-sm font-medium text-slate-700">Not enough financial data yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Upload or add transactions, invoices and expenses and the AI engine will build data-driven recommendations for you.
          </p>
          <Link
            to="/transactions"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
          >
            <UploadCloud className="w-4 h-4" /> Add your first data
          </Link>
        </div>
      ) : (
        <>
          {data?.narrative && (
            <div className="p-3.5 rounded-lg bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100 mb-4 animate-in">
              <p className="text-sm text-slate-700 leading-relaxed">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 inline mr-1 -mt-0.5" />
                {data.narrative}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {recs.slice(0, 6).map((rec, idx) => {
              const Icon = CATEGORY_ICONS[rec.category] || Lightbulb;
              const tone = CATEGORY_TONES[rec.category] || 'bg-slate-100 text-slate-600';
              return (
                <div
                  key={rec.id}
                  className="group p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-slate-900 leading-snug">{rec.title}</h4>
                        <Pill value={rec.priority} />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-2">{rec.description}</p>
                      <div className="flex items-start gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 font-medium">{rec.action}</p>
                      </div>
                      {rec.impact && <p className="text-[11px] text-green-600 mt-1.5 font-medium">Potential impact: {rec.impact}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
