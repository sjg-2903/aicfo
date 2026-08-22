import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCheck, AlertTriangle, CalendarClock, Plus, Upload } from 'lucide-react';
import { Card, PageHeader, Pill, ErrorState } from '@/components/ui';
import SegmentStepsGuide from '@/components/SegmentStepsGuide';
import { useToast } from '@/components/Toast';
import UploadWizard from '@/components/UploadWizard';
import { DataTable, type Column } from '@/components/DataTable';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import type { GstRow } from '@/lib/mappers';
import gstService, { type GstCreateRequest } from '@/services/gstService';
import { EntityFormModal, type FieldDef, type FormValues } from '@/components/EntityFormModal';
import { RowActions } from '@/components/RowActions';

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
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<GstRow | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['gst'] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: GstCreateRequest) => gstService.createGSTRecord(payload),
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      addToast('GST record added', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<GstCreateRequest> }) => gstService.updateGSTRecord(id, payload),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      addToast('GST record updated', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gstService.deleteGSTRecord(id),
    onSuccess: () => {
      invalidate();
      addToast('GST record deleted', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

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
    { key: 'period', header: 'Tax Period', render: (g) => <span className="font-medium text-slate-800 dark:text-slate-100">{g.period}</span> },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    { key: 'taxable', header: 'Taxable Amount', align: 'right', render: (g) => CURRENCY(g.taxable) },
    { key: 'taxAmount', header: 'GST Amount', align: 'right', sortable: true, render: (g) => <span className="font-semibold text-slate-900 dark:text-white">{CURRENCY(g.taxAmount)}</span> },
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      render: (g) => <span className={g.paid >= g.taxAmount ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>{CURRENCY(g.paid)}</span>,
    },
    { key: 'status', header: 'Status', render: (g) => <Pill value={g.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (g) => (
        <RowActions
          onEdit={() => setEditing(g)}
          onDelete={() => deleteMutation.mutate(g.id)}
          confirmMessage={`Delete the GST record for ${g.period}? This cannot be undone.`}
        >
          {(g.status === 'pending' || g.status === 'overdue') && (
            <button
              type="button"
              onClick={() => markFiledMutation.mutate(g.id)}
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 transition cursor-pointer"
              title="Mark filed"
              aria-label="Mark filed"
            >
              <FileCheck className="w-4 h-4" />
            </button>
          )}
        </RowActions>
      ),
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
          <>
            <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition cursor-pointer">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm cursor-pointer">
              <Plus className="w-4 h-4" /> Add GST Record
            </button>
          </>
        }
      />

      {/* Segment Steps Guide */}
      <SegmentStepsGuide segment="gst" defaultExpanded={false} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard icon={<CalendarClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />} label="Upcoming Filings" value={pending.length} sub="Due in next 30 days" />
        <StatusCard icon={<AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />} label="Overdue" value={overdue.length} sub="Requires immediate action" tone="text-red-600 dark:text-red-400" />
        <StatusCard icon={<FileCheck className="w-5 h-5 text-green-600 dark:text-green-400" />} label="Filed / Paid" value={filed.length} sub="Completed on time" tone="text-green-600 dark:text-green-400" />
      </div>

      {overdue.length > 0 && (
        <Card className="p-4 border-l-4 border-l-red-500 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-slate-700 dark:text-slate-200">
            You have <span className="font-semibold">{overdue.length} overdue GST obligation{overdue.length > 1 ? 's' : ''}</span> totaling{' '}
            <span className="font-semibold text-red-600 dark:text-red-400">{CURRENCY(overdue.reduce((s, g) => s + g.taxAmount, 0))}</span>. Filing late accrues penalties.
          </p>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-2 flex-wrap">
          {['all', 'pending', 'filed', 'paid', 'overdue'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition cursor-pointer ${
                filter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
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

      <EntityFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add GST Record"
        submitLabel="Save Record"
        fields={GST_FIELDS}
        initial={{
          period: '',
          period_start: new Date().toISOString().slice(0, 8) + '01',
          period_end: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
          taxable_turnover: '',
          tax_amount: '',
          paid_amount: 0,
          status: 'pending',
        }}
        submitting={createMutation.isPending}
        onSubmit={(v) => createMutation.mutate(toGstPayload(v))}
      />

      <EntityFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit GST Record"
        submitLabel="Update Record"
        fields={GST_FIELDS}
        initial={
          editing
            ? {
                period: editing.period,
                period_start: editing.periodStart,
                period_end: editing.periodEnd,
                due_date: editing.dueDate,
                taxable_turnover: editing.taxable,
                tax_amount: editing.taxAmount,
                paid_amount: editing.paid,
                status: editing.status,
              }
            : {}
        }
        submitting={updateMutation.isPending}
        onSubmit={(v) => editing && updateMutation.mutate({ id: editing.id, payload: toGstPayload(v) })}
      />

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

function StatusCard({ icon, label, value, sub, tone = 'text-slate-900 dark:text-white' }: { icon: React.ReactNode; label: string; value: number; sub: string; tone?: string }) {
  return (
    <Card className="p-5 flex items-center gap-4 hover">
      <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`text-2xl font-bold ${tone}`}>{value}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>
      </div>
    </Card>
  );
}

const GST_FIELDS: FieldDef[] = [
  { name: 'period', label: 'Tax Period', type: 'text', required: true, placeholder: 'Aug 2026 (GSTR-3B)' },
  { name: 'due_date', label: 'Due Date', type: 'date', required: true },
  { name: 'period_start', label: 'Period Start', type: 'date', required: true },
  { name: 'period_end', label: 'Period End', type: 'date', required: true },
  { name: 'taxable_turnover', label: 'Taxable Turnover (₹)', type: 'number', required: true, min: 0, step: '0.01', placeholder: '500000' },
  { name: 'tax_amount', label: 'GST Amount (₹)', type: 'number', required: true, min: 0, step: '0.01', placeholder: '90000' },
  { name: 'paid_amount', label: 'Paid Amount (₹)', type: 'number', min: 0, step: '0.01', placeholder: '0' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'filed', label: 'Filed' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
    ],
  },
];

function toGstPayload(v: FormValues): GstCreateRequest {
  const status = String(v.status || 'pending');
  return {
    period: String(v.period),
    period_start: String(v.period_start),
    period_end: String(v.period_end),
    due_date: String(v.due_date),
    taxable_turnover: Number(v.taxable_turnover || 0),
    tax_amount: Number(v.tax_amount || 0),
    paid_amount: Number(v.paid_amount || 0),
    status: (['pending', 'filed', 'paid', 'overdue'].includes(status) ? status : 'pending') as GstCreateRequest['status'],
  };
}
