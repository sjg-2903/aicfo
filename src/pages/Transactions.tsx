import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, Trash2, Upload } from 'lucide-react';
import { Card, PageHeader, Pill, ErrorState } from '@/components/ui';
import { Modal } from '@/components/Modal';
import UploadWizard from '@/components/UploadWizard';
import { useToast } from '@/components/Toast';
import { DataTable, Pagination, type Column } from '@/components/DataTable';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import type { TxnRow } from '@/lib/mappers';
import transactionService, { type TransactionCreateRequest } from '@/services/transactionService';

const PAGE_SIZE = 8;

export default function Transactions() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const { data: txns, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.getTransactions(),
  });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const all = txns || [];

  const createMutation = useMutation({
    mutationFn: (payload: TransactionCreateRequest) => transactionService.createTransaction(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setShowAdd(false);
      addToast('Transaction added', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionService.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      addToast('Transaction deleted', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const filtered = useMemo(() => {
    let result = [...all];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.paymentMethod.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter);
    result.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sorting.key];
      const bv = (b as unknown as Record<string, unknown>)[sorting.key];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sorting.direction === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [all, search, typeFilter, sorting]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const inflow = all.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const outflow = Math.abs(all.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0));

  const columns: Column<TxnRow>[] = [
    { key: 'date', header: 'Date', sortable: true },
    { key: 'description', header: 'Description', render: (t) => <span className="font-medium text-slate-800">{t.description}</span> },
    { key: 'category', header: 'Category' },
    { key: 'paymentMethod', header: 'Method', render: (t) => <span className="text-slate-500">{t.paymentMethod}</span> },
    { key: 'type', header: 'Type', render: (t) => <Pill value={t.type === 'income' ? 'good' : 'medium'} label={t.type} /> },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (t) => (
        <span className={`font-semibold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {t.amount > 0 ? '+' : ''}
          {CURRENCY(t.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (t) => (
        <button
          onClick={() => deleteMutation.mutate(t.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
          aria-label="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const handleSort = (key: string) =>
    setSorting((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }));

  const exportCsv = () => {
    const header = 'date,description,amount,type,category,payment_method\n';
    const rows = filtered
      .map((t) => [t.date, `"${t.description.replace(/"/g, '""')}"`, t.type === 'expense' ? -t.amount : t.amount, t.type, t.category, t.paymentMethod].join(','))
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Track all money coming in and going out"
        actions={
          <>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <StatsCard label="Total Inflow" value={inflow} tone="green" />
        <StatsCard label="Total Outflow" value={outflow} tone="red" />
        <StatsCard label="Net" value={inflow - outflow} tone="blue" />
      </div>

      <Card>
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search transactions…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setPage(1);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={paginated}
            keyExtractor={(t) => t.id}
            sorting={sorting}
            onSort={handleSort}
            loading={isLoading}
            emptyTitle="No transactions found"
            emptyDescription="Try adjusting your search or filters, or add your first transaction."
          />
        )}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Card>

      <AddTransactionModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={(p) => createMutation.mutate(p)} submitting={createMutation.isPending} />

      <UploadWizard
        entity="transactions"
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ['transactions'] });
          qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
          qc.invalidateQueries({ queryKey: ['history'] });
          qc.invalidateQueries({ queryKey: ['dashboard-recommendations'] });
        }}
      />
    </div>
  );
}

function AddTransactionModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: TransactionCreateRequest) => void;
  submitting: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, description: '', amount: '', type: 'income' as 'income' | 'expense', category: 'Sales', payment_method: 'Bank Transfer' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;
    onSubmit({ date: form.date, description: form.description, amount, type: form.type, category: form.category, payment_method: form.payment_method });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Transaction" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1">Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="e.g. Invoice payment — Delta Traders" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="25000" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1">Payment Method</label>
          <input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition">
            {submitting ? 'Saving…' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatsCard({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'blue' }) {
  const color = tone === 'green' ? 'text-green-600' : tone === 'red' ? 'text-red-600' : 'text-blue-600';
  return (
    <Card className="p-4 hover">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{CURRENCY(value)}</p>
    </Card>
  );
}
