import { Pencil, Trash2 } from 'lucide-react';

/**
 * Edit + Delete controls rendered on every finance data row
 * (transactions, invoices, expenses, loans, GST records).
 */
export function RowActions({
  onEdit,
  onDelete,
  confirmMessage = 'Delete this entry? This cannot be undone.',
  disabled = false,
  children,
}: {
  onEdit: () => void;
  onDelete: () => void;
  confirmMessage?: string;
  disabled?: boolean;
  /** Optional extra entity-specific actions rendered before Edit. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {children}
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition disabled:opacity-40 cursor-pointer"
        title="Edit"
        aria-label="Edit"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(confirmMessage)) onDelete();
        }}
        disabled={disabled}
        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition disabled:opacity-40 cursor-pointer"
        title="Delete"
        aria-label="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default RowActions;
