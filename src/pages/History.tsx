import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  History as HistoryIcon,
  UploadCloud,
  ScanLine,
  FileBarChart,
  Lightbulb,
  Database,
  Download,
  Search,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Card, PageHeader, Pill, ErrorState, EmptyState } from '@/components/ui';
import { Pagination } from '@/components/DataTable';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import historyService, { type HistoryEvent, type HistoryEventType } from '@/services/historyService';
import reportService from '@/services/reportService';

const PAGE_SIZE = 15;

const EVENT_META: Record<HistoryEventType, { icon: React.ElementType; tone: string; label: string }> = {
  upload: { icon: UploadCloud, tone: 'bg-blue-50 text-blue-600', label: 'File upload' },
  extraction: { icon: ScanLine, tone: 'bg-violet-50 text-violet-600', label: 'Document extraction' },
  import: { icon: Database, tone: 'bg-emerald-50 text-emerald-600', label: 'Data import' },
  report: { icon: FileBarChart, tone: 'bg-orange-50 text-orange-600', label: 'PDF report' },
  recommendations: { icon: Lightbulb, tone: 'bg-amber-50 text-amber-600', label: 'AI recommendations' },
  record: { icon: HistoryIcon, tone: 'bg-slate-100 text-slate-600', label: 'Record change' },
};

const FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All activity' },
  { id: 'import', label: 'Imports' },
  { id: 'extraction', label: 'Documents' },
  { id: 'report', label: 'Reports' },
  { id: 'recommendations', label: 'AI recommendations' },
  { id: 'record', label: 'Records' },
];

const ENTITY_LINKS: Record<string, string> = {
  transaction: '/transactions',
  transactions: '/transactions',
  invoice: '/invoices',
  invoices: '/invoices',
  expense: '/expenses',
  expenses: '/expenses',
  gst: '/gst',
  loan: '/loans',
  loans: '/loans',
  recommendation: '/recommendations',
  report: '/reports',
};

function groupKey(iso: string | null): string {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function History() {
  const { addToast } = useToast();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['history', filter, search, page],
    queryFn: () =>
      historyService.getHistory({
        page,
        limit: PAGE_SIZE,
        eventType: filter,
        search: search || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportService.deletePdf(id),
    onSuccess: () => {
      refetch();
      addToast('Report deleted', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const download = async (id: string, filename: string) => {
    setDownloadingId(id);
    try {
      await reportService.downloadPdf(id, filename);
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const groups = useMemo(() => {
    const items = data?.items || [];
    const map = new Map<string, HistoryEvent[]>();
    for (const item of items) {
      const key = groupKey(item.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader title="History" subtitle="A complete timeline of uploads, imports, reports and financial-data operations" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${filter === f.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search activity…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
      </div>

      {error ? (
        <Card>
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        </Card>
      ) : isLoading ? (
        <Card className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState
            title={search ? 'No matching activity' : 'No activity recorded yet'}
            description={
              search
                ? 'Try a different search or filter.'
                : 'Upload financial data, generate AI recommendations or download reports — every important operation will show up here.'
            }
            icon={<HistoryIcon className="w-7 h-7" />}
            action={
              !search && (
                <Link
                  to="/transactions"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                >
                  <UploadCloud className="w-4 h-4" /> Upload data
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className={`space-y-6 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {groups.map(([day, events]) => (
            <div key={day}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{day}</p>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-slate-200">
                {events.map((ev, idx) => {
                  const meta = EVENT_META[ev.event_type] || EVENT_META.record;
                  const Icon = meta.icon;
                  const details = ev.details || {};
                  const entityLink = ev.entity ? ENTITY_LINKS[ev.entity] : undefined;
                  return (
                    <div key={ev.id} className="relative group animate-in" style={{ animationDelay: `${idx * 30}ms` }}>
                      <span className={`absolute -left-6 top-5 w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ring-slate-200 ${meta.tone.split(' ')[1] || 'bg-slate-400'}`} />
                      <Card className="p-4 hover" hover>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.tone}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-800">{ev.message || `${meta.label} — ${ev.entity || ''}`}</p>
                              <Pill value={ev.event_type} label={meta.label} />
                              <Pill value={ev.status} />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(ev.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              {details.file_name ? (
                                <>
                                  {' · '}
                                  <span className="font-medium text-slate-500">{String(details.file_name ?? "")}</span>
                                </>
                              ) : null}
                              {typeof details.successful_rows === 'number' && (
                                <>
                                  {' · '}
                                  <span className="text-slate-500">
                                    {String(details.successful_rows)} saved, {String(details.duplicates)} duplicate(s), {String(details.failed_rows)} failed
                                  </span>
                                </>
                              )}
                              {typeof details.size_bytes === 'number' && (
                                <span className="text-slate-500"> · {(Number(details.size_bytes) / 1024).toFixed(0)} KB</span>
                              )}
                              {typeof details.rows_found === 'number' && <span className="text-slate-500"> · {String(details.rows_found)} field(s) found</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {ev.report_id && (
                              <button
                                onClick={() => download(ev.report_id!, String(details.filename || 'report.pdf'))}
                                disabled={downloadingId === ev.report_id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg transition"
                              >
                                {downloadingId === ev.report_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                PDF
                              </button>
                            )}
                            {ev.report_id && (
                              <button
                                onClick={() => deleteMutation.mutate(ev.report_id!)}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition"
                                aria-label="Delete report"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {entityLink && !ev.report_id && (
                              <Link
                                to={entityLink}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition whitespace-nowrap"
                              >
                                View →
                              </Link>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <Pagination page={data?.page || 1} pageSize={PAGE_SIZE} total={data?.total || 0} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
