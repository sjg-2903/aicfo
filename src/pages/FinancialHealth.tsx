import { useQuery } from '@tanstack/react-query';
import { ThumbsUp, ThumbsDown, TrendingUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, ChartCard, PageHeader, Pill, ScoreRing, ProgressBar, ErrorState } from '@/components/ui';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import dashboardService from '@/services/dashboardService';

export default function FinancialHealth() {
  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ['financial-health'],
    queryFn: () => dashboardService.getFinancialHealth(),
  });

  const score = health?.score ?? 0;
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Health" subtitle="Detailed analysis of your business's financial condition" />

      {error ? (
        <Card>
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          {/* Score overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-6 flex flex-col items-center" hover>
              <h3 className="text-base font-semibold text-slate-900 mb-4 self-start">Health Score</h3>
              {isLoading ? (
                <div className="h-[170px] flex items-center justify-center text-slate-400">Loading…</div>
              ) : (
                <ScoreRing score={score} size={170} stroke={13} label={health?.label ?? ''} color={color} />
              )}
            </Card>

            <ChartCard title="Score Factors" subtitle="Weighted contribution to overall score" className="lg:col-span-2">
              <div className="space-y-5 py-2">
                {(health?.factors || []).map((f) => (
                  <div key={f.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{f.name.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-semibold text-slate-900">{Math.round(f.score)}/100</span>
                    </div>
                    <ProgressBar value={f.score} color={f.score >= 75 ? '#10b981' : f.score >= 55 ? '#f59e0b' : '#ef4444'} />
                    <p className="text-xs text-slate-400 mt-1">Weight: {Math.round(f.weight * 100)}%</p>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Indicators */}
          <Card className="p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Key Financial Indicators</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {(health?.indicators || []).map((ind) => (
                <div key={ind.name} className="p-4 rounded-lg bg-slate-50 text-center">
                  <p className="text-xs text-slate-500 mb-1.5">{ind.name}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {ind.unit === '₹' ? CURRENCY(ind.value) : ind.value}
                    <span className="text-sm font-normal text-slate-400 ml-0.5">{ind.unit}</span>
                  </p>
                  <div className="mt-2 flex justify-center">
                    <Pill value={ind.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp className="w-5 h-5 text-green-600" />
                <h3 className="text-base font-semibold text-slate-900">Strengths</h3>
              </div>
              <ul className="space-y-3">
                {(health?.strengths || []).length === 0 && <li className="text-sm text-slate-400">No notable strengths detected yet.</li>}
                {(health?.strengths || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsDown className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-semibold text-slate-900">Weaknesses</h3>
              </div>
              <ul className="space-y-3">
                {(health?.weaknesses || []).length === 0 && <li className="text-sm text-slate-400">No major weaknesses detected.</li>}
                {(health?.weaknesses || []).map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* AI interpretation */}
          <Card className="p-6 border-l-4 border-l-blue-600">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold text-slate-900">AI Interpretation</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{health?.interpretation}</p>
            <Link to="/ai-cfo" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition">
              Discuss with AI CFO <TrendingUp className="w-4 h-4" />
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}
