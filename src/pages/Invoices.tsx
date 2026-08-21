import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle2, Trash2 } from 'lucide-react';
import { Card, PageHeader, Pill, ErrorState } from '@/components/ui';
import { Modal } from '@/components/Modal';
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
    { key: 'number', header: 'Invoice #', render: (i) => <span className="font-medium text-slate-800">{i.number}</span> },
    { key: 'customer', header: 'Customer', render: (i) => <span className="font-medium text-slate-700">{i.customer}</span> },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    { key: 'total', header: 'Total', align: 'right', sortable: true, render: (i) => <span className="font-semibold text-slate-800">{CURRENCY(i.total)}</span> },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      render: (i) => {
        const out = i.total - i.paid;
        return <span className={out > 0 ? 'font-semibold text-amber-600' : 'text-slate-400'}>{CURRENCY(Math.max(0, out))}</span>;
      },
    },
    { key: 'status', header: 'Status', render: (i) => <Pill value={i.status} /> },
    {
      key: 'actions',
      header: '',
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          {i.status !== 'paid' && (
            <button
              onClick={() => markPaidMutation.mutate({ id: i.id, total: i.total })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition"
              title="Mark as paid"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => deleteMutation.mutate(i.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total Outstanding" value={outstandingTotal} tone="text-blue-600" />
        <Stat label="Overdue Amount" value={overdueTotal} tone="text-red-600" />
        <Stat label="Paid (all time)" value={paidTotal} tone="text-green-600" />
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by customer or invoice #…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
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
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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

      <AddInvoiceModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={(p) => createMutation.mutate(p)} submitting={createMutation.isPending} />
    </div>
  );
}

function AddInvoiceModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: InvoiceCreateRequest) => void;
  submitting: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ invoice_number: '', customer_name: '', invoice_date: today, due_date: due, total_amount: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(form.total_amount);
    if (!total || total <= 0) return;
    onSubmit({ invoice_number: form.invoice_number, customer_name: form.customer_name, invoice_date: form.invoice_date, due_date: form.due_date, total_amount: total });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="New Invoice" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1">Invoice Number</label>
          <input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="INV-2026-001" required />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1">Customer</label>
          <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="Delta Traders" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Invoice Date</label>
            <input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Due Date</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1">Total Amount (₹)</label>
          <input type="number" min="0" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="200000" required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition">
            {submitting ? 'Saving…' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-4 hover">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{CURRENCY(value)}</p>
    </Card>
  );
}
