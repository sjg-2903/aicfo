import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, AlertCircle, Loader2, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import recommendationService from '@/services/recommendationService';

export default function Recommendations() {
  const qc = useQueryClient();
  const { addToast } = useToast();

  // Auto-fetch the AI summary on page load
  const {
    data: summary,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['recommendation-summary'],
    queryFn: () => recommendationService.getSummary(),
  });

  // Regenerate mutation — triggers a fresh AI analysis + summary
  const regenerateMutation = useMutation({
    mutationFn: () => recommendationService.generate(),
    onSuccess: (result) => {
      // Invalidate both the summary and the stored recommendations caches
      qc.invalidateQueries({ queryKey: ['recommendation-summary'] });
      qc.invalidateQueries({ queryKey: ['recommendations'] });
      qc.invalidateQueries({ queryKey: ['dashboard-recommendations'] });
      qc.invalidateQueries({ queryKey: ['history'] });

      if (result.summaryBullets.length > 0) {
        addToast(
          `Generated ${result.summaryBullets.length} insight${result.summaryBullets.length > 1 ? 's' : ''} from your financial data`,
          'success',
        );
      } else {
        addToast('No summary could be generated yet. Add financial data first.', 'info');
      }
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const bullets = summary?.bullets || [];
  const isGenerating = regenerateMutation.isPending;
  const isBusy = isFetching || isGenerating;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Summary"
        subtitle="AI-powered insights calculated from all your financial data — invoices, cash flow, GST, loans, expenses and transactions"
        actions={
          <button
            onClick={() => regenerateMutation.mutate()}
            disabled={isBusy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isBusy ? 'Analyzing…' : 'Regenerate'}
          </button>
        }
      />

      {error ? (
        <Card className="p-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{getErrorMessage(error)}</p>
            <button
              onClick={() => refetch()}
              className="text-sm font-medium text-red-700 hover:text-red-800 transition"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : isLoading ? (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Analyzing your financial data</h3>
              <p className="text-sm text-slate-500">Generating insights from all finance sections…</p>
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-slate-200 mt-2 shrink-0" />
                <LoadingSkeleton height="h-4" width={i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-5/6' : 'w-2/3'} />
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <>
          {/* Engine & metadata bar */}
          {summary && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                {summary.engine === 'deterministic' ? 'Analysis Engine' : `${summary.engine} AI Engine`}
              </span>
              {summary.generatedAt && (
                <span className="text-slate-400">
                  Generated{' '}
                  {new Date(summary.generatedAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <span className="text-slate-400">{bullets.length} insight{bullets.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {bullets.length === 0 ? (
            <Card className="p-12 text-center">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-1">No financial data available yet</p>
              <p className="text-sm text-slate-400">
                Add transactions, invoices, expenses, GST records and loans to unlock AI-powered insights.
              </p>
            </Card>
          ) : (
            <Card className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Complete Financial Summary
                  </h3>
                  <p className="text-sm text-slate-500">
                    Auto-calculated from all your financial data
                  </p>
                </div>
              </div>

              <ul className="space-y-4">
                {bullets.map((bullet, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 animate-in"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-[15px] leading-relaxed text-slate-700">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
