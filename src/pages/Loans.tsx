import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, CalendarClock, CheckCircle2, Plus, Upload } from 'lucide-react';
import { Card, PageHeader, Pill, ProgressBar, ErrorState } from '@/components/ui';
import { useToast } from '@/components/Toast';
import UploadWizard from '@/components/UploadWizard';
import { DataTable, type Column } from '@/components/DataTable';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import type { LoanRow } from '@/lib/mappers';
import loanService, { type LoanCreateRequest } from '@/services/loanService';
import { EntityFormModal, type FieldDef, type FormValues } from '@/components/EntityFormModal';
import { RowActions } from '@/components/RowActions';

export default function Loans() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const { data: loans, isLoading, error, refetch } = useQuery({
    queryKey: ['loans'],
    queryFn: () => loanService.getLoans(),
  });

  const [sorting, setSorting] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'outstanding', direction: 'desc' });
  const [showUpload, setShowUpload] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LoanRow | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['loans'] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: LoanCreateRequest) => loanService.createLoan(payload),
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      addToast('Loan added', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LoanCreateRequest> }) => loanService.updateLoan(id, payload),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      addToast('Loan updated', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => loanService.deleteLoan(id),
    onSuccess: () => {
      invalidate();
      addToast('Loan deleted', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const markEmiMutation = useMutation({
    mutationFn: (id: string) => loanService.markEMIPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      addToast('EMI marked as paid', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const all = loans || [];

  const totalOutstanding = all.reduce((s, l) => s + l.outstanding, 0);
  const totalEmi = all.reduce((s, l) => s + l.emi, 0);
  const activeCount = all.filter((l) => l.status === 'active').length;

  const sorted = [...all].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sorting.key];
    const bv = (b as unknown as Record<string, unknown>)[sorting.key];
    return sorting.direction === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
  });

  const columns: Column<LoanRow>[] = [
    { key: 'lender', header: 'Lender', render: (l) => <span className="font-medium text-slate-800 dark:text-slate-100">{l.lender}</span> },
    { key: 'type', header: 'Loan Type' },
    { key: 'principal', header: 'Principal', align: 'right', render: (l) => CURRENCY(l.principal) },
    { key: 'outstanding', header: 'Outstanding', align: 'right', sortable: true, render: (l) => <span className="font-semibold text-slate-800 dark:text-slate-100">{CURRENCY(l.outstanding)}</span> },
    { key: 'rate', header: 'Rate', align: 'right', render: (l) => `${l.rate}%` },
    { key: 'emi', header: 'EMI', align: 'right', render: (l) => CURRENCY(l.emi) },
    { key: 'nextEmi', header: 'Next EMI' },
    { key: 'status', header: 'Status', render: (l) => <Pill value={l.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (l) => (
        <RowActions
          onEdit={() => setEditing(l)}
          onDelete={() => deleteMutation.mutate(l.id)}
          confirmMessage={`Delete the ${l.lender} loan? This cannot be undone.`}
        >
          {l.status === 'active' && (
            <button
              type="button"
              onClick={() => markEmiMutation.mutate(l.id)}
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 transition cursor-pointer"
              title="Mark EMI paid"
              aria-label="Mark EMI paid"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </RowActions>
      ),
    },
  ];

  const handleSort = (key: string) =>
    setSorting((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loans"
        subtitle="Track loans, EMIs and repayment progress"
        actions={
          <>
            <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition cursor-pointer">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm cursor-pointer">
              <Plus className="w-4 h-4" /> Add Loan
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 hover">
          <Banknote className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{CURRENCY(totalOutstanding)}</p>
        </Card>
        <Card className="p-5 hover">
          <CalendarClock className="w-5 h-5 text-amber-500 dark:text-amber-400 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Monthly EMI Burden</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{CURRENCY(totalEmi)}</p>
        </Card>
        <Card className="p-5 hover">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Active Loans</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
        </Card>
      </div>

      {/* Repayment progress */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-5">Repayment Progress</h3>
        <div className="space-y-5">
          {all.length === 0 && !isLoading && <p className="text-sm text-slate-400 dark:text-slate-500">No loans recorded yet.</p>}
          {all.map((loan) => {
            const progress = loan.principal > 0 ? Math.max(0, Math.round(((loan.principal - loan.outstanding) / loan.principal) * 100)) : 0;
            return (
              <div key={loan.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {loan.lender} — {loan.type}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{progress}% repaid</span>
                </div>
                <ProgressBar value={progress} />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {CURRENCY(loan.principal - loan.outstanding)} of {CURRENCY(loan.principal)} repaid · Next EMI {CURRENCY(loan.emi)} on {loan.nextEmi || '—'}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        {error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : (
          <DataTable columns={columns} data={sorted} keyExtractor={(l) => l.id} sorting={sorting} onSort={handleSort} loading={isLoading} emptyTitle="No loans found" />
        )}
      </Card>

      <EntityFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Loan"
        submitLabel="Save Loan"
        fields={LOAN_FIELDS}
        initial={{
          lender: '',
          loan_type: 'Term Loan',
          principal_amount: '',
          outstanding_amount: '',
          interest_rate: '',
          emi_amount: '',
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
          next_emi_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          status: 'active',
        }}
        submitting={createMutation.isPending}
        onSubmit={(v) => createMutation.mutate(toLoanPayload(v))}
      />

      <EntityFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Loan"
        submitLabel="Update Loan"
        fields={LOAN_FIELDS}
        initial={
          editing
            ? {
                lender: editing.lender,
                loan_type: editing.type,
                principal_amount: editing.principal,
                outstanding_amount: editing.outstanding,
                interest_rate: editing.rate,
                emi_amount: editing.emi,
                start_date: editing.startDate,
                end_date: editing.endDate,
                next_emi_date: editing.nextEmi,
                status: editing.status,
              }
            : {}
        }
        submitting={updateMutation.isPending}
        onSubmit={(v) => editing && updateMutation.mutate({ id: editing.id, payload: toLoanPayload(v) })}
      />

      <UploadWizard
        entity="loans"
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ['loans'] });
          qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
          qc.invalidateQueries({ queryKey: ['history'] });
          qc.invalidateQueries({ queryKey: ['dashboard-recommendations'] });
        }}
      />
    </div>
  );
}

const LOAN_FIELDS: FieldDef[] = [
  { name: 'lender', label: 'Lender', type: 'text', required: true, placeholder: 'HDFC Bank' },
  { name: 'loan_type', label: 'Loan Type', type: 'text', placeholder: 'Term Loan' },
  { name: 'principal_amount', label: 'Principal (₹)', type: 'number', required: true, min: 0, step: '0.01', placeholder: '1000000' },
  { name: 'outstanding_amount', label: 'Outstanding (₹)', type: 'number', required: true, min: 0, step: '0.01', placeholder: '750000' },
  { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', min: 0, step: '0.01', placeholder: '12.5' },
  { name: 'emi_amount', label: 'EMI (₹)', type: 'number', min: 0, step: '0.01', placeholder: '25000' },
  { name: 'start_date', label: 'Start Date', type: 'date', required: true },
  { name: 'end_date', label: 'End Date', type: 'date', required: true },
  { name: 'next_emi_date', label: 'Next EMI Date', type: 'date' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'closed', label: 'Closed' },
      { value: 'defaulted', label: 'Defaulted' },
    ],
  },
];

function toLoanPayload(v: FormValues): LoanCreateRequest {
  const status = String(v.status || 'active');
  return {
    lender: String(v.lender),
    loan_type: String(v.loan_type || ''),
    principal_amount: Number(v.principal_amount),
    outstanding_amount: Number(v.outstanding_amount),
    interest_rate: Number(v.interest_rate || 0),
    emi_amount: Number(v.emi_amount || 0),
    start_date: String(v.start_date),
    end_date: String(v.end_date),
    next_emi_date: v.next_emi_date ? String(v.next_emi_date) : null,
    status: (status === 'closed' || status === 'defaulted' ? status : 'active') as 'active' | 'closed' | 'defaulted',
  };
}
