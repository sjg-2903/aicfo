import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageHeader, Pill, ProgressBar, ScoreRing } from '@/components/ui';
import { mockLoanReadiness } from '@/mock';

export default function LoanReadiness() {
  const lr = mockLoanReadiness;
  const color = lr.score >= 75 ? '#10b981' : lr.score >= 55 ? '#f59e0b' : '#ef4444';

  const factorColor = (s: number) => (s >= 75 ? '#10b981' : s >= 55 ? '#f59e0b' : '#ef4444');

  return (
    <div className="space-y-6">
      <PageHeader title="Loan Readiness" subtitle="Assess your eligibility for business financing" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center" hover>
          <h3 className="text-base font-semibold text-slate-900 mb-4 self-start">Readiness Score</h3>
          <ScoreRing score={lr.score} size={170} stroke={13} label={lr.label} color={color} />
          <p className="text-xs text-slate-400 mt-3">Last updated just now</p>
        </Card>

        <Card className="p-6 lg:col-span-2" hover>
          <h3 className="text-base font-semibold text-slate-900 mb-4">Contributing Factors</h3>
          <div className="space-y-4">
            {lr.factors.map((f) => (
              <div key={f.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{f.name}</span>
                    <Pill value={f.status} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{f.score}/100</span>
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
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Overall Assessment</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{lr.recommendation}</p>
          </div>
        </div>
      </Card>

      {/* Improvement suggestions */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Improvement Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lr.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">{s}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Link to="/ai-cfo" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
          Ask AI CFO about loans <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
