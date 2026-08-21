/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MOCK DATA LAYER  (TEMPORARY — FOR UI DEVELOPMENT ONLY)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This file simulates backend responses so the frontend can be developed and
 * demoed before the FastAPI backend is available.
 *
 * ── IMPORTANT ──────────────────────────────────────────────────────────────
 * DO NOT treat this as production logic. When the real backend is ready:
 *   1. Replace each call site with the corresponding service method.
 *   2. Delete this file (and the `mock/` directory).
 * The service layer in `src/services/*` already defines the real contracts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Trend {
  current: number;
  change: number; // percentage change vs prior period
  label: string;
}

export interface KpiSummary {
  revenue: Trend;
  expenses: Trend;
  netProfit: Trend;
  cashBalance: Trend & { value: number };
  receivables: Trend & { overdue: number };
  debt: Trend & { upcomingEmi: number; nextEmiDate: string };
}

export interface HealthScore {
  score: number;
  status: 'good' | 'moderate' | 'at_risk' | 'critical';
  label: string;
  factors: { name: string; score: number; weight: number }[];
}

export const mockKpiSummary: KpiSummary = {
  revenue: { current: 4875000, change: 12.4, label: 'vs last quarter' },
  expenses: { current: 2180000, change: -3.2, label: 'vs last quarter' },
  netProfit: { current: 2695000, change: 28.7, label: 'vs last quarter' },
  cashBalance: { current: 1830000, change: 8.1, label: 'vs last month', value: 1830000 },
  receivables: { current: 1240000, change: 15.2, label: 'outstanding', overdue: 418000 },
  debt: {
    current: 8400000,
    change: -6.5,
    label: 'reduction YTD',
    upcomingEmi: 185000,
    nextEmiDate: '2026-02-05',
  },
};

export const mockHealthScore: HealthScore = {
  score: 74,
  status: 'good',
  label: 'Good',
  factors: [
    { name: 'Profitability', score: 88, weight: 0.3 },
    { name: 'Cash Flow', score: 71, weight: 0.3 },
    { name: 'Debt Management', score: 58, weight: 0.2 },
    { name: 'Liquidity', score: 76, weight: 0.2 },
  ],
};

// Revenue vs Expenses (6 months)
export const mockRevenueVsExpenses = [
  { month: 'Aug', revenue: 1280000, expenses: 720000 },
  { month: 'Sep', revenue: 1420000, expenses: 790000 },
  { month: 'Oct', revenue: 1380000, expenses: 810000 },
  { month: 'Nov', revenue: 1590000, expenses: 860000 },
  { month: 'Dec', revenue: 1760000, expenses: 900000 },
  { month: 'Jan', revenue: 1890000, expenses: 945000 },
];

// Revenue trend (daily, 30 points)
export const mockRevenueTrend = Array.from({ length: 30 }, (_, i) => {
  const base = 55000 + i * 120;
  return {
    date: `Jan ${i + 1}`,
    revenue: Math.round(base + Math.sin(i / 3) * 9000),
    target: Math.round(base + 4000),
  };
});

// Cash flow trend
export const mockCashFlowTrend = Array.from({ length: 30 }, (_, i) => {
  const inflow = Math.round(82000 + Math.sin(i / 2.5) * 15000);
  const outflow = Math.round(56000 + Math.cos(i / 3) * 9000);
  return {
    date: `Jan ${i + 1}`,
    inflow,
    outflow,
    netFlow: inflow - outflow,
  };
});

// Expense distribution
export const mockExpenseDistribution = [
  { category: 'Salaries', amount: 620000, percentage: 42 },
  { category: 'Raw Materials', amount: 380000, percentage: 26 },
  { category: 'Rent & Utilities', amount: 180000, percentage: 12 },
  { category: 'Marketing', amount: 120000, percentage: 8 },
  { category: 'Logistics', amount: 95000, percentage: 6 },
  { category: 'Other', amount: 85000, percentage: 6 },
];

// Receivables aging
export const mockReceivablesAging = [
  { bracket: 'Not due', amount: 822000, count: 14, color: '#2563eb' },
  { bracket: '0-30 days', amount: 268000, count: 6, color: '#10b981' },
  { bracket: '31-60 days', amount: 98000, count: 3, color: '#f59e0b' },
  { bracket: '61-90 days', amount: 41000, count: 2, color: '#f97316' },
  { bracket: '90+ days', amount: 11000, count: 1, color: '#ef4444' },
];

// Loan overview
export const mockLoanOverview = [
  { name: 'Term Loan — HDFC', outstanding: 4200000, principal: 6000000, rate: 10.5, emi: 135000, progress: 30 },
  { name: 'Working Capital — SBI', outstanding: 2600000, principal: 3000000, rate: 9.8, emi: 50000, progress: 13 },
  { name: 'Equipment Finance', outstanding: 1600000, principal: 2000000, rate: 11.2, emi: 42000, progress: 20 },
];

// 30-day cash flow forecast (12 historical + 18 predicted)
export const mockCashFlowForecast = (() => {
  const points: any[] = [];
  for (let i = 0; i < 12; i++) {
    points.push({
      date: `Jan ${i + 1}`,
      type: 'historical',
      balance: Math.round(1750000 + i * 8000 + Math.sin(i) * 6000),
    });
  }
  for (let i = 0; i < 18; i++) {
    const base = points[11].balance + (i + 1) * 6000;
    points.push({
      date: `Jan ${13 + i}`,
      type: 'predicted',
      balance: Math.round(base - Math.pow(i / 3, 2) * 1800),
      confidence: Math.max(0.55, 0.94 - i * 0.015),
    });
  }
  return points;
})();

// Transactions
export const mockTransactions = [
  { id: 'txn-001', date: '2026-01-28', description: 'Invoice payment — Delta Traders', amount: 245000, type: 'income', category: 'Sales', paymentMethod: 'Bank Transfer' },
  { id: 'txn-002', date: '2026-01-27', description: 'Raw material purchase', amount: -185000, type: 'expense', category: 'Materials', paymentMethod: 'NEFT' },
  { id: 'txn-003', date: '2026-01-26', description: 'Monthly salaries', amount: -620000, type: 'expense', category: 'Salaries', paymentMethod: 'Bank Transfer' },
  { id: 'txn-004', date: '2026-01-24', description: 'Invoice payment — Metro Logistics', amount: 178000, type: 'income', category: 'Sales', paymentMethod: 'UPI' },
  { id: 'txn-005', date: '2026-01-23', description: 'Electricity bill', amount: -42000, type: 'expense', category: 'Utilities', paymentMethod: 'Auto-debit' },
  { id: 'txn-006', date: '2026-01-21', description: 'GST payment (Q3)', amount: -310000, type: 'expense', category: 'Tax', paymentMethod: 'Challan' },
  { id: 'txn-007', date: '2026-01-20', description: 'Invoice payment — Sunrise Retail', amount: 390000, type: 'income', category: 'Sales', paymentMethod: 'Cheque' },
  { id: 'txn-008', date: '2026-01-18', description: 'Marketing campaign', amount: -65000, type: 'expense', category: 'Marketing', paymentMethod: 'Credit Card' },
  { id: 'txn-009', date: '2026-01-15', description: 'Equipment maintenance', amount: -28000, type: 'expense', category: 'Maintenance', paymentMethod: 'NEFT' },
  { id: 'txn-010', date: '2026-01-12', description: 'Invoice payment — Global Exports', amount: 520000, type: 'income', category: 'Sales', paymentMethod: 'Wire Transfer' },
  { id: 'txn-011', date: '2026-01-10', description: 'Rent payment', amount: -120000, type: 'expense', category: 'Rent', paymentMethod: 'Bank Transfer' },
  { id: 'txn-012', date: '2026-01-08', description: 'Invoice payment — Tech Innovators', amount: 145000, type: 'income', category: 'Sales', paymentMethod: 'UPI' },
  { id: 'txn-013', date: '2026-01-05', description: 'Supplier advance', amount: -150000, type: 'expense', category: 'Materials', paymentMethod: 'Bank Transfer' },
  { id: 'txn-014', date: '2026-01-03', description: 'Consulting fee', amount: 85000, type: 'income', category: 'Services', paymentMethod: 'Bank Transfer' },
  { id: 'txn-015', date: '2026-01-01', description: 'Office supplies', amount: -18000, type: 'expense', category: 'Supplies', paymentMethod: 'Credit Card' },
];

// Invoices
export const mockInvoices = [
  { id: 'inv-001', number: 'INV-2026-014', customer: 'Delta Traders', date: '2026-01-20', dueDate: '2026-02-19', total: 245000, paid: 0, status: 'sent' },
  { id: 'inv-002', number: 'INV-2026-013', customer: 'Metro Logistics', date: '2026-01-15', dueDate: '2026-02-14', total: 178000, paid: 178000, status: 'paid' },
  { id: 'inv-003', number: 'INV-2026-012', customer: 'Sunrise Retail', date: '2026-01-10', dueDate: '2026-01-24', total: 390000, paid: 390000, status: 'paid' },
  { id: 'inv-004', number: 'INV-2026-011', customer: 'Global Exports', date: '2026-01-05', dueDate: '2026-02-04', total: 520000, paid: 200000, status: 'sent' },
  { id: 'inv-005', number: 'INV-2025-082', customer: 'Apex Distributors', date: '2025-12-28', dueDate: '2026-01-27', total: 96000, paid: 0, status: 'overdue' },
  { id: 'inv-006', number: 'INV-2025-078', customer: 'North Star Corp', date: '2025-12-20', dueDate: '2026-01-19', total: 41000, paid: 0, status: 'overdue' },
  { id: 'inv-007', number: 'INV-2025-075', customer: 'Vertex Solutions', date: '2025-12-15', dueDate: '2026-01-14', total: 11000, paid: 0, status: 'overdue' },
  { id: 'inv-008', number: 'INV-2026-015', customer: 'Proxima Ltd', date: '2026-01-28', dueDate: '2026-02-27', total: 150000, paid: 0, status: 'draft' },
];

// Expenses
export const mockExpenses = [
  { id: 'exp-001', date: '2026-01-24', description: 'Raw material — steel sheets', category: 'Materials', vendor: 'SteelMart Suppliers', amount: 185000, paymentMethod: 'NEFT', recurring: false },
  { id: 'exp-002', date: '2026-01-25', description: 'Monthly salaries', category: 'Salaries', vendor: 'Payroll', amount: 620000, paymentMethod: 'Bank Transfer', recurring: true },
  { id: 'exp-003', date: '2026-01-22', description: 'Warehouse rent', category: 'Rent', vendor: 'Prime Properties', amount: 120000, paymentMethod: 'Bank Transfer', recurring: true },
  { id: 'exp-004', date: '2026-01-20', description: 'Google Ads campaign', category: 'Marketing', vendor: 'Google', amount: 65000, paymentMethod: 'Credit Card', recurring: true },
  { id: 'exp-005', date: '2026-01-18', description: 'Electricity bill', category: 'Utilities', vendor: 'BESCOM', amount: 42000, paymentMethod: 'Auto-debit', recurring: true },
  { id: 'exp-006', date: '2026-01-15', description: 'Machine maintenance', category: 'Maintenance', vendor: 'TechServ', amount: 28000, paymentMethod: 'NEFT', recurring: false },
  { id: 'exp-007', date: '2026-01-12', description: 'Logistics — transport', category: 'Logistics', vendor: 'FastFreight', amount: 95000, paymentMethod: 'Bank Transfer', recurring: false },
  { id: 'exp-008', date: '2026-01-08', description: 'Office stationery', category: 'Supplies', vendor: 'Stationery Hub', amount: 18000, paymentMethod: 'Credit Card', recurring: false },
];

// GST records
export const mockGstRecords = [
  { id: 'gst-001', period: 'Jan 2026 (Monthly)', dueDate: '2026-02-20', taxable: 2890000, taxAmount: 520200, paid: 0, status: 'upcoming' },
  { id: 'gst-002', period: 'Dec 2025 (Monthly)', dueDate: '2026-01-20', taxable: 2650000, taxAmount: 477000, paid: 477000, status: 'completed' },
  { id: 'gst-003', period: 'Nov 2025 (Monthly)', dueDate: '2025-12-20', taxable: 2300000, taxAmount: 414000, paid: 414000, status: 'completed' },
  { id: 'gst-004', period: 'Oct 2025 (Monthly)', dueDate: '2025-11-20', taxable: 2100000, taxAmount: 378000, paid: 0, status: 'overdue' },
];

// Loans
export const mockLoans = [
  { id: 'loan-001', lender: 'HDFC Bank', type: 'Term Loan', principal: 6000000, outstanding: 4200000, rate: 10.5, emi: 135000, startDate: '2023-04-01', endDate: '2028-04-01', nextEmi: '2026-02-05', status: 'active' },
  { id: 'loan-002', lender: 'State Bank of India', type: 'Working Capital', principal: 3000000, outstanding: 2600000, rate: 9.8, emi: 50000, startDate: '2024-09-01', endDate: '2027-09-01', nextEmi: '2026-02-10', status: 'active' },
  { id: 'loan-003', lender: 'Tata Capital', type: 'Equipment Finance', principal: 2000000, outstanding: 1600000, rate: 11.2, emi: 42000, startDate: '2024-01-01', endDate: '2027-01-01', nextEmi: '2026-02-15', status: 'active' },
];

// Risks
export const mockRisks = [
  { id: 'risk-001', title: 'Potential Cash Shortage in 45 days', category: 'cash_flow', severity: 'high', status: 'active', impact: 520000, date: '2026-01-28', evidence: 'Projected outflow exceeds inflow from Feb 20 to Mar 5.', action: 'Accelerate receivables collection or arrange a credit line.' },
  { id: 'risk-002', title: 'Rising overdue receivables', category: 'receivables', severity: 'medium', status: 'active', impact: 150000, date: '2026-01-26', evidence: '3 invoices overdue totaling ₹1.48L for 30+ days.', action: 'Send payment reminders and follow up with customers.' },
  { id: 'risk-003', title: 'Marketing spend above budget', category: 'expenses', severity: 'low', status: 'acknowledged', impact: 38000, date: '2026-01-22', evidence: 'Marketing expenses 18% above monthly budget.', action: 'Review campaign ROI and reallocate budget.' },
  { id: 'risk-004', title: 'High debt service coverage pressure', category: 'debt', severity: 'medium', status: 'active', impact: 0, date: '2026-01-20', evidence: 'Combined EMI is 34% of monthly net cash flow.', action: 'Consider refinancing to lower interest rates.' },
  { id: 'risk-005', title: 'GST filing overdue', category: 'gst', severity: 'high', status: 'active', impact: 380000, date: '2026-01-19', evidence: 'Oct 2025 GST payment of ₹3.78L is overdue.', action: 'File and pay overdue GST immediately to avoid penalties.' },
  { id: 'risk-006', title: 'EMI due within grace period', category: 'emi', severity: 'low', status: 'active', impact: 0, date: '2026-01-18', evidence: 'Equipment finance EMI due in 3 days.', action: 'Ensure sufficient balance for upcoming EMI.' },
];

// Loan readiness
export const mockLoanReadiness = {
  score: 68,
  status: 'moderate',
  label: 'Moderate',
  recommendation: 'Your business shows moderate loan readiness. Strengthen debt management and receivables collection to improve eligibility.',
  factors: [
    { name: 'Revenue Stability', score: 82, weight: 0.25, status: 'strong' },
    { name: 'Profitability', score: 78, weight: 0.25, status: 'strong' },
    { name: 'Debt Burden', score: 48, weight: 0.25, status: 'weak' },
    { name: 'Cash Flow Strength', score: 64, weight: 0.15, status: 'moderate' },
    { name: 'Receivables Quality', score: 61, weight: 0.10, status: 'moderate' },
  ],
  suggestions: [
    'Reduce outstanding debt to improve debt-to-equity ratio',
    'Accelerate receivables collection to lower DSO',
    'Maintain 3+ months of consistent profitability records',
    'Build a cash reserve of at least 2 months of opex',
  ],
};

// Recommendations
export const mockRecommendations = [
  { id: 'rec-001', title: 'Follow up on overdue receivables', description: '3 invoices totaling ₹1.48L are overdue for more than 30 days.', priority: 'high', status: 'new', impact: 'Recover up to ₹1.48L', sourceAgent: 'Invoice Agent', date: '2026-01-28', category: 'receivables' },
  { id: 'rec-002', title: 'Pay overdue GST immediately', description: 'Oct 2025 GST of ₹3.78L is overdue and accruing penalties.', priority: 'critical', status: 'new', impact: 'Avoid ~₹45K penalty', sourceAgent: 'GST Agent', date: '2026-01-27', category: 'gst' },
  { id: 'rec-003', title: 'Negotiate material supplier terms', description: 'Raw material costs rose 8% QoQ. Renegotiate volume discounts.', priority: 'medium', status: 'acknowledged', impact: 'Save ~3% on materials', sourceAgent: 'Expense Agent', date: '2026-01-25', category: 'expenses' },
  { id: 'rec-004', title: 'Refinance high-interest term loan', description: 'Refinancing at lower rates could reduce EMI by ₹12K/month.', priority: 'medium', status: 'new', impact: 'Save ₹1.4L/year', sourceAgent: 'Loan Agent', date: '2026-01-24', category: 'debt' },
  { id: 'rec-005', title: 'Build cash buffer for slow season', description: 'Historical data shows a seasonal dip in March.', priority: 'high', status: 'in_progress', impact: 'Avoid liquidity crunch', sourceAgent: 'Cash Flow Agent', date: '2026-01-22', category: 'cash_flow' },
  { id: 'rec-006', title: 'Reduce discretionary marketing spend', description: 'Marketing is 18% over budget with declining returns.', priority: 'low', status: 'completed', impact: 'Save ₹38K/month', sourceAgent: 'Expense Agent', date: '2026-01-20', category: 'expenses' },
];

// Alerts
export const mockAlerts = [
  { id: 'alert-001', title: 'GST payment overdue', description: 'Oct 2025 GST of ₹3.78L is overdue by 38 days.', severity: 'critical', type: 'gst', read: false, date: '2026-01-28', link: '/gst' },
  { id: 'alert-002', title: 'Potential cash shortage detected', description: 'Cash balance projected to dip below safety threshold in 45 days.', severity: 'high', type: 'cash_flow', read: false, date: '2026-01-28', link: '/cash-flow' },
  { id: 'alert-003', title: 'EMI due in 3 days', description: 'Tata Capital EMI of ₹42K due Feb 1.', severity: 'medium', type: 'emi', read: false, date: '2026-01-28', link: '/loans' },
  { id: 'alert-004', title: '3 invoices overdue', description: 'Invoices totaling ₹1.48L overdue by 30+ days.', severity: 'medium', type: 'receivables', read: true, date: '2026-01-26', link: '/invoices' },
  { id: 'alert-005', title: 'Marketing spend above 90% budget', description: 'Marketing expenses at 108% of January budget.', severity: 'low', type: 'expense', read: true, date: '2026-01-24', link: '/expenses' },
  { id: 'alert-006', title: 'Financial health improving', description: 'Health score improved by 4 points this month.', severity: 'info', type: 'health', read: true, date: '2026-01-22', link: '/financial-health' },
];

// Financial health details
export const mockFinancialHealth = {
  indicators: [
    { name: 'Gross Margin', value: 42.5, unit: '%', status: 'good' },
    { name: 'Net Profit Margin', value: 18.7, unit: '%', status: 'good' },
    { name: 'Current Ratio', value: 1.8, unit: 'x', status: 'good' },
    { name: 'Debt-to-Equity', value: 2.1, unit: 'x', status: 'at_risk' },
    { name: 'DSO (Days Sales Outstanding)', value: 48, unit: 'days', status: 'moderate' },
    { name: 'Operating Cash Flow', value: 620000, unit: '₹', status: 'good' },
  ],
  strengths: [
    'Strong and growing net profit margin (18.7%)',
    'Healthy gross margin of 42.5% indicating good pricing power',
    'Consistent positive operating cash flow',
    'Revenue growth of 12.4% quarter over quarter',
  ],
  weaknesses: [
    'High debt-to-equity ratio of 2.1x',
    'Rising days sales outstanding (48 days)',
    'Marketing spend 18% above budget',
    'Seasonal cash flow volatility in Q1',
  ],
  interpretation: 'Acme Industries demonstrates solid profitability and revenue growth, positioning the business well for sustained operations. The primary area of concern is leverage — a debt-to-equity ratio of 2.1x suggests over-reliance on borrowing. DSO is trending upward, indicating slower collections, which, combined with seasonal cash flow dips, could create near-term liquidity pressure. Address debt and receivables to move from "Good" to "Excellent" financial health.',
};

// Cash flow module data
export const mockCashFlowModule = {
  currentBalance: 1830000,
  monthInflow: 2450000,
  monthOutflow: 1870000,
  netCashFlow: 580000,
  predictedInflow: 2100000,
  predictedOutflow: 2320000,
  predictedNet: -220000,
  projectedBalance: 1610000,
  confidence: 82,
  riskPoints: [
    { date: 'Feb 20', description: 'Projected cash dip below ₹1.5M safety threshold' },
    { date: 'Mar 8', description: 'Seasonal slowdown — outflow exceeds inflow' },
  ],
};
