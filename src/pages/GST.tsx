import { useState } from 'react';
import { FileCheck, AlertTriangle, CalendarClock } from 'lucide-react';
import { Card, PageHeader, Pill } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { mockGstRecords } from '@/mock';
import { CURRENCY } from '@/lib/format';

interface GstRecord {
  id: string;
  period: string;
  dueDate: string;
  taxable: number;
  taxAmount: number;
  paid: number;
  status: string;
}

export default function GST() {
  const [filter, setFilter] = useState<'all' | string>('all');
  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'desc' });

  const filtered = (mockGstRecords as GstRecord[])
    .filter((g) => filter === 'all' || g.status === filter)
    .sort((a: any, b: any) => (sorting.direction === 'asc' ? String(a[sorting.key]).localeCompare(String(b[sorting.key])) : String(b[sorting.key]).localeCompare(String(a[sorting.key]))));

  const upcoming = mockGstRecords.filter((g) => g.status === 'upcoming');
  const overdue = mockGstRecords.filter((g) => g.status === 'overdue');
  const completed = mockGstRecords.filter((g) => g.status === 'completed');

  const columns: Column<GstRecord>[] = [
    { key: 'period', header: 'Tax Period', render: (g) => <span className="font-medium text-slate-800">{g.period}</span> },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    { key: 'taxable', header: 'Taxable Amount', align: 'right', render: (g) => CURRENCY(g.taxable) },
    { key: 'taxAmount', header: 'GST Amount', align: 'right', sortable: true, render: (g) => <span className="font-semibold">{CURRENCY(g.taxAmount)}</span> },
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      render: (g) => <span className={g.paid >= g.taxAmount ? 'text-green-600' : 'text-amber-600'}>{CURRENCY(g.paid)}</span>,
    },
    { key: 'status', header: 'Status', render: (g) => <Pill value={g.status} /> },
  ];

  const handleSort = (key: string) =>
    setSorting((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }));

  return (
    <div className="space-y-6">
      <PageHeader title="GST & Tax" subtitle="Track tax obligations, filings and due dates" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard icon={<CalendarClock className="w-5 h-5 text-blue-600" />} label="Upcoming Filings" value={upcoming.length} sub="Due in next 30 days" />
        <StatusCard icon={<AlertTriangle className="w-5 h-5 text-red-500" />} label="Overdue" value={overdue.length} sub="Requires immediate action" tone="text-red-600" />
        <StatusCard icon={<FileCheck className="w-5 h-5 text-green-600" />} label="Filed" value={completed.length} sub="Completed on time" tone="text-green-600" />
      </div>

      {overdue.length > 0 && (
        <Card className="p-4 border-l-4 border-l-red-500 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-slate-700">
            You have <span className="font-semibold">{overdue.length} overdue GST obligation{overdue.length > 1 ? 's' : ''}</span> totaling{' '}
            <span className="font-semibold text-red-600">{CURRENCY(overdue.reduce((s, g) => s + g.taxAmount, 0))}</span>. Filing late accrues penalties.
          </p>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-slate-100 flex gap-2">
          {['all', 'upcoming', 'completed', 'overdue'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${filter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <DataTable columns={columns} data={filtered} keyExtractor={(g) => g.id} sorting={sorting} onSort={handleSort} emptyTitle="No GST records" />
      </Card>
    </div>
  );
}

function StatusCard({ icon, label, value, sub, tone = 'text-slate-900' }: { icon: React.ReactNode; label: string; value: number; sub: string; tone?: string }) {
  return (
    <Card className="p-5 flex items-center gap-4 hover">
      <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-2xl font-bold ${tone}`}>{value}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </Card>
  );
}
