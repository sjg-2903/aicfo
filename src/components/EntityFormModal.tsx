import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';

/**
 * Generic create/edit form used by every finance data entity
 * (transactions, invoices, expenses, loans and GST records) so that
 * "Add" and "Edit" always look and behave the same.
 */

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  step?: string;
  /** Render two fields per row (default) or full width. */
  full?: boolean;
}

export type FormValues = Record<string, string | number | boolean>;

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel?: string;
  fields: FieldDef[];
  initial: FormValues;
  submitting?: boolean;
  onSubmit: (values: FormValues) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition';

export function EntityFormModal({ open, onClose, title, submitLabel = 'Save', fields, initial, submitting = false, onSubmit }: Props) {
  const [values, setValues] = useState<FormValues>(initial);

  // Re-seed whenever a different record is opened for editing.
  useEffect(() => {
    if (open) setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(initial)]);

  const set = (name: string, value: string | number | boolean) => setValues((v) => ({ ...v, [name]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const out: FormValues = {};
    for (const f of fields) {
      const raw = values[f.name];
      if (f.type === 'number') out[f.name] = raw === '' || raw === undefined ? 0 : Number(raw);
      else if (f.type === 'checkbox') out[f.name] = !!raw;
      else out[f.name] = raw === undefined ? '' : String(raw);
    }
    onSubmit(out);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.name} className={f.full ? 'sm:col-span-2' : ''}>
              {f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mt-6">
                  <input
                    type="checkbox"
                    checked={!!values[f.name]}
                    onChange={(e) => set(f.name, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600"
                  />
                  {f.label}
                </label>
              ) : (
                <>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-1">{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={String(values[f.name] ?? '')} onChange={(e) => set(f.name, e.target.value)} className={inputClass}>
                      {(f.options || []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={String(values[f.name] ?? '')}
                      onChange={(e) => set(f.name, e.target.value)}
                      className={inputClass}
                      placeholder={f.placeholder}
                      required={f.required}
                      min={f.min}
                      step={f.step}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-medium transition cursor-pointer"
          >
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EntityFormModal;
