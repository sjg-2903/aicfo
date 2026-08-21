/**
 * Mapping layer: transforms FastAPI backend payloads (snake_case) into the
 * display shapes used by the UI (camelCase, like the old mock data). All
 * financial values pass through unchanged — no recalculation happens here.
 */

// ── Display types ───────────────────────────────────────────────────────────
export interface TxnRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  paymentMethod: string;
}

export interface InvoiceRow {
  id: string;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  total: number;
  paid: number;
  status: string;
}

export interface ExpenseRow {
  id: string;
  date: string;
  description: string;
  category: string;
  vendor: string;
  amount: number;
  paymentMethod: string;
  recurring: boolean;
}

export interface GstRow {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  taxable: number;
  taxAmount: number;
  paid: number;
  status: string;
}

export interface LoanRow {
  id: string;
  lender: string;
  type: string;
  startDate: string;
  endDate: string;
  principal: number;
  outstanding: number;
  rate: number;
  emi: number;
  nextEmi: string;
  status: string;
}

export interface RiskRow {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  impact: number;
  evidence: string;
  action: string;
  date: string;
}

export interface FactorRow {
  name: string;
  score: number;
  weight: number;
  status?: string;
}

export interface HealthView {
  score: number;
  status: string;
  label: string;
  factors: FactorRow[];
  indicators: { name: string; value: number; unit: string; status: string }[];
  strengths: string[];
  weaknesses: string[];
  interpretation: string;
}

export interface LoanReadinessView {
  score: number;
  status: string;
  label: string;
  recommendation: string;
  factors: FactorRow[];
  suggestions: string[];
}

export interface RecommendationRow {
  id: string;
  rid: string;
  title: string;
  description: string;
  reason: string;
  action: string;
  priority: string;
  status: string;
  impact: string;
  impactValue: number;
  sourceAgent: string;
  date: string;
  category: string;
}

export interface AlertRow {
  id: string;
  title: string;
  description: string;
  severity: string;
  type: string;
  read: boolean;
  date: string;
  link: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const d = (iso?: string | null): string => (iso ? String(iso).slice(0, 10) : '');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortMonth(key: string): string {
  const m = Number(key.slice(5, 7));
  return MONTHS[m - 1] || key;
}

// ── Raw (backend) types ─────────────────────────────────────────────────────
interface RawTxn { id: string; date: string; description: string; amount: number; type: string; category: string; payment_method: string; }
interface RawInvoice { id: string; invoice_number: string; customer_name: string; invoice_date: string; due_date: string; total_amount: number; paid_amount: number; status: string; }
interface RawExpense { id: string; date: string; description: string; category: string; vendor: string; amount: number; payment_method: string; recurring: boolean; }
interface RawGst { id: string; period: string; period_start?: string; period_end?: string; due_date: string; taxable_turnover: number; tax_amount: number; paid_amount: number; status: string; }
interface RawLoan { id: string; lender: string; loan_type: string; start_date?: string; end_date?: string; principal_amount: number; outstanding_amount: number; interest_rate: number; emi_amount: number; next_emi_date: string | null; status: string; }
interface RawRisk { id: string; type: string; severity: string; status?: string; impact?: number; title: string; evidence: string; recommended_action: string; }
interface RawFactor { name: string; score: number; weight: number; status?: string; }
interface RawRecommendation { id: string; rid?: string; title: string; description: string; reason?: string; recommended_action?: string; expected_impact?: string; impact_value?: number; priority: string; status: string; source_agent: string; created_at: string; category: string; }
interface RawAlert { id: string; title: string; description: string; severity: string; type: string; is_read: boolean; created_at: string; action_url?: string; }

// ── Mappers ─────────────────────────────────────────────────────────────────
export function mapTransaction(raw: RawTxn): TxnRow {
  return {
    id: raw.id,
    date: d(raw.date),
    description: raw.description,
    amount: raw.type === 'expense' ? -Math.abs(raw.amount) : Math.abs(raw.amount),
    type: raw.type as 'income' | 'expense',
    category: raw.category || 'General',
    paymentMethod: raw.payment_method || '',
  };
}

export function mapInvoice(raw: RawInvoice): InvoiceRow {
  return {
    id: raw.id,
    number: raw.invoice_number,
    customer: raw.customer_name,
    date: d(raw.invoice_date),
    dueDate: d(raw.due_date),
    total: raw.total_amount,
    paid: raw.paid_amount,
    status: raw.status,
  };
}

export function mapExpense(raw: RawExpense): ExpenseRow {
  return {
    id: raw.id,
    date: d(raw.date),
    description: raw.description,
    category: raw.category || 'General',
    vendor: raw.vendor || '',
    amount: raw.amount,
    paymentMethod: raw.payment_method || '',
    recurring: !!raw.recurring,
  };
}

export function mapGst(raw: RawGst): GstRow {
  return {
    id: raw.id,
    period: raw.period,
    periodStart: d(raw.period_start),
    periodEnd: d(raw.period_end),
    dueDate: d(raw.due_date),
    taxable: raw.taxable_turnover,
    taxAmount: raw.tax_amount,
    paid: raw.paid_amount,
    status: raw.status,
  };
}

export function mapLoan(raw: RawLoan): LoanRow {
  return {
    id: raw.id,
    lender: raw.lender,
    type: raw.loan_type || 'Loan',
    startDate: d(raw.start_date),
    endDate: d(raw.end_date),
    principal: raw.principal_amount,
    outstanding: raw.outstanding_amount,
    rate: raw.interest_rate,
    emi: raw.emi_amount,
    nextEmi: d(raw.next_emi_date),
    status: raw.status,
  };
}

export function mapRisk(raw: RawRisk, generatedAt?: string): RiskRow {
  return {
    id: raw.id,
    title: raw.title,
    category: raw.type,
    severity: raw.severity,
    status: raw.status || 'active',
    impact: raw.impact || 0,
    evidence: raw.evidence,
    action: raw.recommended_action || '',
    date: d(generatedAt),
  };
}

export function mapHealth(raw: {
  score: number;
  status: string;
  label: string;
  factors: RawFactor[];
  strengths: string[];
  weaknesses: string[];
  interpretation: string;
  metrics: { margin: number; expense_ratio: number; runway_months: number; debt_to_revenue: number; emi_to_revenue: number };
}): HealthView {
  const m = raw.metrics || {};
  return {
    score: raw.score,
    status: raw.status,
    label: raw.label,
    factors: raw.factors.map((f) => ({ name: f.name, score: f.score, weight: f.weight })),
    indicators: [
      { name: 'Net Profit Margin', value: Math.round((m.margin || 0) * 1000) / 10, unit: '%', status: (m.margin || 0) >= 0.1 ? 'good' : (m.margin || 0) > 0 ? 'moderate' : 'at_risk' },
      { name: 'Expense Ratio', value: Math.round((m.expense_ratio || 0) * 1000) / 10, unit: '%', status: (m.expense_ratio || 0) <= 0.7 ? 'good' : 'moderate' },
      { name: 'Cash Runway', value: Math.round((m.runway_months || 0) * 10) / 10, unit: 'mo', status: (m.runway_months || 0) >= 3 ? 'good' : (m.runway_months || 0) >= 1 ? 'moderate' : 'at_risk' },
      { name: 'Debt / Revenue', value: Math.round((m.debt_to_revenue || 0) * 100) / 100, unit: 'x', status: (m.debt_to_revenue || 0) <= 1 ? 'good' : 'at_risk' },
      { name: 'EMI / Revenue', value: Math.round((m.emi_to_revenue || 0) * 1000) / 10, unit: '%', status: (m.emi_to_revenue || 0) <= 0.25 ? 'good' : 'moderate' },
    ],
    strengths: raw.strengths || [],
    weaknesses: raw.weaknesses || [],
    interpretation: raw.interpretation || '',
  };
}

export function mapLoanReadiness(raw: {
  readiness_score: number;
  status: string;
  label: string;
  overall_recommendation: string;
  factors: RawFactor[];
  improvement_suggestions: string[];
}): LoanReadinessView {
  return {
    score: raw.readiness_score,
    status: raw.status,
    label: raw.label,
    recommendation: raw.overall_recommendation,
    factors: raw.factors.map((f) => ({ name: f.name, score: f.score, weight: f.weight, status: f.status })),
    suggestions: raw.improvement_suggestions || [],
  };
}

export function mapRecommendation(raw: RawRecommendation): RecommendationRow {
  return {
    id: raw.id,
    rid: raw.rid || '',
    title: raw.title,
    description: raw.description,
    reason: raw.reason || '',
    action: raw.recommended_action || raw.description,
    priority: raw.priority,
    status: raw.status,
    impact: raw.expected_impact || '',
    impactValue: Number(raw.impact_value || 0),
    sourceAgent: raw.source_agent,
    date: d(raw.created_at),
    category: raw.category,
  };
}

export function mapAlert(raw: RawAlert): AlertRow {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    severity: raw.severity,
    type: raw.type,
    read: !!raw.is_read,
    date: d(raw.created_at),
    link: raw.action_url || '/dashboard',
  };
}
