import { useMemo, useState } from 'react';
import { Plus, Search, Download } from 'lucide-react';
import { Card, PageHeader, Pill } from '@/components/ui';
import { DataTable, Pagination, type Column } from '@/components/DataTable';
import { mockTransactions } from '@/mock';
import { CURRENCY } from '@/lib/format';

interface Txn {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  paymentMethod: string;
}

const PAGE_SIZE = 8;

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });

  const filtered = useMemo(() => {
    let result = [...mockTransactions] as Txn[];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.paymentMethod.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }
    result.sort((a: any, b: any) => {
      const av = a[sorting.key];
      const bv = b[sorting.key];
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sorting.direction === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [search, typeFilter, sorting]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns: Column<Txn>[] = [
    { key: 'date', header: 'Date', sortable: true },
    {
      key: 'description',
      header: 'Description',
      render: (t) => <span className="font-medium text-slate-800">{t.description}</span>,
    },
    { key: 'category', header: 'Category' },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (t) => <span className="text-slate-500">{t.paymentMethod}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (t) => <Pill value={t.type === 'income' ? 'good' : 'medium'} label={t.type} />,
    },
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
  ];

  const handleSort = (key: string) => {
    setSorting((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Track all money coming in and going out"
        actions={
          <>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition">
              <Download className="w-4 h-4" /> Export
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <StatsCard label="Total Inflow" value={mockTransactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)} tone="green" />
        <StatsCard label="Total Outflow" value={Math.abs(mockTransactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))} tone="red" />
        <StatsCard label="Net" value={mockTransactions.reduce((s, t) => s + t.amount, 0)} tone="blue" />
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
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${
                  typeFilter === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(t) => t.id}
          sorting={sorting}
          onSort={handleSort}
          emptyTitle="No transactions found"
          emptyDescription="Try adjusting your search or filters."
        />
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Card>
    </div>
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
