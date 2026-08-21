import { useState } from 'react';
import { Banknote, CalendarClock } from 'lucide-react';
import { Card, PageHeader, Pill, ProgressBar } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { mockLoans } from '@/mock';
import { CURRENCY } from '@/lib/format';

interface Loan {
  id: string;
  lender: string;
  type: string;
  principal: number;
  outstanding: number;
  rate: number;
  emi: number;
  nextEmi: string;
  status: string;
}

export default function Loans() {
  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'outstanding', direction: 'desc' });

  const totalOutstanding = mockLoans.reduce((s, l) => s + l.outstanding, 0);
  const totalEmi = mockLoans.reduce((s, l) => s + l.emi, 0);

  const sorted = [...(mockLoans as Loan[])].sort((a: any, b: any) => (sorting.direction === 'asc' ? a[sorting.key] - b[sorting.key] : b[sorting.key] - a[sorting.key]));

  const columns: Column<Loan>[] = [
    { key: 'lender', header: 'Lender', render: (l) => <span className="font-medium text-slate-800">{l.lender}</span> },
    { key: 'type', header: 'Loan Type' },
    { key: 'principal', header: 'Principal', align: 'right', render: (l) => CURRENCY(l.principal) },
    { key: 'outstanding', header: 'Outstanding', align: 'right', sortable: true, render: (l) => <span className="font-semibold text-slate-800">{CURRENCY(l.outstanding)}</span> },
    { key: 'rate', header: 'Rate', align: 'right', render: (l) => `${l.rate}%` },
    { key: 'emi', header: 'EMI', align: 'right', render: (l) => CURRENCY(l.emi) },
    { key: 'nextEmi', header: 'Next EMI' },
    { key: 'status', header: 'Status', render: (l) => <Pill value={l.status} /> },
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
          <p className="text-2xl font-bold text-slate-900">{mockLoans.length}</p>
        </Card>
      </div>

      {/* Repayment progress */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-5">Repayment Progress</h3>
        <div className="space-y-5">
          {mockLoans.map((loan) => {
            const progress = Math.round(((loan.principal - loan.outstanding) / loan.principal) * 100);
            return (
              <div key={loan.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">{loan.lender} — {loan.type}</span>
                  <span className="text-sm text-slate-500">{progress}% repaid</span>
                </div>
                <ProgressBar value={progress} />
                <p className="text-xs text-slate-400 mt-1">
                  {CURRENCY(loan.principal - loan.outstanding)} of {CURRENCY(loan.principal)} repaid · Next EMI {CURRENCY(loan.emi)} on {loan.nextEmi}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={sorted} keyExtractor={(l) => l.id} sorting={sorting} onSort={handleSort} emptyTitle="No loans found" />
      </Card>
    </div>
  );
}
