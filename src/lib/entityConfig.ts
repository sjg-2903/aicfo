/**
 * Configuration for each finance entity used by the Upload wizard.
 * Field keys mirror the backend import/confirm field names exactly.
 */

export type EntityKey = 'transactions' | 'invoices' | 'expenses' | 'gst' | 'loans';

export interface EntityField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  colSpan?: number;
}

export interface EntityConfig {
  key: EntityKey;
  label: string;
  singular: string;
  /** Fields shown in the OCR review form, in order. */
  fields: EntityField[];
  /** Example of accepted column headers, shown in the upload help. */
  csvHint: string;
  /** Backend import route (for CSV/Excel files). */
  importPath: string;
  /** Route for the section (used for deep links). */
  sectionPath: string;
}

export const ENTITY_CONFIGS: Record<EntityKey, EntityConfig> = {
  transactions: {
    key: 'transactions',
    label: 'Transactions',
    singular: 'transaction',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true, colSpan: 1 },
      { key: 'description', label: 'Description', type: 'text', required: true, colSpan: 2 },
      { key: 'amount', label: 'Amount (₹)', type: 'number', required: true, colSpan: 1 },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: ['income', 'expense'],
        colSpan: 1,
      },
      { key: 'category', label: 'Category', type: 'text', placeholder: 'Sales', colSpan: 1 },
      { key: 'payment_method', label: 'Payment Method', type: 'text', placeholder: 'NEFT', colSpan: 1 },
      { key: 'reference_id', label: 'Reference ID', type: 'text', colSpan: 1 },
    ],
    csvHint: 'date, description, amount, type, category, payment_method',
    importPath: '/api/transactions/import',
    sectionPath: '/transactions',
  },
  invoices: {
    key: 'invoices',
    label: 'Invoices',
    singular: 'invoice',
    fields: [
      { key: 'invoice_number', label: 'Invoice No.', type: 'text', required: true, colSpan: 1 },
      { key: 'customer_name', label: 'Customer', type: 'text', required: true, colSpan: 2 },
      { key: 'invoice_date', label: 'Invoice Date', type: 'date', required: true, colSpan: 1 },
      { key: 'due_date', label: 'Due Date', type: 'date', required: true, colSpan: 1 },
      { key: 'total_amount', label: 'Total (₹)', type: 'number', required: true, colSpan: 1 },
      { key: 'paid_amount', label: 'Paid (₹)', type: 'number', colSpan: 1 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
        colSpan: 1,
      },
      { key: 'customer_email', label: 'Customer Email', type: 'text', colSpan: 1 },
    ],
    csvHint: 'invoice_number, customer_name, invoice_date, due_date, total_amount, paid_amount, status',
    importPath: '/api/invoices/import',
    sectionPath: '/invoices',
  },
  expenses: {
    key: 'expenses',
    label: 'Expenses',
    singular: 'expense',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true, colSpan: 1 },
      { key: 'description', label: 'Description', type: 'text', required: true, colSpan: 2 },
      { key: 'amount', label: 'Amount (₹)', type: 'number', required: true, colSpan: 1 },
      { key: 'category', label: 'Category', type: 'text', placeholder: 'Utilities', colSpan: 1 },
      { key: 'vendor', label: 'Vendor', type: 'text', colSpan: 1 },
      { key: 'payment_method', label: 'Payment Method', type: 'text', colSpan: 1 },
      { key: 'recurring', label: 'Recurring', type: 'boolean', colSpan: 1 },
    ],
    csvHint: 'date, description, category, vendor, amount, payment_method, recurring',
    importPath: '/api/expenses/import',
    sectionPath: '/expenses',
  },
  gst: {
    key: 'gst',
    label: 'GST Records',
    singular: 'GST record',
    fields: [
      { key: 'period', label: 'Period', type: 'text', required: true, placeholder: 'Jul 2026', colSpan: 1 },
      { key: 'due_date', label: 'Due Date', type: 'date', required: true, colSpan: 1 },
      { key: 'tax_amount', label: 'Tax Amount (₹)', type: 'number', required: true, colSpan: 1 },
      { key: 'period_start', label: 'Period Start', type: 'date', colSpan: 1 },
      { key: 'period_end', label: 'Period End', type: 'date', colSpan: 1 },
      { key: 'taxable_turnover', label: 'Taxable Turnover (₹)', type: 'number', colSpan: 1 },
      { key: 'paid_amount', label: 'Paid (₹)', type: 'number', colSpan: 1 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['pending', 'filed', 'paid', 'overdue'],
        colSpan: 1,
      },
      { key: 'reference_number', label: 'Reference No.', type: 'text', colSpan: 1 },
    ],
    csvHint: 'period, period_start, period_end, due_date, taxable_turnover, tax_amount, paid_amount, status',
    importPath: '/api/gst/import',
    sectionPath: '/gst',
  },
  loans: {
    key: 'loans',
    label: 'Loans',
    singular: 'loan',
    fields: [
      { key: 'lender', label: 'Lender', type: 'text', required: true, colSpan: 2 },
      { key: 'loan_type', label: 'Loan Type', type: 'text', placeholder: 'Term Loan', colSpan: 1 },
      { key: 'principal_amount', label: 'Principal (₹)', type: 'number', required: true, colSpan: 1 },
      { key: 'outstanding_amount', label: 'Outstanding (₹)', type: 'number', colSpan: 1 },
      { key: 'interest_rate', label: 'Interest Rate (%)', type: 'number', colSpan: 1 },
      { key: 'emi_amount', label: 'EMI (₹)', type: 'number', colSpan: 1 },
      { key: 'start_date', label: 'Start Date', type: 'date', colSpan: 1 },
      { key: 'end_date', label: 'End Date', type: 'date', colSpan: 1 },
      { key: 'next_emi_date', label: 'Next EMI Date', type: 'date', colSpan: 1 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['active', 'closed', 'defaulted'],
        colSpan: 1,
      },
    ],
    csvHint: 'lender, loan_type, principal_amount, outstanding_amount, interest_rate, emi_amount, start_date, end_date, next_emi_date, status',
    importPath: '/api/loans/import',
    sectionPath: '/loans',
  },
};

/** Recognized file extensions for tabular imports vs document extraction. */
export const TABULAR_EXTENSIONS = ['csv', 'xlsx'];
export const DOCUMENT_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

export function fileKind(name: string): 'tabular' | 'document' | 'unsupported' {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (TABULAR_EXTENSIONS.includes(ext)) return 'tabular';
  if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
  return 'unsupported';
}
