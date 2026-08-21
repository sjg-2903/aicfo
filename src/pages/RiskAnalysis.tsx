import { useState } from 'react';
import { ShieldAlert, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { Card, PageHeader, Pill, ScoreRing, ErrorState } from '@/components/ui';
import { mockRisks } from '@/mock';
import { CURRENCY } from '@/lib/format';

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
  const [filter, setFilter] = useState<'all' | string>('all');
  const [showError, setShowError] = useState(false);

  const filtered = mockRisks.filter((r) => filter === 'all' || r.severity === filter);

  const counts = {
    critical: mockRisks.filter((r) => r.severity === 'critical').length,
    high: mockRisks.filter((r) => r.severity === 'high').length,
    medium: mockRisks.filter((r) => r.severity === 'medium').length,
    low: mockRisks.filter((r) => r.severity === 'low').length,
  };

  if (showError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Risk Analysis" subtitle="Identify and monitor financial risks" />
        <Card>
          <ErrorState message="Unable to load risk analysis." onRetry={() => setShowError(false)} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Risk Analysis" subtitle="Identify, prioritize and resolve financial risks" />

      {/* Overall score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center" hover>
          <h3 className="text-base font-semibold text-slate-900 mb-4 self-start">Overall Risk Score</h3>
          <ScoreRing score={62} size={160} stroke={12} label="Medium Risk" color="#f59e0b" />
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
                    <span className="text-slate-400">Category: <span className="font-medium text-slate-600 capitalize">{risk.category.replace(/_/g, ' ')}</span></span>
                    {risk.impact > 0 && <span className="text-slate-400">Impact: <span className="font-medium text-red-600">{CURRENCY(risk.impact)}</span></span>}
                    <span className="text-slate-400">Detected: <span className="font-medium text-slate-600">{risk.date}</span></span>
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Recommended Action</p>
                    <p className="text-sm text-blue-800">{risk.action}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
