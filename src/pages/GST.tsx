import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCheck, AlertTriangle, CalendarClock, Upload } from 'lucide-react';
import { Card, PageHeader, Pill, ErrorState } from '@/components/ui';
import { useToast } from '@/components/Toast';
import UploadWizard from '@/components/UploadWizard';
import { DataTable, type Column } from '@/components/DataTable';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import type { GstRow } from '@/lib/mappers';
import gstService from '@/services/gstService';

export default function GST() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const { data: records, isLoading, error, refetch } = useQuery({
    queryKey: ['gst'],
    queryFn: () => gstService.getGSTRecords(),
  });

  const [filter, setFilter] = useState<'all' | string>('all');
  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'desc' });
  const [showUpload, setShowUpload] = useState(false);

  const markFiledMutation = useMutation({
    mutationFn: (id: string) => gstService.markAsFiled(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gst'] });
      addToast('GST marked as filed', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const all = records || [];

  const filtered = all
    .filter((g) => filter === 'all' || g.status === filter)
    .sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sorting.key];
      const bv = (b as unknown as Record<string, unknown>)[sorting.key];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sorting.direction === 'asc' ? cmp : -cmp;
    });

  const today = new Date().toISOString().slice(0, 10);
  const pending = all.filter((g) => g.status === 'pending' && g.dueDate >= today);
  const overdue = all.filter((g) => g.status === 'overdue');
  const filed = all.filter((g) => g.status === 'filed' || g.status === 'paid');

  const columns: Column<GstRow>[] = [
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
    {
      key: 'actions',
      header: '',
      render: (g) =>
        g.status === 'pending' || g.status === 'overdue' ? (
          <button onClick={() => markFiledMutation.mutate(g.id)} className="text-xs font-medium text-blue-600 hover:text-blue-700 transition">
            Mark filed
          </button>
        ) : null,
    },
  ];

  const handleSort = (key: string) =>
    setSorting((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST & Tax"
        subtitle="Track tax obligations, filings and due dates"
        actions={
          <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition">
            <Upload className="w-4 h-4" /> Upload
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard icon={<CalendarClock className="w-5 h-5 text-blue-600" />} label="Upcoming Filings" value={pending.length} sub="Due in next 30 days" />
        <StatusCard icon={<AlertTriangle className="w-5 h-5 text-red-500" />} label="Overdue" value={overdue.length} sub="Requires immediate action" tone="text-red-600" />
        <StatusCard icon={<FileCheck className="w-5 h-5 text-green-600" />} label="Filed / Paid" value={filed.length} sub="Completed on time" tone="text-green-600" />
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
          {['all', 'pending', 'filed', 'paid', 'overdue'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${filter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s}
            </button>
          ))}
        </div>
        {error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : (
          <DataTable columns={columns} data={filtered} keyExtractor={(g) => g.id} sorting={sorting} onSort={handleSort} loading={isLoading} emptyTitle="No GST records" />
        )}
      </Card>

      <UploadWizard
        entity="gst"
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ['gst'] });
          qc.invalidateQueries({ queryKey: ['history'] });
          qc.invalidateQueries({ queryKey: ['dashboard-recommendations'] });
        }}
      />
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
