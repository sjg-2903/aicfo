import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, CalendarClock, CheckCircle2 } from 'lucide-react';
import { Card, PageHeader, Pill, ProgressBar, ErrorState } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { DataTable, type Column } from '@/components/DataTable';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import type { LoanRow } from '@/lib/mappers';
import loanService from '@/services/loanService';

export default function Loans() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const { data: loans, isLoading, error, refetch } = useQuery({
    queryKey: ['loans'],
    queryFn: () => loanService.getLoans(),
  });

  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'outstanding', direction: 'desc' });

  const markEmiMutation = useMutation({
    mutationFn: (id: string) => loanService.markEMIPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      addToast('EMI marked as paid', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const all = loans || [];

  const totalOutstanding = all.reduce((s, l) => s + l.outstanding, 0);
  const totalEmi = all.reduce((s, l) => s + l.emi, 0);
  const activeCount = all.filter((l) => l.status === 'active').length;

  const sorted = [...all].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sorting.key];
    const bv = (b as unknown as Record<string, unknown>)[sorting.key];
    return sorting.direction === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
  });

  const columns: Column<LoanRow>[] = [
    { key: 'lender', header: 'Lender', render: (l) => <span className="font-medium text-slate-800">{l.lender}</span> },
    { key: 'type', header: 'Loan Type' },
    { key: 'principal', header: 'Principal', align: 'right', render: (l) => CURRENCY(l.principal) },
    { key: 'outstanding', header: 'Outstanding', align: 'right', sortable: true, render: (l) => <span className="font-semibold text-slate-800">{CURRENCY(l.outstanding)}</span> },
    { key: 'rate', header: 'Rate', align: 'right', render: (l) => `${l.rate}%` },
    { key: 'emi', header: 'EMI', align: 'right', render: (l) => CURRENCY(l.emi) },
    { key: 'nextEmi', header: 'Next EMI' },
    { key: 'status', header: 'Status', render: (l) => <Pill value={l.status} /> },
    {
      key: 'actions',
      header: '',
      render: (l) =>
        l.status === 'active' ? (
          <button onClick={() => markEmiMutation.mutate(l.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition" title="Mark EMI paid">
            <CheckCircle2 className="w-4 h-4" />
          </button>
        ) : null,
    },
  ];

  const handleSort = (key: string) =>
    setSorting((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }));

  return (
    <div className="space-y-6">
      <PageHeader title="Loans" subtitle="Track loans, EMIs and repayment progress" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 hover">
          <Banknote className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-xs text-slate-500 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-slate-900">{CURRENCY(totalOutstanding)}</p>
        </Card>
        <Card className="p-5 hover">
          <CalendarClock className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-xs text-slate-500 mb-1">Monthly EMI Burden</p>
          <p className="text-2xl font-bold text-slate-900">{CURRENCY(totalEmi)}</p>
        </Card>
        <Card className="p-5 hover">
          <p className="text-xs text-slate-500 mb-1">Active Loans</p>
          <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
        </Card>
      </div>

      {/* Repayment progress */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-5">Repayment Progress</h3>
        <div className="space-y-5">
          {all.length === 0 && !isLoading && <p className="text-sm text-slate-400">No loans recorded yet.</p>}
          {all.map((loan) => {
            const progress = loan.principal > 0 ? Math.max(0, Math.round(((loan.principal - loan.outstanding) / loan.principal) * 100)) : 0;
            return (
              <div key={loan.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    {loan.lender} — {loan.type}
                  </span>
                  <span className="text-sm text-slate-500">{progress}% repaid</span>
                </div>
                <ProgressBar value={progress} />
                <p className="text-xs text-slate-400 mt-1">
                  {CURRENCY(loan.principal - loan.outstanding)} of {CURRENCY(loan.principal)} repaid · Next EMI {CURRENCY(loan.emi)} on {loan.nextEmi || '—'}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        {error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : (
          <DataTable columns={columns} data={sorted} keyExtractor={(l) => l.id} sorting={sorting} onSort={handleSort} loading={isLoading} emptyTitle="No loans found" />
        )}
      </Card>
    </div>
  );
}
