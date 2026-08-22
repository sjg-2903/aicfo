import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageHeader, Pill, ProgressBar, ScoreRing, ErrorState } from '@/components/ui';
import { getErrorMessage } from '@/lib/axios';
import loanReadinessService from '@/services/loanReadinessService';

export default function LoanReadiness() {
  const { data: lr, isLoading, error, refetch } = useQuery({
    queryKey: ['loan-readiness'],
    queryFn: () => loanReadinessService.getLoanReadiness(),
  });

  const score = lr?.score ?? 0;
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';
  const factorColor = (s: number) => (s >= 75 ? '#10b981' : s >= 55 ? '#f59e0b' : '#ef4444');

  return (
    <div className="space-y-6">
      <PageHeader title="Loan Readiness" subtitle="Assess your eligibility for business financing" />

      {error ? (
        <Card>
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-6 flex flex-col items-center" hover>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 self-start">Readiness Score</h3>
              {isLoading ? (
                <div className="h-[170px] flex items-center justify-center text-slate-400 dark:text-slate-500">Loading…</div>
              ) : (
                <ScoreRing score={score} size={170} stroke={13} label={lr?.label ?? ''} color={color} />
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">Based on your real financial data</p>
            </Card>

            <Card className="p-6 lg:col-span-2" hover>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Contributing Factors</h3>
              <div className="space-y-4">
                {(lr?.factors || []).map((f) => (
                  <div key={f.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{f.name.replace(/_/g, ' ')}</span>
                        {f.status && <Pill value={f.status} />}
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{Math.round(f.score)}/100</span>
                    </div>
                    <ProgressBar value={f.score} color={factorColor(f.score)} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recommendation */}
          <Card className="p-6 border-l-4 border-l-blue-600">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Overall Assessment</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{lr?.recommendation}</p>
              </div>
            </div>
          </Card>

          {/* Improvement suggestions */}
          <Card className="p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Improvement Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(lr?.suggestions || []).map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">{s}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-end">
            <Link to="/ai-cfo" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
              Ask AI CFO about loans <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
