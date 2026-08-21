import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Upload } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, PageHeader, ChartCard, ErrorState } from '@/components/ui';
import { Modal } from '@/components/Modal';
import UploadWizard from '@/components/UploadWizard';
import { useToast } from '@/components/Toast';
import { DataTable, Pagination, type Column } from '@/components/DataTable';
import { CURRENCY, moneyTooltip } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import type { ExpenseRow } from '@/lib/mappers';
import expenseService, { type ExpenseCreateRequest } from '@/services/expenseService';
import dashboardService from '@/services/dashboardService';

const PAGE_SIZE = 6;
const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#64748b'];

export default function Expenses() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const { data: expenses, isLoading, error, refetch } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expenseService.getExpenses(),
  });
  const distribution = useQuery({ queryKey: ['expense-distribution'], queryFn: () => dashboardService.getExpenseDistribution() });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const all = expenses || [];

  const createMutation = useMutation({
    mutationFn: (payload: ExpenseCreateRequest) => expenseService.createExpense(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-distribution'] });
      setShowAdd(false);
      addToast('Expense added', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-distribution'] });
      addToast('Expense deleted', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const categories = ['all', ...new Set(all.map((e) => e.category))];

  const filtered = useMemo(() => {
    let result = [...all];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.description.toLowerCase().includes(q) || e.vendor.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') result = result.filter((e) => e.category === categoryFilter);
    result.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sorting.key];
      const bv = (b as unknown as Record<string, unknown>)[sorting.key];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sorting.direction === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [all, search, categoryFilter, sorting]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalSpend = all.reduce((s, e) => s + e.amount, 0);

  const columns: Column<ExpenseRow>[] = [
    { key: 'date', header: 'Date', sortable: true },
    { key: 'description', header: 'Description', render: (e) => <span className="font-medium text-slate-800">{e.description}</span> },
    { key: 'category', header: 'Category' },
    { key: 'vendor', header: 'Vendor' },
    { key: 'paymentMethod', header: 'Payment Method', render: (e) => <span className="text-slate-500">{e.paymentMethod}</span> },
    {
      key: 'recurring',
      header: 'Recurring',
      render: (e) => (e.recurring ? <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Recurring</span> : <span className="text-xs text-slate-400">—</span>),
    },
    { key: 'amount', header: 'Amount', align: 'right', sortable: true, render: (e) => <span className="font-semibold text-red-600">{CURRENCY(e.amount)}</span> },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <button onClick={() => deleteMutation.mutate(e.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" aria-label="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const handleSort = (key: string) =>
    setSorting((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Monitor and categorize business spending"
        actions={
          <>
            <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 hover">
          <p className="text-xs text-slate-500 mb-1">Total Spend</p>
          <p className="text-2xl font-bold text-slate-900">{CURRENCY(totalSpend)}</p>
        </Card>
        <ChartCard title="Expense by Category" subtitle="Share of total spending" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distribution.data || []} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {(distribution.data || []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
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
              placeholder="Search expenses…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All categories' : c}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : (
          <DataTable columns={columns} data={paginated} keyExtractor={(e) => e.id} sorting={sorting} onSort={handleSort} loading={isLoading} emptyTitle="No expenses found" />
        )}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Card>

      <AddExpenseModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={(p) => createMutation.mutate(p)} submitting={createMutation.isPending} />

      <UploadWizard
        entity="expenses"
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ['expenses'] });
          qc.invalidateQueries({ queryKey: ['expense-distribution'] });
          qc.invalidateQueries({ queryKey: ['history'] });
          qc.invalidateQueries({ queryKey: ['dashboard-recommendations'] });
        }}
      />
    </div>
  );
}

function AddExpenseModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: ExpenseCreateRequest) => void;
  submitting: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, description: '', amount: '', category: 'Materials', vendor: '', payment_method: 'NEFT' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;
    onSubmit({ date: form.date, description: form.description, amount, category: form.category, vendor: form.vendor, payment_method: form.payment_method });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Expense" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1">Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="e.g. Raw material purchase" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Vendor</label>
            <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1">Payment Method</label>
          <input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition">
            {submitting ? 'Saving…' : 'Save Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
