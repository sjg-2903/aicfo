import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Card, PageHeader, Pill } from '@/components/ui';
import { DataTable, Pagination, type Column } from '@/components/DataTable';
import { mockInvoices } from '@/mock';
import { CURRENCY } from '@/lib/format';

interface Invoice {
  id: string;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  total: number;
  paid: number;
  status: string;
}

const PAGE_SIZE = 8;

export default function Invoices() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const filtered = useMemo(() => {
    let result = [...mockInvoices] as Invoice[];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.customer.toLowerCase().includes(q) || i.number.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') result = result.filter((i) => i.status === statusFilter);
    result.sort((a: any, b: any) => {
      const cmp = String(a[sorting.key]).localeCompare(String(b[sorting.key]));
      return sorting.direction === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [search, statusFilter, sorting]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const overdueTotal = mockInvoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + (i.total - i.paid), 0);

  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice #', render: (i) => <span className="font-medium text-slate-800">{i.number}</span> },
    { key: 'customer', header: 'Customer', render: (i) => <span className="font-medium text-slate-700">{i.customer}</span> },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (i) => <span className="font-semibold text-slate-800">{CURRENCY(i.total)}</span>,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      render: (i) => {
        const out = i.total - i.paid;
        return <span className={out > 0 ? 'font-semibold text-amber-600' : 'text-slate-400'}>{CURRENCY(out)}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) => <Pill value={i.status} />,
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
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total Outstanding" value={mockInvoices.reduce((s, i) => s + (i.total - i.paid), 0)} tone="text-blue-600" />
        <Stat label="Overdue Amount" value={overdueTotal} tone="text-red-600" />
        <Stat label="Paid (last 30d)" value={mockInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0)} tone="text-green-600" />
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by customer or invoice #…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'sent', 'paid', 'overdue', 'draft'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <DataTable columns={columns} data={paginated} keyExtractor={(i) => i.id} sorting={sorting} onSort={handleSort} emptyTitle="No invoices found" />
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Card>
    </div>
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
