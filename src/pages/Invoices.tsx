import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle2, Upload } from 'lucide-react';
import { Card, PageHeader, Pill, ErrorState } from '@/components/ui';
import { EntityFormModal, type FieldDef, type FormValues } from '@/components/EntityFormModal';
import { RowActions } from '@/components/RowActions';
import UploadWizard from '@/components/UploadWizard';
import { useToast } from '@/components/Toast';
import { DataTable, Pagination, type Column } from '@/components/DataTable';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import type { InvoiceRow } from '@/lib/mappers';
import invoiceService, { type InvoiceCreateRequest } from '@/services/invoiceService';

const PAGE_SIZE = 8;

export default function Invoices() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const { data: invoices, isLoading, error, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceService.getInvoices(),
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<InvoiceRow | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const all = invoices || [];

  const createMutation = useMutation({
    mutationFn: (payload: InvoiceCreateRequest) => invoiceService.createInvoice(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setShowAdd(false);
      addToast('Invoice created', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<InvoiceCreateRequest> }) => invoiceService.updateInvoice(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setEditing(null);
      addToast('Invoice updated', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, total }: { id: string; total: number }) => invoiceService.markAsPaid(id, total),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      addToast('Invoice marked as paid', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoiceService.deleteInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      addToast('Invoice deleted', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const filtered = useMemo(() => {
    let result = [...all];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.customer.toLowerCase().includes(q) || i.number.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') result = result.filter((i) => i.status === statusFilter);
    result.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sorting.key];
      const bv = (b as unknown as Record<string, unknown>)[sorting.key];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sorting.direction === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [all, search, statusFilter, sorting]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const outstandingTotal = all.reduce((s, i) => s + Math.max(0, i.total - i.paid), 0);
  const overdueTotal = all.filter((i) => i.status === 'overdue').reduce((s, i) => s + Math.max(0, i.total - i.paid), 0);
  const paidTotal = all.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  const columns: Column<InvoiceRow>[] = [
    { key: 'number', header: 'Invoice #', render: (i) => <span className="font-medium text-slate-800 dark:text-slate-100">{i.number}</span> },
    { key: 'customer', header: 'Customer', render: (i) => <span className="font-medium text-slate-700 dark:text-slate-200">{i.customer}</span> },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    { key: 'total', header: 'Total', align: 'right', sortable: true, render: (i) => <span className="font-semibold text-slate-800 dark:text-slate-100">{CURRENCY(i.total)}</span> },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      render: (i) => {
        const out = i.total - i.paid;
        return <span className={out > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}>{CURRENCY(Math.max(0, out))}</span>;
      },
    },
    { key: 'status', header: 'Status', render: (i) => <Pill value={i.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (i) => (
        <RowActions
          onEdit={() => setEditing(i)}
          onDelete={() => deleteMutation.mutate(i.id)}
          confirmMessage={`Delete invoice ${i.number}? This cannot be undone.`}
        >
          {i.status !== 'paid' && (
            <button
              type="button"
              onClick={() => markPaidMutation.mutate({ id: i.id, total: i.total })}
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 transition cursor-pointer"
              title="Mark as paid"
              aria-label="Mark as paid"
            >
              <CheckCircle2 className="w-4 h-4" />
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
        title="Invoices & Receivables"
        subtitle="Manage invoices and track payments"
        actions={
          <>
            <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition cursor-pointer">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm cursor-pointer">
              <Plus className="w-4 h-4" /> New Invoice
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total Outstanding" value={outstandingTotal} tone="text-blue-600 dark:text-blue-400" />
        <Stat label="Overdue Amount" value={overdueTotal} tone="text-red-600 dark:text-red-400" />
        <Stat label="Paid (all time)" value={paidTotal} tone="text-green-600 dark:text-green-400" />
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by customer or invoice #…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'sent', 'paid', 'overdue', 'draft'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition cursor-pointer ${
                  statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : (
          <DataTable columns={columns} data={paginated} keyExtractor={(i) => i.id} sorting={sorting} onSort={handleSort} loading={isLoading} emptyTitle="No invoices found" />
        )}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Card>

      <EntityFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New Invoice"
        submitLabel="Create Invoice"
        fields={INVOICE_FIELDS}
        initial={{
          invoice_number: '',
          customer_name: '',
          invoice_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          total_amount: '',
          paid_amount: 0,
          status: 'sent',
        }}
        submitting={createMutation.isPending}
        onSubmit={(v) => createMutation.mutate(toInvoicePayload(v))}
      />

      <EntityFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Invoice"
        submitLabel="Update Invoice"
        fields={INVOICE_FIELDS}
        initial={
          editing
            ? {
                invoice_number: editing.number,
                customer_name: editing.customer,
                invoice_date: editing.date,
                due_date: editing.dueDate,
                total_amount: editing.total,
                paid_amount: editing.paid,
                status: editing.status,
              }
            : {}
        }
        submitting={updateMutation.isPending}
        onSubmit={(v) => editing && updateMutation.mutate({ id: editing.id, payload: toInvoicePayload(v) })}
      />

      <UploadWizard
        entity="invoices"
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ['invoices'] });
          qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
          qc.invalidateQueries({ queryKey: ['history'] });
          qc.invalidateQueries({ queryKey: ['dashboard-recommendations'] });
        }}
      />
    </div>
  );
}

const INVOICE_FIELDS: FieldDef[] = [
  { name: 'invoice_number', label: 'Invoice Number', type: 'text', required: true, placeholder: 'INV-2026-001' },
  { name: 'customer_name', label: 'Customer', type: 'text', required: true, placeholder: 'Delta Traders' },
  { name: 'invoice_date', label: 'Invoice Date', type: 'date', required: true },
  { name: 'due_date', label: 'Due Date', type: 'date', required: true },
  { name: 'total_amount', label: 'Total Amount (₹)', type: 'number', required: true, min: 0, step: '0.01', placeholder: '200000' },
  { name: 'paid_amount', label: 'Paid Amount (₹)', type: 'number', min: 0, step: '0.01', placeholder: '0' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    full: true,
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
];

function toInvoicePayload(v: FormValues): InvoiceCreateRequest {
  return {
    invoice_number: String(v.invoice_number),
    customer_name: String(v.customer_name),
    invoice_date: String(v.invoice_date),
    due_date: String(v.due_date),
    total_amount: Number(v.total_amount),
    paid_amount: Number(v.paid_amount || 0),
    status: String(v.status || 'sent'),
  };
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-4 hover">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{CURRENCY(value)}</p>
    </Card>
  );
}
