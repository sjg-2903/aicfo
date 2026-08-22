import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, BrainCircuit, CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import recommendationService from '@/services/recommendationService';

interface RecommendationsSummaryProps {
  /** Render the exact Recommendations content inside another page, such as Dashboard. */
  embedded?: boolean;
}

/**
 * The single source of truth for the complete recommendations summary.
 *
 * Both `/recommendations` and Dashboard use this component and the same
 * `/api/recommendations/summary` query, avoiding separate recommendation
 * fetching, rendering, or regeneration logic.
 */
export default function RecommendationsSummary({ embedded = false }: RecommendationsSummaryProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { data: summary, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['recommendation-summary'],
    queryFn: () => recommendationService.getSummary(),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => recommendationService.generate(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['recommendation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });

      const count = result.recommendations.length || result.summaryBullets.length;
      addToast(
        count > 0
          ? `Generated ${count} fresh recommendation${count === 1 ? '' : 's'} from your financial data`
          : 'No recommendations could be generated yet. Add financial data first.',
        count > 0 ? 'success' : 'info'
      );
    },
    onError: (mutationError) => addToast(getErrorMessage(mutationError), 'error'),
  });

  const bullets = summary?.bullets || [];
  const isGenerating = regenerateMutation.isPending;
  const isBusy = isFetching || isGenerating;
  const action = (
    <button
      onClick={() => regenerateMutation.mutate()}
      disabled={isBusy}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
    >
      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {isBusy ? 'Analyzing…' : 'Regenerate'}
    </button>
  );

  return (
    <section className="space-y-4" aria-label="Financial summary and recommendations">
      {embedded ? (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-violet-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shadow-sm">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Complete Financial Summary</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Recommendations from your invoices, cash flow, GST, loans, expenses and transactions
              </p>
            </div>
          </div>
          <div className="shrink-0">{action}</div>
        </div>
      ) : (
        <PageHeader
          title="Financial Summary"
          subtitle="Actionable recommendations calculated from your invoices, cash flow, GST, loans, expenses and transactions"
          actions={action}
        />
      )}

      {error ? (
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-800">Recommendations are temporarily unavailable</p>
              <p className="mt-0.5 text-sm text-red-700">{getErrorMessage(error)}</p>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </Card>
      ) : isLoading ? (
        <Card className="p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shadow-sm">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Analyzing your financial data</h3>
              <p className="text-sm text-slate-500">Building a complete view across every finance section…</p>
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: embedded ? 6 : 8 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-200" />
                <LoadingSkeleton height="h-4" width={index % 3 === 0 ? 'w-3/4' : index % 3 === 1 ? 'w-5/6' : 'w-2/3'} />
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <>
          {summary && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                {summary.engine === 'bedrock' ? 'AI insights (AWS Bedrock)' : 'Trusted analysis engine'}
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
              <span className="text-slate-400">
                {bullets.length} insight{bullets.length === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {bullets.length === 0 ? (
            <Card className="p-10 text-center sm:p-12">
              <Sparkles className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="mb-1 text-slate-600">No financial data available yet</p>
              <p className="text-sm text-slate-400">
                Add transactions, invoices, expenses, GST records and loans to unlock data-driven recommendations.
              </p>
            </Card>
          ) : (
            <Card className="p-5 sm:p-7">
              {!embedded && (
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shadow-sm">
                    <BrainCircuit className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Complete Financial Summary</h3>
                    <p className="text-sm text-slate-500">Calculated from all of your recorded financial data</p>
                  </div>
                </div>
              )}

              <ul className="space-y-4" aria-live="polite">
                {bullets.map((bullet, index) => (
                  <li
                    key={`${index}-${bullet.slice(0, 24)}`}
                    className="flex items-start gap-3 rounded-lg px-1 py-0.5 animate-in"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                    <span className="text-sm leading-relaxed text-slate-700 sm:text-[15px]">{bullet}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
