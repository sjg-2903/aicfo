import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, PageHeader, ChartCard } from '@/components/ui';
import { DataTable, Pagination, type Column } from '@/components/DataTable';
import { mockExpenses, mockExpenseDistribution } from '@/mock';
import { CURRENCY, moneyTooltip } from '@/lib/format';

interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  vendor: string;
  amount: number;
  paymentMethod: string;
  recurring: boolean;
}

const PAGE_SIZE = 6;
const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#64748b'];

export default function Expenses() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const categories = ['all', ...new Set(mockExpenses.map((e) => e.category))];

  const filtered = useMemo(() => {
    let result = [...mockExpenses] as Expense[];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.description.toLowerCase().includes(q) || e.vendor.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') result = result.filter((e) => e.category === categoryFilter);
    result.sort((a: any, b: any) => {
      const cmp = typeof a[sorting.key] === 'number' ? a[sorting.key] - b[sorting.key] : String(a[sorting.key]).localeCompare(String(b[sorting.key]));
      return sorting.direction === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [search, categoryFilter, sorting]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalSpend = mockExpenses.reduce((s, e) => s + e.amount, 0);

  const columns: Column<Expense>[] = [
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
  ];

  const handleSort = (key: string) =>
    setSorting((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Monitor and categorize business spending"
        actions={
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 hover">
          <p className="text-xs text-slate-500 mb-1">Total Spend (30d)</p>
          <p className="text-2xl font-bold text-slate-900">{CURRENCY(totalSpend)}</p>
        </Card>
        <ChartCard title="Expense by Category" subtitle="Share of total spending" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={mockExpenseDistribution} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {mockExpenseDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search expenses…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
          >
            {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
          </select>
        </div>

        <DataTable columns={columns} data={paginated} keyExtractor={(e) => e.id} sorting={sorting} onSort={handleSort} emptyTitle="No expenses found" />
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
