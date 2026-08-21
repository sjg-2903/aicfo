import React from 'react';
import { ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { EmptyState } from './ui';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  sorting?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  rowClassName?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  sorting,
  onSort,
  emptyTitle = 'No records found',
  emptyDescription,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="animate-in">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 last:border-0"
          >
            <div className="h-3 w-full max-w-[20%] bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-full max-w-[30%] bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-full max-w-[15%] bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center'
                )}
              >
                {col.sortable ? (
                  <button
                    onClick={() => onSort?.(col.key)}
                    className="inline-flex items-center gap-1 hover:text-slate-900 transition group"
                  >
                    {col.header}
                    <span className="flex flex-col -space-y-1">
                      <ChevronUp
                        className={cn(
                          'w-3 h-3',
                          sorting?.key === col.key && sorting.direction === 'asc'
                            ? 'text-blue-600'
                            : 'text-slate-300 group-hover:text-slate-400'
                        )}
                      />
                      <ChevronDown
                        className={cn(
                          'w-3 h-3',
                          sorting?.key === col.key && sorting.direction === 'desc'
                            ? 'text-blue-600'
                            : 'text-slate-300 group-hover:text-slate-400'
                        )}
                      />
                    </span>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-slate-100 last:border-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-blue-50/40',
                rowClassName
              )}
              style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3 whitespace-nowrap',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className
                  )}
                >
                  {col.render ? col.render(row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{startItem}</span>–
        <span className="font-medium text-slate-700">{endItem}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages })
          .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
          .map((_, i) => {
            const p = Math.max(0, page - 3) + i + 1;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition',
                  p === page
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 text-slate-600'
                )}
              >
                {p}
              </button>
            );
          })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
