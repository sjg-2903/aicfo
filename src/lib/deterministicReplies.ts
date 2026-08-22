/**
 * Vast deterministic financial intelligence repository and response generator.
 *
 * Grounded in the business's actual financial state (KPIs, cash flow, receivables,
 * expenses, loans, risks, health score), covering all possible outcomes and questions:
 * - What shall I do with my money (capital allocation, cash reserve, surplus deployment)
 * - How to make more money (revenue growth, pricing power, 80/20 customer concentration, receivables recovery)
 * - How to cut expenses (category audits, vendor renegotiations, eliminating waste)
 * - Cash flow forecasting, runway, and liquidity protection
 * - Debt, EMIs, refinancing, and interest savings
 * - Loan readiness and commercial banking eligibility
 * - Invoices, receivables, and debtor collection workflows
 * - GST, statutory tax compliance, and ITC optimization
 * - Profitability, unit economics, and break-even analysis
 */

import { CURRENCY } from './format';
import {
  mockKpiSummary,
  mockHealthScore,
  mockFinancialHealth,
  mockInvoices,
  mockExpenses,
  mockLoans,
  mockRisks,
  mockLoanReadiness,
} from '@/mock';

export interface FinancialContext {
  revenue: number;
  expenses: number;
  netProfit: number;
  cashBalance: number;
  receivables: number;
  receivablesOverdue: number;
  debt: number;
  monthlyEmi: number;
  healthScore: number;
  healthLabel: string;
  activeRisksCount: number;
}

export function getDefaultContext(): FinancialContext {
  return {
    revenue: mockKpiSummary.revenue.current,
    expenses: mockKpiSummary.expenses.current,
    netProfit: mockKpiSummary.netProfit.current,
    cashBalance: mockKpiSummary.cashBalance.current,
    receivables: mockKpiSummary.receivables.current,
    receivablesOverdue: mockKpiSummary.receivables.overdue,
    debt: mockKpiSummary.debt.current,
    monthlyEmi: mockKpiSummary.debt.upcomingEmi,
    healthScore: mockHealthScore.score,
    healthLabel: mockHealthScore.label,
    activeRisksCount: mockRisks.filter((r) => r.status === 'active').length,
  };
}

export function getDeterministicReply(rawQuestion: string, customCtx?: Partial<FinancialContext>): string {
  const q = rawQuestion.toLowerCase().trim();
  const ctx: FinancialContext = { ...getDefaultContext(), ...customCtx };

  const {
    revenue,
    expenses,
    netProfit,
    cashBalance,
    receivables,
    receivablesOverdue,
    debt,
    monthlyEmi,
    healthScore,
    healthLabel,
    activeRisksCount,
  } = ctx;

  const runwayMonths = expenses > 0 ? (cashBalance / expenses).toFixed(1) : '3.0';
  const netMarginPct = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '15.0';
  const emiRatio = revenue > 0 ? ((monthlyEmi / revenue) * 100).toFixed(1) : '8.0';
  const opReserve = expenses * 2.0;
  const deployableSurplus = Math.max(0, cashBalance - opReserve);

  // 1. WHAT TO DO WITH MONEY / SURPLUS CASH / CAPITAL ALLOCATION
  if (
    q.includes('what shall i do with my money') ||
    q.includes('what to do with my money') ||
    q.includes('what to do with money') ||
    q.includes('what should i do with my money') ||
    q.includes('where to invest') ||
    q.includes('how to deploy') ||
    q.includes('surplus cash') ||
    q.includes('invest surplus') ||
    q.includes('deploy money') ||
    q.includes('capital allocation') ||
    q.includes('idle cash') ||
    q.includes('allocate funds') ||
    q.includes('manage surplus') ||
    q.includes('cash allocation')
  ) {
    return `## Strategic Financial Recommendation: Capital Allocation & Money Deployment

Your current cash balance is **${CURRENCY(cashBalance)}**, with monthly operating expenses of **${CURRENCY(expenses)}** and net profit of **${CURRENCY(netProfit)}**.

### 1. Maintain a 2-Month Operating Liquidity Reserve
- **Target Reserve:** **${CURRENCY(opReserve)}** (2 months of fixed & variable OpEx).
- **Current Runway:** You currently hold **${runwayMonths} months** of operating runway.
- **Recommended Vehicle:** Park this buffer in an automated sweep-in account or overnight liquid mutual fund earning **6.5%–7.2% p.a.** with T+0 instant liquidity.

### 2. High-ROI Working Capital Optimization
- **Deployable Surplus:** **${CURRENCY(deployableSurplus)}** is available above your core safety reserve.
- **Supplier Early-Payment Discounts (Dynamic Discounting):** Negotiate a 2/10 Net 30 agreement with primary raw material vendors. Paying invoices within 10 days in exchange for a 2% discount yields an annualized return of **~36.7% APR**, significantly higher than bank deposits.
- **Bulk Purchasing Arbitrage:** Pre-commit cash for high-demand inventory batches to capture 5%–8% volume rebates before seasonal price revisions.

### 3. Debt Reduction vs. Growth Reinvestment
- **Outstanding Debt:** **${CURRENCY(debt)}** (Monthly EMI: **${CURRENCY(monthlyEmi)}**).
- **Strategy:** If any of your commercial loans carry interest rates above 10.5%, prepaying principal chunks saves immediate compounding interest and strengthens your Debt Service Coverage Ratio (DSCR).

### 4. 4-Step Capital Allocation Breakdown
1. **${CURRENCY(Math.min(cashBalance, opReserve))}** → Reserved strictly for payroll, rent, and vendor obligations.
2. **${CURRENCY(deployableSurplus * 0.5)}** → Deployed into fast-moving inventory & supplier early-payment discounts.
3. **${CURRENCY(deployableSurplus * 0.3)}** → Retained for quarterly advance tax & loan prepayment buffer.
4. **${CURRENCY(deployableSurplus * 0.2)}** → Reinvested into customer acquisition & sales automation.`;
  }

  // 2. HOW TO MAKE MORE MONEY / REVENUE GROWTH / PROFIT MAXIMIZATION
  if (
    q.includes('how can i make more money') ||
    q.includes('how to make more money') ||
    q.includes('make more money') ||
    q.includes('increase revenue') ||
    q.includes('increase profit') ||
    q.includes('how to grow revenue') ||
    q.includes('how to make profit') ||
    q.includes('boost sales') ||
    q.includes('grow my business') ||
    q.includes('scale business') ||
    q.includes('more money') ||
    q.includes('maximize profit') ||
    q.includes('revenue growth') ||
    q.includes('improve margin') ||
    q.includes('make more profit')
  ) {
    const recoverable = receivablesOverdue > 0 ? receivablesOverdue : receivables;
    const priceHikeGain = revenue * 0.04;

    return `## Strategic Growth Blueprint: How to Make More Money & Expand Profitability

With your current monthly revenue at **${CURRENCY(revenue)}** and net profit margin at **${netMarginPct}%**, here is a prioritized 5-pillar playbook to generate more cash and higher earnings:

### 1. Recover Stuck Cash from Overdue Receivables
- You currently have **${CURRENCY(receivables)}** in total outstanding receivables, with **${CURRENCY(receivablesOverdue)}** overdue past credit terms.
- **Immediate Revenue Boost:** Recovering overdue accounts immediately infuses **${CURRENCY(recoverable)}** into your bank account without incurring interest or financing fees.
- **Action:** Send automated invoice reminders 3 days before due dates, and offer a 1.5% instant settlement discount for accounts cleared within 5 business days.

### 2. Implement Strategic Pricing (+3% to +5% Margin Expansion)
- A modest 4% price optimization across your non-commodity product lines generates **+${CURRENCY(priceHikeGain)}/month** straight to your bottom-line profit.
- **Action:** Segment your products by customer price sensitivity. Raise rates on specialized or differentiated offerings where switching friction is high.

### 3. Leverage the 80/20 High-Margin Customer Rule
- Your top 20% of accounts generate ~80% of your net profits.
- **Action:** Introduce annual service contracts, volume retainers, or bundled priority delivery to increase customer lifetime value (LTV) and ensure predictable monthly recurring cash inflows.

### 4. Optimize Procurement & Direct Cost of Goods Sold (COGS)
- Total expenses are **${CURRENCY(expenses)}**.
- Consolidate purchases with primary vendors to negotiate a 3%–5% volume rebate.
- Enforce strict inventory turnover metrics to eliminate dead stock carrying costs.

### 5. Shorten Cash Collection Cycles
- Shift new client contracts to milestone billing (40% advance deposit, 40% on dispatch, 20% on delivery) instead of Net-60 settlement.
- Add instant digital payment links (UPI, QR code, netbanking) to all invoice templates.

**Projected Result:** Executing these steps can expand your net profit by **15%–30%** within 90 days.`;
  }

  // 3. EXPENSES & COST CUTTING
  if (
    q.includes('expense') ||
    q.includes('spend') ||
    q.includes('cost') ||
    q.includes('cut expense') ||
    q.includes('reduce cost') ||
    q.includes('overspending') ||
    q.includes('where is my money going') ||
    q.includes('lower expense') ||
    q.includes('save money') ||
    q.includes('spending')
  ) {
    const topExpList = mockExpenses
      .slice(0, 5)
      .map((e) => `- **${e.date}** — ${e.description} (${e.category}): **${CURRENCY(e.amount)}**`)
      .join('\n');

    return `## Expense Analysis & Cost Reduction Opportunities

- **Total Current Expenses:** **${CURRENCY(expenses)}**
- **Monthly Net Profit:** **${CURRENCY(netProfit)}**

### Top Recorded Expenses:
${topExpList}

### Key Cost Optimization Actions:
1. **Audit Recurring Subscriptions & Fixed Retainers:** Review all software licenses, cloud services, and agency retainers to eliminate duplicate or idle subscriptions.
2. **Benchmark Vendor Pricing:** Solicit competing quotes for raw materials, logistics, and warehousing to negotiate 5%–8% rate reductions.
3. **Control Discretionary Outflows:** Implement two-tier authorization for all non-essential expenditures exceeding ₹25,000.
4. **Estimated Monthly Savings:** Reducing operating costs by just 6% recovers **${CURRENCY(expenses * 0.06)}/month** in direct net cash.`;
  }

  // 4. RECEIVABLES & DEBTORS
  if (
    q.includes('owe') ||
    q.includes('receivab') ||
    q.includes('invoice') ||
    q.includes('debtor') ||
    q.includes('unpaid') ||
    q.includes('pending payment') ||
    q.includes('who owes') ||
    q.includes('overdue') ||
    q.includes('collection') ||
    q.includes('collect')
  ) {
    const overdueInvoices = mockInvoices
      .filter((i) => i.status === 'overdue' || i.status === 'sent')
      .slice(0, 5)
      .map((i) => `- **${i.customer}** (${i.number}): **${CURRENCY(i.total - i.paid)}** (Due: **${i.dueDate}** | Status: **${i.status.toUpperCase()}**)`)
      .join('\n');

    return `## Accounts Receivable & Customer Invoicing Status

- **Total Outstanding Receivables:** **${CURRENCY(receivables)}**
- **Overdue Invoices Total:** **${CURRENCY(receivablesOverdue)}**

### Outstanding Invoices:
${overdueInvoices}

### Recommended Collection Protocol:
1. **Automated Reminders:** Trigger automated SMS/WhatsApp alerts 3 days before due date.
2. **Day 1–7 Post Due Date:** Direct phone outreach by accounts manager to confirm payment processing date.
3. **Day 15+ Overdue:** Pause credit terms and new shipments until outstanding balance is resolved.
4. **Incentivize Fast Settlement:** Offer a 1.5% discount for payments completed within 48 hours.`;
  }

  // 5. CASH FLOW, RUNWAY & FORECAST
  if (
    q.includes('cash') ||
    q.includes('flow') ||
    q.includes('shortage') ||
    q.includes('forecast') ||
    q.includes('runway') ||
    q.includes('burn rate') ||
    q.includes('liquidity') ||
    q.includes('bank balance')
  ) {
    return `## Cash Flow Health & 30-Day Forecast

- **Current Liquid Cash Balance:** **${CURRENCY(cashBalance)}**
- **Monthly Operating Expense Run-rate:** **${CURRENCY(expenses)}**
- **Operating Cash Runway:** **${runwayMonths} months**

### 30-Day Liquidity Outlook:
- **Projected Net Cash Flow:** **+${CURRENCY(netProfit)}**
- **Safety Threshold Status:** Balanced liquidity with adequate buffer for scheduled payroll and vendor payments.

### Strategic Recommendations:
1. **Buffer Maintenance:** Keep a strict floor of 2 months of operational expenses (**${CURRENCY(opReserve)}**) unencumbered.
2. **Working Capital Synchronization:** Align client credit periods (e.g. 15–30 days) with supplier payment terms (30–45 days) to ensure positive operational cash float.`;
  }

  // 6. LOANS, DEBT, EMI & REFINANCING
  if (
    (q.includes('loan') ||
      q.includes('debt') ||
      q.includes('emi') ||
      q.includes('borrow') ||
      q.includes('repay') ||
      q.includes('interest') ||
      q.includes('refinance')) &&
    !q.includes('ready') &&
    !q.includes('readiness')
  ) {
    const loanList = mockLoans
      .map((l) => `- **${l.type}** (${l.lender}): Outstanding **${CURRENCY(l.outstanding)}** @ ${l.rate}% p.a. | EMI: **${CURRENCY(l.emi)}**`)
      .join('\n');

    return `## Debt Structure & Loan Portfolio Overview

- **Total Outstanding Debt:** **${CURRENCY(debt)}**
- **Combined Monthly EMI:** **${CURRENCY(monthlyEmi)}**
- **EMI-to-Revenue Ratio:** **${emiRatio}%** (Healthy standard: < 30%)

### Active Loans:
${loanList}

### Debt Optimization Strategy:
1. **Target High-Interest Tranches:** Prioritize voluntary prepayments toward facilities with interest rates above 11% to reduce total interest outflow.
2. **Refinancing Review:** If your commercial credit rating has improved over the past 12 months, explore consolidating existing loans into a lower-rate term loan to lower monthly EMI burden by 10%–15%.`;
  }

  // 7. LOAN READINESS & BANK ELIGIBILITY
  if (
    q.includes('ready for loan') ||
    q.includes('loan readiness') ||
    q.includes('eligible for loan') ||
    q.includes('cibil') ||
    q.includes('apply for loan') ||
    q.includes('loan eligibility')
  ) {
    const suggList = mockLoanReadiness.suggestions.map((s, idx) => `${idx + 1}. ${s}`).join('\n');

    return `## Commercial Loan Readiness Assessment

- **Loan Readiness Score:** **${mockLoanReadiness.score}/100** (**${mockLoanReadiness.label}**)
- **Debt Service Coverage:** Stable operational profitability supporting debt service obligations.

### Recommended Steps to Maximize Approval & Minimize Interest Rates:
${suggList}

### Strategic Advice:
- Prefer collateral-free government-backed MSME credit schemes (e.g. CGTMSE) or Working Capital Overdraft facilities rather than high-interest unsecured merchant cash advances.`;
  }

  // 8. RISKS & THREAT MITIGATION
  if (q.includes('risk') || q.includes('threat') || q.includes('vulnerability') || q.includes('danger')) {
    const riskList = mockRisks
      .slice(0, 4)
      .map((r, idx) => `### ${idx + 1}. [${r.severity.toUpperCase()}] ${r.title}\n- **Evidence:** ${r.evidence}\n- **Action:** ${r.action}`)
      .join('\n\n');

    return `## Active Financial Risks & Threat Mitigation

- **Active Risks Detected:** **${activeRisksCount}**

${riskList}

### Key Mitigation Priorities:
1. Settle overdue tax/GST liabilities to eliminate statutory penalty compounding.
2. Maintain proactive receivables follow-ups to preserve liquidity.`;
  }

  // 9. GST & TAX COMPLIANCE
  if (q.includes('gst') || q.includes('tax') || q.includes('itc') || q.includes('gstr') || q.includes('compliance')) {
    return `## GST & Statutory Tax Optimization

- **Monthly Revenue Subject to GST:** **${CURRENCY(revenue)}**
- **Estimated Gross Output Tax (at 18% avg):** **~${CURRENCY(revenue * 0.18)}**

### Statutory Recommendations:
1. **Input Tax Credit (ITC) Matching:** Match all supplier invoices against GSTR-2B monthly to ensure no unclaimed ITC is lost.
2. **Timely Compliance:** Ensure GSTR-1 is filed by the 11th and GSTR-3B by the 20th to avoid 18% p.a. interest penalties and late filing fees.
3. **Advance Tax Reserve:** Automatically set aside 15% of monthly net profit into a dedicated tax reserve account to comfortably satisfy quarterly advance tax installments.`;
  }

  // 10. PROFITABILITY, MARGINS & UNIT ECONOMICS
  if (
    q.includes('profit') ||
    q.includes('margin') ||
    q.includes('ebitda') ||
    q.includes('break even') ||
    q.includes('gross margin') ||
    q.includes('net margin')
  ) {
    return `## Profitability & Margin Performance

| Metric | Amount | % of Revenue |
| :--- | ---: | ---: |
| **Gross Revenue** | **${CURRENCY(revenue)}** | 100.0% |
| **Operating Expenses** | **${CURRENCY(expenses)}** | ${((expenses / revenue) * 100).toFixed(1)}% |
| **Net Profit** | **${CURRENCY(netProfit)}** | **${netMarginPct}%** |

### Margin Improvement Levers:
- **Pricing:** A 3% price adjustment across core lines yields direct profit expansion.
- **Product Mix:** Discontinue or re-price low-margin custom work that consumes disproportionate labor hours.`;
  }

  // 11. DEFAULT / GENERAL BUSINESS OVERVIEW
  return `## Executive Financial Intelligence Overview

| Metric | Current Period | Status |
| :--- | ---: | :--- |
| **Revenue** | **${CURRENCY(revenue)}** | Healthy |
| **Expenses** | **${CURRENCY(expenses)}** | Controlled |
| **Net Profit** | **${CURRENCY(netProfit)}** | **${netMarginPct}% margin** |
| **Cash Balance** | **${CURRENCY(cashBalance)}** | **${runwayMonths} mo runway** |
| **Receivables** | **${CURRENCY(receivables)}** | **${CURRENCY(receivablesOverdue)} overdue** |
| **Debt** | **${CURRENCY(debt)}** | EMI: ${CURRENCY(monthlyEmi)}/mo |

### Financial Health Score: **${healthScore}/100** — **${healthLabel}**
${mockFinancialHealth.interpretation}

### Top 3 Strategic Recommendations:
1. **Recover Overdue Receivables:** Collect **${CURRENCY(receivablesOverdue)}** in overdue invoices to expand liquid working capital.
2. **Deploy Surplus Strategically:** Maintain **${CURRENCY(opReserve)}** as an operating reserve and allocate surplus cash into supplier early-payment discounts.
3. **Protect & Expand Margins:** Implement a 3%–5% targeted price revision on core products to accelerate net profitability.`;
}
