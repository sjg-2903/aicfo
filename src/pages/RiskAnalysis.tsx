import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, AlertOctagon, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Card, PageHeader, Pill, ScoreRing, ErrorState } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import riskService from '@/services/riskService';

const SEVERITY_ICON: Record<string, React.ElementType> = {
  critical: AlertOctagon,
  high: ShieldAlert,
  medium: AlertTriangle,
  low: Info,
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-orange-600 bg-orange-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-blue-600 bg-blue-50',
};

export default function RiskAnalysis() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const { data: assessment, isLoading, error, refetch } = useQuery({
    queryKey: ['risk'],
    queryFn: () => riskService.getAssessment(),
  });

  const [filter, setFilter] = useState<'all' | string>('all');

  const resolveMutation = useMutation({
    mutationFn: (id: string) => riskService.resolveRisk(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risk'] });
      addToast('Risk marked as resolved', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const risks = assessment?.risks || [];
  const filtered = risks.filter((r) => filter === 'all' || r.severity === filter);

  const counts = {
    critical: risks.filter((r) => r.severity === 'critical').length,
    high: risks.filter((r) => r.severity === 'high').length,
    medium: risks.filter((r) => r.severity === 'medium').length,
    low: risks.filter((r) => r.severity === 'low').length,
  };

  const score = assessment?.score ?? 0;
  const ringColor = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const levelLabel = (assessment?.level || 'unknown').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <PageHeader title="Risk Analysis" subtitle="Identify, prioritize and resolve financial risks" />

      {error ? (
        <Card>
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          {/* Overall score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-6 flex flex-col items-center" hover>
              <h3 className="text-base font-semibold text-slate-900 mb-4 self-start">Overall Risk Score</h3>
              {isLoading ? (
                <div className="h-[160px] flex items-center justify-center text-slate-400">Loading…</div>
              ) : (
                <ScoreRing score={score} size={160} stroke={12} label={`${levelLabel} Risk`} color={ringColor} />
              )}
            </Card>

            <Card className="p-6 lg:col-span-2" hover>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Risk by Severity</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(counts).map(([sev, count]) => (
                  <div key={sev} className={`p-4 rounded-lg flex items-center justify-between ${SEVERITY_COLOR[sev] || 'bg-slate-50'}`}>
                    <span className="text-sm font-semibold capitalize">{sev}</span>
                    <span className="text-xl font-bold">{count}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4">Tip: Critical risks require immediate action</p>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${filter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {filtered.length === 0 && !isLoading && (
            <Card className="p-12 text-center">
              <ShieldAlert className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="text-slate-500">No risks match your filters — you're in good shape.</p>
            </Card>
          )}

          {/* Risk cards */}
          <div className="space-y-4">
            {filtered.map((risk, idx) => {
              const Icon = SEVERITY_ICON[risk.severity] || Info;
              return (
                <Card key={risk.id} className="p-5" hover delay={idx * 40}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${SEVERITY_COLOR[risk.severity]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-slate-900">{risk.title}</h3>
                        <Pill value={risk.severity} />
                        <Pill value={risk.status} />
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{risk.evidence}</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                        <span className="text-slate-400">
                          Category: <span className="font-medium text-slate-600 capitalize">{risk.category.replace(/_/g, ' ')}</span>
                        </span>
                        {risk.impact > 0 && (
                          <span className="text-slate-400">
                            Impact: <span className="font-medium text-red-600">{CURRENCY(risk.impact)}</span>
                          </span>
                        )}
                        {risk.date && (
                          <span className="text-slate-400">
                            Detected: <span className="font-medium text-slate-600">{risk.date}</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-blue-700 mb-1">Recommended Action</p>
                          <p className="text-sm text-blue-800">{risk.action}</p>
                        </div>
                        {risk.status !== 'resolved' && (
                          <button
                            onClick={() => resolveMutation.mutate(risk.id)}
                            className="shrink-0 p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition"
                            title="Resolve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
