import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Lightbulb,
  LayoutDashboard,
  HeartPulse,
  ArrowLeftRight,
  FileText,
  Receipt,
  Landmark,
  Banknote,
  TrendingUp,
  ShieldAlert,
  Gauge,
  BrainCircuit,
  Bell,
  FileBarChart,
  History,
  Building2,
  Settings as SettingsIcon,
} from 'lucide-react';

export type SegmentId =
  | 'dashboard'
  | 'financial-health'
  | 'transactions'
  | 'invoices'
  | 'expenses'
  | 'gst'
  | 'loans'
  | 'cash-flow'
  | 'risk-analysis'
  | 'loan-readiness'
  | 'ai-cfo'
  | 'recommendations'
  | 'alerts'
  | 'reports'
  | 'history'
  | 'profile'
  | 'settings';

export interface StepItem {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  proTip: string;
  actionLabel?: string;
  actionTo?: string;
  actionOnClick?: () => void;
}

export interface SegmentGuideConfig {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  steps: StepItem[];
}

export const SEGMENT_GUIDES: Record<SegmentId, SegmentGuideConfig> = {
  dashboard: {
    title: 'Executive Financial Command Center',
    subtitle: 'How to monitor and navigate your live business financial telemetry',
    icon: LayoutDashboard,
    color: 'from-blue-600 to-indigo-600',
    steps: [
      {
        id: 'dash-1',
        stepNumber: '01',
        title: 'Review Topline Financial KPIs',
        description:
          'Check current monthly Revenue, Operating Expenses, Net Profit, and live Cash Balance. Compare percentage trends against previous month benchmarks.',
        proTip: 'A healthy MSME aims for at least 15% net profit margin and 60+ days of operating cash buffer.',
        actionLabel: 'View Health Score',
        actionTo: '/financial-health',
      },
      {
        id: 'dash-2',
        stepNumber: '02',
        title: 'Inspect Cash Runway & 30-Day Forecast',
        description:
          'Examine the 30-day cash flow curve to anticipate upcoming payment dips or surplus windows before they impact daily operations.',
        proTip: 'Look out for negative daily net flow days and plan vendor payments around customer receipt milestones.',
        actionLabel: 'Open Forecast',
        actionTo: '/cash-flow',
      },
      {
        id: 'dash-3',
        stepNumber: '03',
        title: 'Review AI Strategic Recommendations',
        description:
          'Read high-priority insights formulated by Gemini & OpenAI on what to do with your cash, how to accelerate receivables, and where to trim costs.',
        proTip: 'Execute recommendations with "Critical" or "High" priority first for the fastest return on liquidity.',
        actionLabel: 'All Recommendations',
        actionTo: '/recommendations',
      },
      {
        id: 'dash-4',
        stepNumber: '04',
        title: 'Consult AI CFO for Strategic Scenarios',
        description:
          'Ask conversational questions about pricing changes, loan eligibility, vendor renegotiation, or upload financial documents for instant analysis.',
        proTip: 'Ask: "What will happen to my runway if receivables are delayed by 2 weeks?" for instant simulation.',
        actionLabel: 'Ask AI CFO',
        actionTo: '/ai-cfo',
      },
    ],
  },

  'financial-health': {
    title: 'Financial Health & Ratio Benchmarking',
    subtitle: 'Step-by-step methodology to evaluate and improve your MSME health score',
    icon: HeartPulse,
    color: 'from-emerald-600 to-teal-600',
    steps: [
      {
        id: 'fh-1',
        stepNumber: '01',
        title: 'Analyze Overall Health Score (0–100)',
        description:
          'Evaluate your consolidated health rating. Scores above 75 indicate Strong financial resilience; 55–74 Fair; below 55 requires immediate remediation.',
        proTip: 'Lenders look for a consistent health score above 70 when evaluating unsecured working capital loans.',
      },
      {
        id: 'fh-2',
        stepNumber: '02',
        title: 'Audit the 5 Pillar Ratios',
        description:
          'Review individual factor scores: Profitability Margin, Liquidity Ratio (Current & Quick), Debt Leverage (DSCR), Operating Efficiency, and Growth.',
        proTip: 'If your Liquidity score is under 50, prioritize building a dedicated 2-month OpEx emergency reserve.',
        actionLabel: 'Manage Cash Flow',
        actionTo: '/cash-flow',
      },
      {
        id: 'fh-3',
        stepNumber: '03',
        title: 'Benchmark Against MSME Industry Standards',
        description:
          'Compare your business operating metrics against top quartile performers in your specific MSME sector to uncover competitive gaps.',
        proTip: 'Use industry average DSO (Days Sales Outstanding) to calibrate your customer credit terms.',
      },
      {
        id: 'fh-4',
        stepNumber: '04',
        title: 'Execute Targeted Score Improvement Actions',
        description:
          'Follow the recommended remediation checklist below to systematically convert weak factors into strengths within 30 to 60 days.',
        proTip: 'Revisiting this page weekly helps track positive momentum as you reconcile new transactions.',
        actionLabel: 'Review AI Guidance',
        actionTo: '/recommendations',
      },
    ],
  },

  transactions: {
    title: 'Transaction Hub & Ledger Management',
    subtitle: 'How to ingest, categorize, reconcile, and audit business cash flows',
    icon: ArrowLeftRight,
    color: 'from-blue-600 to-cyan-600',
    steps: [
      {
        id: 'tx-1',
        stepNumber: '01',
        title: 'Import Bank Statements or Log Inflows/Outflows',
        description:
          'Upload CSV or Excel statements from your current account, or click "+ Add Transaction" to manually record sales, collections, vendor payouts, or transfers.',
        proTip: 'You can import multi-month bank statements at once using our smart schema mapper.',
      },
      {
        id: 'tx-2',
        stepNumber: '02',
        title: 'Verify Category Tagging & Payment Modes',
        description:
          'Ensure every transaction is correctly mapped to Revenue, Direct Costs, Operating Expenses, Loan Repayments, or Tax Settlements.',
        proTip: 'Accurate categorization feeds directly into your AI expense breakdown and GST ITC calculations.',
        actionLabel: 'Check Expenses',
        actionTo: '/expenses',
      },
      {
        id: 'tx-3',
        stepNumber: '03',
        title: 'Filter & Search Suspicious or Unreconciled Entries',
        description:
          'Use the date range picker, payment method filters (UPI, NEFT, RTGS, Cash), and search bar to audit specific customer receipts or vendor debits.',
        proTip: 'Quickly find transactions by searching vendor name or reference invoice number.',
      },
      {
        id: 'tx-4',
        stepNumber: '04',
        title: 'Export Cleaned Ledgers for CA & Tax Filings',
        description:
          'Export reconciled transaction reports in standard Excel/CSV formats ready for your Chartered Accountant or internal accounting software.',
        proTip: 'Keep ledgers up to date weekly to avoid month-end reconciliation crunches.',
        actionLabel: 'Generate Report',
        actionTo: '/reports',
      },
    ],
  },

  invoices: {
    title: 'Invoicing & Accounts Receivable (A/R)',
    subtitle: 'Accelerate invoice collections, reduce Net-DSO, and eliminate bad debts',
    icon: FileText,
    color: 'from-indigo-600 to-blue-600',
    steps: [
      {
        id: 'inv-1',
        stepNumber: '01',
        title: 'Issue Invoices with Clear Payment Terms',
        description:
          'Create new customer invoices with GST details, itemized lines, and strict due dates (e.g. Net-15 or Net-30).',
        proTip: 'Shortening standard terms from Net-30 to Net-15 for new clients accelerates cash velocity by 50%.',
      },
      {
        id: 'inv-2',
        stepNumber: '02',
        title: 'Monitor Receivables Aging Buckets',
        description:
          'Review the Aging Distribution (0–30, 31–60, 61–90, 90+ days) to identify delinquent accounts before they become irrecoverable bad debts.',
        proTip: 'Invoices over 60 days overdue have a 40% higher probability of default. Act early!',
      },
      {
        id: 'inv-3',
        stepNumber: '03',
        title: 'Trigger Automated Collection Reminders & Discounts',
        description:
          'Send polite WhatsApp/email payment nudges with an optional 1.5% prompt settlement discount for payments cleared within 48 hours.',
        proTip: 'Prompt-pay discounts often recover cash 3x faster than late payment penalty threats.',
        actionLabel: 'Ask AI CFO to Draft Reminder',
        actionTo: '/ai-cfo',
      },
      {
        id: 'inv-4',
        stepNumber: '04',
        title: 'Mark Invoices as Paid & Reconcile Balances',
        description:
          'Once customer funds hit your bank, update the invoice status to Paid. Outstanding receivables and cash balances auto-update instantly.',
        proTip: 'Regular reconciliation ensures your credit score and loan readiness reflect accurate cash inflows.',
        actionLabel: 'Check Loan Readiness',
        actionTo: '/loan-readiness',
      },
    ],
  },

  expenses: {
    title: 'Expense Tracking & Spend Optimization',
    subtitle: 'Control operational outflows, detect duplicate subscriptions, and expand margins',
    icon: Receipt,
    color: 'from-amber-600 to-orange-600',
    steps: [
      {
        id: 'exp-1',
        stepNumber: '01',
        title: 'Log Outflows & Upload Receipts',
        description:
          'Record all direct costs, rent, utilities, vendor bills, and payroll. Categorize each spend to monitor departmental budgets.',
        proTip: 'Attach digital bills and invoices for audit-ready bookkeeping.',
      },
      {
        id: 'exp-2',
        stepNumber: '02',
        title: 'Review Category Breakdown & Trend Analysis',
        description:
          'Inspect the expense distribution pie chart to identify which category (e.g. Raw Materials, Marketing, Logistics) is growing fastest.',
        proTip: 'If discretionary spend exceeds 15% of total expenses, initiate a line-item budget review.',
      },
      {
        id: 'exp-3',
        stepNumber: '03',
        title: 'Audit Recurring SaaS & Vendor Contracts',
        description:
          'Identify automated monthly subscriptions and long-term supplier contracts. Check for unused seats or opportunities for bulk annual discounts.',
        proTip: 'Renegotiating terms with top 3 raw material vendors typically unlocks 4%–8% in cost savings.',
        actionLabel: 'View Cost Recommendations',
        actionTo: '/recommendations',
      },
      {
        id: 'exp-4',
        stepNumber: '04',
        title: 'Enforce Expense Approval Thresholds',
        description:
          'Set monthly spending limits for discretionary categories to protect your minimum required operational cash buffer.',
        proTip: 'Check the 30-day cash flow forecast before approving large one-time capital expenditures.',
        actionLabel: 'View Cash Runway',
        actionTo: '/cash-flow',
      },
    ],
  },

  gst: {
    title: 'GST & Tax Compliance Management',
    subtitle: 'Maximize Input Tax Credit (ITC), verify liabilities, and guarantee on-time filing',
    icon: Landmark,
    color: 'from-violet-600 to-purple-600',
    steps: [
      {
        id: 'gst-1',
        stepNumber: '01',
        title: 'Calculate Monthly Output Tax Liability',
        description:
          'Track total taxable turnover across CGST, SGST, and IGST from recorded outward invoices and sales transactions.',
        proTip: 'Maintain separate ledger records for intra-state vs inter-state sales to ensure accurate tax classification.',
      },
      {
        id: 'gst-2',
        stepNumber: '02',
        title: 'Reconcile Claimable Input Tax Credit (ITC)',
        description:
          'Ensure every vendor purchase invoice has a valid GSTIN recorded so you can claim 100% of eligible Input Tax Credit.',
        proTip: 'Unclaimed ITC directly reduces your cash balance. Match purchase bills against GSTR-2B monthly.',
        actionLabel: 'Audit Expense GSTINs',
        actionTo: '/expenses',
      },
      {
        id: 'gst-3',
        stepNumber: '03',
        title: 'Monitor GSTR-1 & GSTR-3B Due Dates',
        description:
          'Check upcoming filing deadlines (GSTR-1 by 11th, GSTR-3B by 20th) to avoid 18% p.a. interest penalties and daily late fees.',
        proTip: 'Set automated calendar alerts 5 days prior to filing deadlines.',
        actionLabel: 'Check Alerts',
        actionTo: '/alerts',
      },
      {
        id: 'gst-4',
        stepNumber: '04',
        title: 'Generate Tax Summary & Record Payment Challan',
        description:
          'Compute Net Tax Payable (Output Tax minus ITC). Once payment is processed on the GST portal, mark the record as Paid.',
        proTip: 'A spotless GST filing record is a top criterion banks use for fast MSME loan approvals.',
        actionLabel: 'Check Loan Score',
        actionTo: '/loan-readiness',
      },
    ],
  },

  loans: {
    title: 'Loans & Debt Service Management',
    subtitle: 'Optimize debt leverage, track EMI schedules, and simulate prepayment savings',
    icon: Banknote,
    color: 'from-emerald-600 to-blue-600',
    steps: [
      {
        id: 'loan-1',
        stepNumber: '01',
        title: 'Record Active Loan & Working Capital Lines',
        description:
          'Add term loans, machinery loans, overdrafts, and credit lines with principal, interest rate, EMI amount, and tenure.',
        proTip: 'Keep loan schedules updated to get precise monthly debt service obligations.',
      },
      {
        id: 'loan-2',
        stepNumber: '02',
        title: 'Monitor Debt-Service Coverage Ratio (DSCR)',
        description:
          'Verify that monthly operating profit comfortably covers total EMI commitments. Healthy MSMEs maintain a DSCR of 1.5x or higher.',
        proTip: 'If your monthly EMIs exceed 35% of monthly revenue, consider tenure restructuring with your lender.',
        actionLabel: 'Review Health Ratio',
        actionTo: '/financial-health',
      },
      {
        id: 'loan-3',
        stepNumber: '03',
        title: 'Track Upcoming EMI Due Dates',
        description:
          'Ensure sufficient liquidity in your servicing bank account at least 2 days prior to auto-debit dates to avoid bounce penalties and CIBIL score hits.',
        proTip: 'A single EMI bounce can lower your credit score by 40+ points for up to 24 months.',
      },
      {
        id: 'loan-4',
        stepNumber: '04',
        title: 'Simulate Prepayment & Interest Savings',
        description:
          'Evaluate prepaying high-interest tranches using surplus operational cash flow to dramatically reduce total interest paid.',
        proTip: 'Prepaying even 1 extra EMI per year can shave 2–3 years off a 7-year term loan.',
        actionLabel: 'View Surplus Cash',
        actionTo: '/cash-flow',
      },
    ],
  },

  'cash-flow': {
    title: '30-Day Cash Flow Forecasting & Runway',
    subtitle: 'Predict future liquidity dips, analyze inflows vs outflows, and protect your runway',
    icon: TrendingUp,
    color: 'from-blue-600 to-indigo-600',
    steps: [
      {
        id: 'cf-1',
        stepNumber: '01',
        title: 'Analyze Historical Daily Inflows & Outflows',
        description:
          'Review historical net cash patterns over the past 30–90 days to identify recurring peaks (sales cycles) and troughs (payroll, rent, tax).',
        proTip: 'Identify the exact day of the month when your cash balance hits its lowest point.',
      },
      {
        id: 'cf-2',
        stepNumber: '02',
        title: 'Evaluate 30-Day Machine Learning Forecast',
        description:
          'Inspect the forward-looking trend line with upper and lower confidence intervals generated by our predictive models.',
        proTip: 'The model factors in invoice due dates, recurring expenses, and historical collection velocity.',
      },
      {
        id: 'cf-3',
        stepNumber: '03',
        title: 'Identify Projected Cash Dips in Advance',
        description:
          'Check if the forecast projects a minimum daily balance below your safety threshold. Take preventive action 2–3 weeks early.',
        proTip: 'When a cash dip is forecasted, accelerate pending customer collections or delay non-urgent capex.',
        actionLabel: 'Accelerate Invoices',
        actionTo: '/invoices',
      },
      {
        id: 'cf-4',
        stepNumber: '04',
        title: 'Deploy Surplus Liquidity into Yield Sweep Accounts',
        description:
          'When positive net cash flow is projected, keep 2 months OpEx as buffer and deploy the excess into high-yield sweep or supplier discounts.',
        proTip: 'Supplier early payment discounts (e.g. 2% Net-10) offer an effective annual return of 36% risk-free.',
        actionLabel: 'Strategic Recommendations',
        actionTo: '/recommendations',
      },
    ],
  },

  'risk-analysis': {
    title: 'Financial Risk & Anomaly Radar',
    subtitle: 'Proactively detect liquidity shortfalls, debtor concentration, and debt stress',
    icon: ShieldAlert,
    color: 'from-rose-600 to-red-600',
    steps: [
      {
        id: 'risk-1',
        stepNumber: '01',
        title: 'Scan Active Critical & High Risks',
        description:
          'Examine the real-time risk radar. Risks are classified into Critical, High, Medium, and Low severity based on potential financial loss.',
        proTip: 'Address Critical risks immediately to avoid operational disruption or legal exposure.',
      },
      {
        id: 'risk-2',
        stepNumber: '02',
        title: 'Inspect Risk Evidence & Root Causes',
        description:
          'Click on each risk card to read the underlying data evidence (e.g. "Customer X represents 45% of total receivables and is 30 days overdue").',
        proTip: 'Customer concentration above 30% creates severe vulnerability if that single buyer delays payment.',
      },
      {
        id: 'risk-3',
        stepNumber: '03',
        title: 'Apply AI-Recommended Mitigation Steps',
        description:
          'Follow the concrete action plan generated for each risk (e.g. diversify buyer base, establish invoice factoring, renegotiate EMI).',
        proTip: 'Mitigating risks directly improves your MSME Loan Readiness Score.',
        actionLabel: 'Check Loan Score',
        actionTo: '/loan-readiness',
      },
      {
        id: 'risk-4',
        stepNumber: '04',
        title: 'Set Up Automated Risk Alert Triggers',
        description:
          'Ensure threshold alerts are active so you receive immediate notification when cash reserves drop or debtors exceed grace periods.',
        proTip: 'Configure email and in-app alerts in Settings for 24/7 monitoring.',
        actionLabel: 'Configure Alerts',
        actionTo: '/settings',
      },
    ],
  },

  'loan-readiness': {
    title: 'MSME Loan Readiness & Bank Underwriting Score',
    subtitle: 'Prepare your business for seamless bank financing, working capital, and CGTMSE loans',
    icon: Gauge,
    color: 'from-violet-600 to-indigo-600',
    steps: [
      {
        id: 'lr-1',
        stepNumber: '01',
        title: 'Check Your Consolidated Readiness Score (0–100)',
        description:
          'Review your overall bankability rating. Scores > 75 qualify for prime interest rates; 60–74 are eligible with collateral; < 60 need pre-application optimization.',
        proTip: 'Banks use these exact underwriting formulas to evaluate debt servicing capacity.',
      },
      {
        id: 'lr-2',
        stepNumber: '02',
        title: 'Evaluate the 6 Bank Underwriting Criteria',
        description:
          'Review your status across: Revenue Consistency, Debt-to-Income, Cash Flow Stability, GST Filing Regularity, Business Vintage, and Margin Strength.',
        proTip: 'Flawless GST compliance and low overdue receivables provide the quickest boost to your readiness score.',
      },
      {
        id: 'lr-3',
        stepNumber: '03',
        title: 'Follow the Pre-Application Improvement Roadmap',
        description:
          'Implement the step-by-step guidance provided for each weak factor before submitting loan applications to avoid lender rejections.',
        proTip: 'Applying with a strong dossier typically cuts loan processing time from 4 weeks to 5 days.',
        actionLabel: 'Review AI Action Plan',
        actionTo: '/recommendations',
      },
      {
        id: 'lr-4',
        stepNumber: '04',
        title: 'Export Banker-Ready Financial Dossier',
        description:
          'Generate and export a comprehensive, audited financial report summary to submit directly to your relationship manager or NBFC.',
        proTip: 'Include your 6-month P&L, Cash Flow Forecast, and Health Score in the application packet.',
        actionLabel: 'Export PDF Dossier',
        actionTo: '/reports',
      },
    ],
  },

  'ai-cfo': {
    title: 'Conversational AI CFO Advisory',
    subtitle: 'Ask strategic questions, simulate financial moves, and analyze uploaded documents',
    icon: BrainCircuit,
    color: 'from-blue-600 to-violet-600',
    steps: [
      {
        id: 'cfo-1',
        stepNumber: '01',
        title: 'Select AI Engine (Google Gemini / OpenAI)',
        description:
          'Google Gemini 3.6 Flash is the primary high-speed intelligence engine, with OpenAI GPT-4.1 Mini as intelligent failover. Both use verified ledger context.',
        proTip: 'AI responses are 100% grounded in your actual MongoDB financial records—no hallucinated numbers.',
      },
      {
        id: 'cfo-2',
        stepNumber: '02',
        title: 'Ask High-Impact Financial Questions',
        description:
          'Use natural language: "What should I do with my surplus cash?", "How can I cut expenses by 10%?", or "Which invoices are at risk of default?".',
        proTip: 'Click any of the suggested question chips below the chat box for instant analysis.',
      },
      {
        id: 'cfo-3',
        stepNumber: '03',
        title: 'Attach Receipts, Bills, or Bank Statements',
        description:
          'Click the paperclip icon to attach PDF/image invoices, balance sheets, or tax challans (up to 15 MB) for instant multimodal breakdown.',
        proTip: 'The vision model can extract line items and flag discrepancies against your ledgers.',
      },
      {
        id: 'cfo-4',
        stepNumber: '04',
        title: 'Explore Suggested Follow-Up Actions',
        description:
          'Click the contextual follow-up chips at the bottom of AI responses to dive deeper into scenario modeling, pricing tweaks, or debt reduction.',
        proTip: 'Save key AI action plans into your weekly execution checklist.',
        actionLabel: 'View Recommendations',
        actionTo: '/recommendations',
      },
    ],
  },

  recommendations: {
    title: 'AI Strategic Recommendations Command Hub',
    subtitle: 'Turn financial telemetry into high-impact capital deployment, revenue growth, and cost savings',
    icon: Sparkles,
    color: 'from-blue-600 to-indigo-600',
    steps: [
      {
        id: 'rec-1',
        stepNumber: '01',
        title: 'Review the 4 Strategic Financial Pillars',
        description:
          'Examine strategic guidance across: (1) Money Allocation (surplus & sweep), (2) Revenue Growth & Receivables, (3) Cost Optimization, and (4) Debt Strategy.',
        proTip: 'Review total potential cash unlocked and monthly cost savings identified in the summary bar.',
      },
      {
        id: 'rec-2',
        stepNumber: '02',
        title: 'Use Preset Strategy Chips or Ask Custom Goals',
        description:
          'Click one of the strategic prompts (e.g. "Maximize Working Capital", "Cut Discretionary Spend", "Prepare for Bank Loan") or type your custom goal.',
        proTip: 'Gemini and OpenAI analyze your entire telemetry to formulate bespoke action items in seconds.',
      },
      {
        id: 'rec-3',
        stepNumber: '03',
        title: 'Filter & Prioritize High-Impact Actions',
        description:
          'Filter by Category (Cash Flow, Revenue, Expenses, Debt, Tax) and Priority (Critical, High, Medium, Low) to structure your team’s weekly focus.',
        proTip: 'Focus on "Critical" items with high estimated INR impact value first.',
      },
      {
        id: 'rec-4',
        stepNumber: '04',
        title: 'Execute, Acknowledge & Track Realized ROI',
        description:
          'Click "Acknowledge" when starting work on a recommendation, and "Mark as Completed" once implemented to build your historical ROI track record.',
        proTip: 'Refresh recommendations weekly as new transactions and invoices are logged.',
      },
    ],
  },

  alerts: {
    title: 'Smart Financial Trigger Alerts',
    subtitle: 'Real-time notifications on threshold breaches, overdue invoices, and compliance deadlines',
    icon: Bell,
    color: 'from-amber-600 to-red-600',
    steps: [
      {
        id: 'alt-1',
        stepNumber: '01',
        title: 'Review Active Unresolved Alerts',
        description:
          'Examine incoming alerts categorized by severity: Critical (immediate cash risk), High (overdue invoices, tax deadlines), and Medium (spend spikes).',
        proTip: 'Red badges indicate items requiring same-day executive attention.',
      },
      {
        id: 'alt-2',
        stepNumber: '02',
        title: 'Drill Down to the Originating Ledger Record',
        description:
          'Click on an alert to jump directly to the relevant Invoice, Transaction, Loan EMI, or GST record causing the trigger.',
        proTip: 'Direct navigation saves time hunting through spreadsheet rows.',
      },
      {
        id: 'alt-3',
        stepNumber: '03',
        title: 'Resolve & Clear Addressed Alerts',
        description:
          'Once the corrective action is completed (e.g. payment received, GST filed, EMI cleared), mark the alert as Resolved.',
        proTip: 'A clean alerts dashboard signifies smooth, risk-free business operations.',
      },
      {
        id: 'alt-4',
        stepNumber: '04',
        title: 'Customize Alert Trigger Thresholds in Settings',
        description:
          'Adjust minimum cash balance limits, invoice overdue grace days, and notification channels (email/SMS) to match your business rhythm.',
        proTip: 'Set cash balance alerts to trigger when reserves drop below 30 days of OpEx.',
        actionLabel: 'Alert Settings',
        actionTo: '/settings',
      },
    ],
  },

  reports: {
    title: 'Executive Financial Reports & Audit Export',
    subtitle: 'Generate professional P&L, Cash Flow, and Balance Sheet reports with 1-click PDF export',
    icon: FileBarChart,
    color: 'from-blue-600 to-indigo-600',
    steps: [
      {
        id: 'rep-1',
        stepNumber: '01',
        title: 'Select Report Scope & Reporting Period',
        description:
          'Choose between Executive Summary, Profit & Loss (P&L), Cash Flow Statement, or Loan Readiness Dossier across Monthly, Quarterly, or Custom dates.',
        proTip: 'Quarterly reports provide the best bird-eye view of seasonal MSME demand cycles.',
      },
      {
        id: 'rep-2',
        stepNumber: '02',
        title: 'Review Executive Commentary & Charts',
        description:
          'Inspect visual breakdown charts, revenue trends, expense ratios, and key balance sheet indicators before generating final output.',
        proTip: 'Ensure all bank transactions and invoices for the period have been reconciled.',
        actionLabel: 'Check Transactions',
        actionTo: '/transactions',
      },
      {
        id: 'rep-3',
        stepNumber: '03',
        title: 'Export Audit-Ready PDF or Excel Sheets',
        description:
          'Download professional, high-resolution PDF reports formatted with institutional styling ready for board members, CA auditors, or bank managers.',
        proTip: 'PDF exports include verification timestamps and executive summary notes.',
      },
      {
        id: 'rep-4',
        stepNumber: '04',
        title: 'Archive Historical Reports for Tax & Compliance',
        description:
          'Maintain a permanent digital archive of signed reports to satisfy 6-year statutory GST and Income Tax audit requirements.',
        proTip: 'Use report comparisons to highlight year-over-year revenue and margin growth.',
      },
    ],
  },

  history: {
    title: 'Audit Trail & Immutable Activity Logs',
    subtitle: 'Verify system events, import histories, AI runs, and user actions for full transparency',
    icon: History,
    color: 'from-slate-600 to-slate-800',
    steps: [
      {
        id: 'his-1',
        stepNumber: '01',
        title: 'Track System Events & Activity Feeds',
        description:
          'View every data upload, recommendation generation, invoice status update, and configuration change with exact timestamps and user IDs.',
        proTip: 'Immutable audit logs provide complete transparency and accountability.',
      },
      {
        id: 'his-2',
        stepNumber: '02',
        title: 'Filter by Entity Type & Event Status',
        description:
          'Filter logs by Invoices, Expenses, Transactions, Recommendations, AI Chat, or Authentication to audit specific workflows.',
        proTip: 'Quickly find failed import runs to review row-level validation errors.',
      },
      {
        id: 'his-3',
        stepNumber: '03',
        title: 'Inspect JSON Event Payloads & Telemetry',
        description:
          'Click "Details" on any history entry to inspect the exact payload, row counts, model engines used, and database record IDs.',
        proTip: 'Useful for verifying which AI model generated specific strategic recommendations.',
      },
      {
        id: 'his-4',
        stepNumber: '04',
        title: 'Ensure Data Integrity & Security Compliance',
        description:
          'Regularly audit user access logs and batch operations to maintain enterprise-grade security and data hygiene.',
        proTip: 'All events are permanently retained for statutory compliance.',
      },
    ],
  },

  profile: {
    title: 'MSME Business Profile & Company Identity',
    subtitle: 'Manage legal entity details, GSTIN, PAN, banking accounts, and fiscal settings',
    icon: Building2,
    color: 'from-blue-600 to-cyan-600',
    steps: [
      {
        id: 'pro-1',
        stepNumber: '01',
        title: 'Verify Legal Company Name & Registration',
        description:
          'Enter your registered MSME/Udyam entity name, business type (Sole Proprietorship, LLP, Pvt Ltd), and founding vintage.',
        proTip: 'Accurate business vintage directly feeds into your bank loan readiness evaluation.',
      },
      {
        id: 'pro-2',
        stepNumber: '02',
        title: 'Configure GSTIN, PAN & Tax Classifications',
        description:
          'Record your 15-digit GSTIN and PAN. This enables automatic GST liability tracking and accurate invoice headers.',
        proTip: 'Double-check GSTIN state code to ensure accurate IGST vs CGST/SGST ledger segregation.',
        actionLabel: 'GST Dashboard',
        actionTo: '/gst',
      },
      {
        id: 'pro-3',
        stepNumber: '03',
        title: 'Set Industry Sector & Turnover Range',
        description:
          'Select your primary MSME industry (Manufacturing, Retail, IT/Services, Healthcare, Logistics) for relevant ratio benchmarking.',
        proTip: 'Industry classification tailors AI recommendations to your specific sector norms.',
      },
      {
        id: 'pro-4',
        stepNumber: '04',
        title: 'Link Primary Bank Accounts & Fiscal Calendar',
        description:
          'Specify your primary operating bank account and fiscal year start (e.g. April 1 for Indian financial year) to calibrate metrics.',
        proTip: 'Keep profile data updated to ensure PDF reports reflect official legal headers.',
        actionLabel: 'Export Reports',
        actionTo: '/reports',
      },
    ],
  },

  settings: {
    title: 'AI Intelligence & System Preferences',
    subtitle: 'Configure primary AI models (Gemini / OpenAI), notification triggers, and security',
    icon: SettingsIcon,
    color: 'from-slate-700 to-indigo-700',
    steps: [
      {
        id: 'set-1',
        stepNumber: '01',
        title: 'Select Primary AI Narrative Engine',
        description:
          'Choose Google Gemini (Default / Recommended - Fast, Multimodal, Grounded) or OpenAI GPT-4.1 Mini as secondary narrative provider.',
        proTip: 'The backend tries your primary provider first, with automatic failover to preserve AI-first reliability.',
        actionLabel: 'Chat with AI CFO',
        actionTo: '/ai-cfo',
      },
      {
        id: 'set-2',
        stepNumber: '02',
        title: 'Configure Notification Channels & Alerts',
        description:
          'Enable email updates, weekly financial digests, and urgent SMS alerts for critical risk spikes and upcoming tax deadlines.',
        proTip: 'Weekly digests deliver a consolidated summary of your cash runway and top priorities every Monday.',
      },
      {
        id: 'set-3',
        stepNumber: '03',
        title: 'Set Localization, Currency & Theme',
        description:
          'Toggle between Light and Dark mode, choose default currency (INR, USD, EUR), and set your local timezone (Asia/Kolkata).',
        proTip: 'Dark mode reduces eye strain during evening financial review sessions.',
      },
      {
        id: 'set-4',
        stepNumber: '04',
        title: 'Save Settings & Verify Live Data Sync',
        description:
          'Click Save Settings to apply changes immediately. Data is encrypted and synchronised in real-time across all dashboard modules.',
        proTip: 'Settings are stored securely and persist across all team login sessions.',
      },
    ],
  },
};

interface SegmentStepsGuideProps {
  segment: SegmentId;
  defaultExpanded?: boolean;
}

export default function SegmentStepsGuide({
  segment,
  defaultExpanded = true,
}: SegmentStepsGuideProps) {
  const config = SEGMENT_GUIDES[segment];
  const storageKey = `aicfo_guide_${segment}_expanded`;
  const completedKey = `aicfo_guide_${segment}_completed`;

  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? JSON.parse(saved) : defaultExpanded;
    } catch {
      return defaultExpanded;
    }
  });

  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(completedKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(expanded));
    } catch {
      // ignore
    }
  }, [expanded, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(completedKey, JSON.stringify(completedSteps));
    } catch {
      // ignore
    }
  }, [completedSteps, completedKey]);

  if (!config) return null;

  const Icon = config.icon;
  const totalSteps = config.steps.length;
  const completedCount = completedSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  const toggleStepCompleted = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="rounded-2xl border border-blue-100/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header Banner */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-sm shrink-0`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Step-by-Step Workflow Guide
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {completedCount}/{totalSteps} steps completed
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate mt-0.5">
              {config.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Mini progress bar */}
          <div className="hidden sm:flex items-center gap-2 w-28">
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 w-7 text-right">
              {progressPercent}%
            </span>
          </div>

          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label={expanded ? 'Collapse Guide' : 'Expand Guide'}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Steps Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="border-t border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-50/40 via-white to-slate-50/30 dark:from-slate-950/40 dark:via-slate-900 dark:to-slate-950/30 space-y-5">
              {/* Instructions banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <p>{config.subtitle}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Click checkboxes to track your workflow progress</span>
                </div>
              </div>

              {/* Steps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {config.steps.map((step, idx) => {
                  const isCompleted = completedSteps.includes(step.id);
                  const isSelected = activeStepIndex === idx;

                  return (
                    <motion.div
                      key={step.id}
                      onClick={() => setActiveStepIndex(idx)}
                      whileHover={{ y: -2 }}
                      className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm ring-1 ring-blue-500/30'
                          : isCompleted
                            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                            : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-blue-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Top row: Step number + checkbox */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white'
                                  : isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {step.stepNumber}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              Step {idx + 1}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => toggleStepCompleted(step.id, e)}
                            className={`p-1 rounded-md transition ${
                              isCompleted
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                            title={isCompleted ? 'Mark as Incomplete' : 'Mark as Done'}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>
                        </div>

                        {/* Title */}
                        <h4
                          className={`text-sm font-semibold mb-1.5 leading-snug ${
                            isCompleted
                              ? 'text-slate-700 dark:text-slate-300 line-through opacity-80'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {step.title}
                        </h4>

                        {/* Description */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                          {step.description}
                        </p>
                      </div>

                      {/* Pro Tip & Action Footer */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-100/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 leading-tight">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <span>{step.proTip}</span>
                        </div>

                        {step.actionLabel && (
                          <div className="pt-1">
                            {step.actionTo ? (
                              <Link
                                to={step.actionTo}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition group"
                              >
                                {step.actionLabel}
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </Link>
                            ) : step.actionOnClick ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  step.actionOnClick?.();
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition group"
                              >
                                {step.actionLabel}
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom Quick Help Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    Need custom financial help for this segment? Ask your AI CFO assistant anytime.
                  </span>
                </div>

                <Link
                  to="/ai-cfo"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  Ask AI CFO about {config.title}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
