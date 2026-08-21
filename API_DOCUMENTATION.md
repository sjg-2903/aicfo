# AI CFO & Financial Advisor - API Documentation

This document defines all API contracts between the React frontend and the Python FastAPI backend.

## Base URL
```
{VITE_API_BASE_URL}  (e.g., http://localhost:8000)
```

## Authentication

All protected endpoints require an Authorization header:
```
Authorization: Bearer {access_token}
```

## Error Responses

All endpoints may return error responses with the following structure:

```json
{
  "detail": "Error message",
  "error_code": "ERROR_CODE",
  "status_code": 400|401|403|404|500
}
```

### Common Status Codes
- **200 OK** - Successful request
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid input
- **401 Unauthorized** - Missing or invalid token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "business_name": "My Business",
  "owner_name": "John Doe"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "business_name": "My Business",
    "owner_name": "John Doe"
  }
}
```

---

### POST /api/auth/login
Authenticate user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "business_name": "My Business",
    "owner_name": "John Doe"
  }
}
```

---

### POST /api/auth/logout
Logout the current user.

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

---

### GET /api/auth/me
Get current authenticated user profile.

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "business_name": "My Business",
  "owner_name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### POST /api/auth/forgot-password
Request password reset.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Password reset email sent"
}
```

---

### POST /api/auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

---

### POST /api/auth/refresh
Refresh access token.

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": { ... }
}
```

---

## Dashboard Endpoints

### GET /api/dashboard/summary
Get KPI summary for dashboard.

**Authentication:** Required

**Response (200):**
```json
{
  "revenue": {
    "current": 500000,
    "trend": 15.5,
    "comparison_period": "vs last month"
  },
  "expenses": {
    "current": 250000,
    "trend": -5.2,
    "comparison_period": "vs last month"
  },
  "net_profit": {
    "current": 250000,
    "trend": 25.0,
    "comparison_period": "vs last month"
  },
  "cash_balance": {
    "current": 1500000,
    "trend": 12.0,
    "comparison_period": "vs last month"
  },
  "outstanding_receivables": {
    "current": 150000,
    "trend": 8.5,
    "overdue_amount": 50000
  },
  "outstanding_debt": {
    "current": 500000,
    "upcoming_emi": 15000,
    "next_emi_date": "2024-02-15"
  }
}
```

---

### GET /api/dashboard/revenue-trend
Get revenue trend data.

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to fetch

**Response (200):**
```json
[
  {
    "date": "2024-01-01",
    "revenue": 45000,
    "target": 50000
  },
  {
    "date": "2024-01-02",
    "revenue": 52000,
    "target": 50000
  }
]
```

---

### GET /api/dashboard/cash-flow-trend
Get cash flow trend data.

**Query Parameters:**
- `days` (optional, default: 30)

**Response (200):**
```json
[
  {
    "date": "2024-01-01",
    "inflow": 100000,
    "outflow": 60000,
    "net_flow": 40000
  }
]
```

---

### GET /api/dashboard/expense-distribution
Get expense distribution by category.

**Query Parameters:**
- `days` (optional, default: 30)

**Response (200):**
```json
[
  {
    "category": "Salaries",
    "amount": 120000,
    "percentage": 48
  },
  {
    "category": "Rent",
    "amount": 60000,
    "percentage": 24
  }
]
```

---

### GET /api/dashboard/receivables-aging
Get receivables aging analysis.

**Response (200):**
```json
[
  {
    "age_bracket": "0-30 days",
    "count": 5,
    "amount": 50000
  },
  {
    "age_bracket": "31-60 days",
    "count": 3,
    "amount": 75000
  },
  {
    "age_bracket": "60+ days",
    "count": 2,
    "amount": 25000
  }
]
```

---

### GET /api/dashboard/loan-overview
Get loan and debt overview.

**Response (200):**
```json
{
  "total_loans": 2,
  "total_outstanding": 500000,
  "total_emi_monthly": 15000,
  "loans": [
    {
      "id": "loan_1",
      "name": "Business Loan - Bank XYZ",
      "outstanding": 300000,
      "emi": 10000
    },
    {
      "id": "loan_2",
      "name": "Term Loan - Bank ABC",
      "outstanding": 200000,
      "emi": 5000
    }
  ]
}
```

---

### GET /api/dashboard/forecast-30day
Get 30-day cash flow forecast.

**Query Parameters:**
- `days` (optional, default: 30)

**Response (200):**
```json
[
  {
    "date": "2024-01-15",
    "type": "historical",
    "opening_balance": 1500000,
    "inflow": 50000,
    "outflow": 30000,
    "closing_balance": 1520000
  },
  {
    "date": "2024-01-16",
    "type": "predicted",
    "opening_balance": 1520000,
    "inflow": 45000,
    "outflow": 32000,
    "closing_balance": 1533000,
    "confidence": 0.92
  }
]
```

---

### GET /api/dashboard/financial-health-score
Get financial health score and contributing factors.

**Response (200):**
```json
{
  "score": 75,
  "status": "good",
  "factors": [
    {
      "name": "Profitability",
      "weight": 0.3,
      "contribution": 85
    },
    {
      "name": "Cash Flow",
      "weight": 0.3,
      "contribution": 70
    },
    {
      "name": "Debt Management",
      "weight": 0.2,
      "contribution": 60
    },
    {
      "name": "Liquidity",
      "weight": 0.2,
      "contribution": 75
    }
  ]
}
```

---

## Transaction Endpoints

### GET /api/transactions
Get transactions with pagination and filtering.

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `page_size` (optional, default: 20) - Items per page
- `type` (optional) - "income" or "expense"
- `category` (optional) - Transaction category
- `start_date` (optional) - ISO date string
- `end_date` (optional) - ISO date string
- `payment_method` (optional)
- `sort_by` (optional, default: "date")
- `sort_order` (optional, default: "desc") - "asc" or "desc"

**Response (200):**
```json
{
  "data": [
    {
      "id": "txn_1",
      "date": "2024-01-15",
      "description": "Client payment",
      "amount": 50000,
      "type": "income",
      "category": "Sales",
      "payment_method": "bank_transfer",
      "reference_id": "INV-001",
      "notes": "Payment for project XYZ",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

---

### GET /api/transactions/{id}
Get transaction details.

**Authentication:** Required

**Response (200):**
```json
{
  "id": "txn_1",
  "date": "2024-01-15",
  "description": "Client payment",
  "amount": 50000,
  "type": "income",
  "category": "Sales",
  "payment_method": "bank_transfer",
  "reference_id": "INV-001",
  "notes": "Payment for project XYZ",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### POST /api/transactions
Create new transaction.

**Authentication:** Required

**Request:**
```json
{
  "date": "2024-01-15",
  "description": "Client payment",
  "amount": 50000,
  "type": "income",
  "category": "Sales",
  "payment_method": "bank_transfer",
  "reference_id": "INV-001",
  "notes": "Payment for project XYZ"
}
```

**Response (201):**
```json
{
  "id": "txn_1",
  "date": "2024-01-15",
  "description": "Client payment",
  "amount": 50000,
  "type": "income",
  "category": "Sales",
  "payment_method": "bank_transfer",
  "reference_id": "INV-001",
  "notes": "Payment for project XYZ",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### PUT /api/transactions/{id}
Update transaction.

**Authentication:** Required

**Request:** (Same fields as POST, all optional)

**Response (200):** Updated transaction object

---

### DELETE /api/transactions/{id}
Delete transaction.

**Authentication:** Required

**Response (204):** No content

---

### POST /api/transactions/import
Import transactions from CSV.

**Authentication:** Required

**Request:** (Form data)
- `file` - CSV file with transaction data

**Response (200):**
```json
{
  "imported_count": 50,
  "errors": []
}
```

---

## Invoice Endpoints

### GET /api/invoices
Get invoices with pagination and filtering.

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1)
- `page_size` (optional, default: 20)
- `status` (optional) - "draft", "sent", "paid", "overdue", "cancelled"
- `customer_id` (optional)
- `start_date` (optional)
- `end_date` (optional)
- `sort_by` (optional, default: "invoice_date")
- `sort_order` (optional, default: "desc")

**Response (200):**
```json
{
  "data": [
    {
      "id": "inv_1",
      "invoice_number": "INV-2024-001",
      "customer_id": "cust_1",
      "customer_name": "ABC Corp",
      "customer_email": "contact@abc.com",
      "invoice_date": "2024-01-15",
      "due_date": "2024-02-15",
      "total_amount": 100000,
      "paid_amount": 50000,
      "outstanding_amount": 50000,
      "status": "partially_paid",
      "items": [
        {
          "id": "item_1",
          "description": "Consulting services",
          "quantity": 10,
          "unit_price": 10000,
          "amount": 100000
        }
      ],
      "notes": "Net payment terms",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

---

### GET /api/invoices/{id}
Get invoice details.

**Authentication:** Required

**Response (200):** Single invoice object

---

### POST /api/invoices
Create new invoice.

**Authentication:** Required

**Request:**
```json
{
  "customer_name": "ABC Corp",
  "customer_email": "contact@abc.com",
  "customer_id": "cust_1",
  "invoice_date": "2024-01-15",
  "due_date": "2024-02-15",
  "items": [
    {
      "description": "Consulting services",
      "quantity": 10,
      "unit_price": 10000
    }
  ],
  "notes": "Net payment terms"
}
```

**Response (201):** Created invoice object

---

### PUT /api/invoices/{id}
Update invoice.

**Authentication:** Required

**Response (200):** Updated invoice object

---

### DELETE /api/invoices/{id}
Delete invoice.

**Authentication:** Required

**Response (204):** No content

---

### GET /api/invoices/{id}/pdf
Download invoice as PDF.

**Authentication:** Required

**Response (200):** PDF file (binary)

---

### PUT /api/invoices/{id}/send
Send invoice to customer.

**Authentication:** Required

**Response (200):** Updated invoice object

---

### PUT /api/invoices/{id}/mark-paid
Mark invoice as paid.

**Authentication:** Required

**Request:**
```json
{
  "paid_amount": 100000
}
```

**Response (200):** Updated invoice object

---

## Expense Endpoints

### GET /api/expenses
Get expenses with pagination and filtering.

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1)
- `page_size` (optional, default: 20)
- `category` (optional)
- `vendor` (optional)
- `start_date` (optional)
- `end_date` (optional)
- `recurring` (optional) - true or false
- `sort_by` (optional, default: "date")
- `sort_order` (optional, default: "desc")

**Response (200):**
```json
{
  "data": [
    {
      "id": "exp_1",
      "date": "2024-01-15",
      "description": "Office supplies",
      "category": "Supplies",
      "vendor": "Supplier XYZ",
      "amount": 5000,
      "payment_method": "credit_card",
      "recurring": false,
      "receipt_url": "https://...",
      "notes": "Monthly supplies",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 120,
  "page": 1,
  "page_size": 20,
  "total_pages": 6
}
```

---

### GET /api/expenses/{id}
Get expense details.

**Authentication:** Required

**Response (200):** Single expense object

---

### POST /api/expenses
Create new expense.

**Authentication:** Required

**Request:**
```json
{
  "date": "2024-01-15",
  "description": "Office supplies",
  "category": "Supplies",
  "vendor": "Supplier XYZ",
  "amount": 5000,
  "payment_method": "credit_card",
  "recurring": false,
  "recurring_frequency": "monthly",
  "notes": "Monthly supplies"
}
```

**Response (201):** Created expense object

---

### PUT /api/expenses/{id}
Update expense.

**Authentication:** Required

**Response (200):** Updated expense object

---

### DELETE /api/expenses/{id}
Delete expense.

**Authentication:** Required

**Response (204):** No content

---

### GET /api/expenses/categories
Get expense categories with budget and spent.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": "cat_1",
    "name": "Salaries",
    "budget": 500000,
    "spent": 450000,
    "percentage": 90
  },
  {
    "id": "cat_2",
    "name": "Rent",
    "budget": 100000,
    "spent": 100000,
    "percentage": 100
  }
]
```

---

### GET /api/expenses/trends
Get expense trends.

**Authentication:** Required

**Query Parameters:**
- `days` (optional, default: 30)

**Response (200):**
```json
[
  {
    "date": "2024-01-01",
    "amount": 50000,
    "category": "Salaries"
  }
]
```

---

## GST Endpoints

### GET /api/gst
Get GST records with pagination and filtering.

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1)
- `page_size` (optional, default: 20)
- `status` (optional)
- `period` (optional)
- `sort_by` (optional, default: "period_end")
- `sort_order` (optional, default: "desc")

**Response (200):**
```json
{
  "data": [
    {
      "id": "gst_1",
      "period": "Q1-2024",
      "period_start": "2024-01-01",
      "period_end": "2024-03-31",
      "taxable_turnover": 1000000,
      "tax_rate": 18,
      "tax_amount": 180000,
      "paid_amount": 150000,
      "outstanding_amount": 30000,
      "status": "pending",
      "due_date": "2024-04-20",
      "filing_date": null,
      "payment_date": null,
      "reference_number": null,
      "notes": "Quarterly GST filing",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

---

### GET /api/gst/{id}
Get GST record details.

**Authentication:** Required

**Response (200):** Single GST record object

---

### POST /api/gst
Create new GST record.

**Authentication:** Required

**Request:**
```json
{
  "period": "Q1-2024",
  "period_start": "2024-01-01",
  "period_end": "2024-03-31",
  "taxable_turnover": 1000000,
  "tax_rate": 18,
  "tax_amount": 180000,
  "due_date": "2024-04-20",
  "notes": "Quarterly GST filing"
}
```

**Response (201):** Created GST record object

---

### PUT /api/gst/{id}
Update GST record.

**Authentication:** Required

**Response (200):** Updated GST record object

---

### DELETE /api/gst/{id}
Delete GST record.

**Authentication:** Required

**Response (204):** No content

---

### GET /api/gst/obligations/upcoming
Get upcoming GST obligations.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": "gst_1",
    "period": "Q2-2024",
    "due_date": "2024-07-20",
    "tax_amount": 200000,
    "status": "pending",
    "days_until_due": 15
  }
]
```

---

### GET /api/gst/obligations/overdue
Get overdue GST obligations.

**Authentication:** Required

**Response (200):** List of overdue GST records

---

### PUT /api/gst/{id}/mark-filed
Mark GST filing as completed.

**Authentication:** Required

**Response (200):** Updated GST record object

---

## Loan Endpoints

### GET /api/loans
Get loans with pagination and filtering.

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1)
- `page_size` (optional, default: 20)
- `status` (optional)
- `lender` (optional)
- `sort_by` (optional, default: "start_date")
- `sort_order` (optional, default: "desc")

**Response (200):**
```json
{
  "data": [
    {
      "id": "loan_1",
      "lender": "Bank XYZ",
      "loan_type": "Business Loan",
      "principal_amount": 500000,
      "outstanding_amount": 400000,
      "interest_rate": 10.5,
      "emi_amount": 12000,
      "start_date": "2023-01-15",
      "end_date": "2028-01-15",
      "next_emi_date": "2024-02-15",
      "status": "active",
      "total_emi_paid": 10,
      "total_emi_count": 60,
      "remaining_emi_count": 50,
      "created_at": "2023-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 2,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

---

### GET /api/loans/{id}
Get loan details.

**Authentication:** Required

**Response (200):** Single loan object

---

### POST /api/loans
Create new loan record.

**Authentication:** Required

**Request:**
```json
{
  "lender": "Bank XYZ",
  "loan_type": "Business Loan",
  "principal_amount": 500000,
  "interest_rate": 10.5,
  "emi_amount": 12000,
  "start_date": "2023-01-15",
  "end_date": "2028-01-15"
}
```

**Response (201):** Created loan object

---

### PUT /api/loans/{id}
Update loan record.

**Authentication:** Required

**Response (200):** Updated loan object

---

### DELETE /api/loans/{id}
Delete loan record.

**Authentication:** Required

**Response (204):** No content

---

### GET /api/loans/{id}/emi-schedule
Get EMI payment schedule.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "emi_number": 1,
    "due_date": "2023-02-15",
    "principal": 7500,
    "interest": 4375,
    "emi_amount": 11875,
    "outstanding_balance": 492500,
    "status": "paid",
    "paid_date": "2023-02-15"
  },
  {
    "emi_number": 2,
    "due_date": "2023-03-15",
    "principal": 7520,
    "interest": 4355,
    "emi_amount": 11875,
    "outstanding_balance": 484980,
    "status": "paid",
    "paid_date": "2023-03-15"
  }
]
```

---

### PUT /api/loans/{id}/mark-emi-paid
Mark EMI as paid.

**Authentication:** Required

**Request:**
```json
{
  "emi_number": 5
}
```

**Response (200):** Updated loan object

---

## Risk Analysis Endpoints

### GET /api/risks
Get financial risks with filtering.

**Authentication:** Required

**Query Parameters:**
- `severity` (optional) - "info", "low", "medium", "high", "critical"
- `category` (optional) - "cash_flow", "receivables", "expenses", "debt", "emi", "gst", "other"
- `status` (optional) - "active", "acknowledged", "resolved"

**Response (200):**
```json
{
  "data": [
    {
      "id": "risk_1",
      "title": "Potential Cash Flow Shortage",
      "description": "Based on current trends, cash may become tight in the next 30 days",
      "category": "cash_flow",
      "severity": "high",
      "status": "active",
      "financial_impact": 50000,
      "evidence": "Current daily outflow is 50k, projected inflow is 30k",
      "recommendation": "Accelerate receivables collection or arrange credit line",
      "detected_at": "2024-01-15T10:30:00Z",
      "acknowledged_at": null,
      "resolved_at": null
    }
  ],
  "total": 3
}
```

---

### GET /api/risks/{id}
Get risk details.

**Authentication:** Required

**Response (200):** Single risk object

---

### GET /api/risks/score
Get overall risk score and breakdown.

**Authentication:** Required

**Response (200):**
```json
{
  "overall_score": 65,
  "overall_level": "medium",
  "categories": [
    {
      "category": "cash_flow",
      "score": 70,
      "level": "medium",
      "risk_count": 1
    },
    {
      "category": "receivables",
      "score": 60,
      "level": "medium",
      "risk_count": 2
    },
    {
      "category": "debt",
      "score": 55,
      "level": "low",
      "risk_count": 0
    }
  ]
}
```

---

### PUT /api/risks/{id}/acknowledge
Mark risk as acknowledged.

**Authentication:** Required

**Response (200):** Updated risk object

---

### PUT /api/risks/{id}/resolve
Mark risk as resolved.

**Authentication:** Required

**Response (200):** Updated risk object

---

## Forecast Endpoints

### GET /api/forecast/cash-flow
Get cash flow forecast.

**Authentication:** Required

**Query Parameters:**
- `days` (optional, default: 30)

**Response (200):**
```json
[
  {
    "date": "2024-01-15",
    "type": "historical",
    "opening_balance": 1500000,
    "inflow": 50000,
    "outflow": 30000,
    "closing_balance": 1520000
  },
  {
    "date": "2024-01-16",
    "type": "predicted",
    "opening_balance": 1520000,
    "inflow": 45000,
    "outflow": 32000,
    "closing_balance": 1533000,
    "confidence": 0.92
  }
]
```

---

### GET /api/forecast/revenue
Get revenue forecast.

**Authentication:** Required

**Query Parameters:**
- `days` (optional, default: 30)

**Response (200):**
```json
[
  {
    "date": "2024-01-15",
    "actual": 50000,
    "predicted": null
  },
  {
    "date": "2024-01-16",
    "actual": null,
    "predicted": 48000,
    "confidence": 0.88
  }
]
```

---

### GET /api/forecast/expense
Get expense forecast.

**Authentication:** Required

**Query Parameters:**
- `days` (optional, default: 30)

**Response (200):** Similar to revenue forecast

---

### GET /api/forecast/parameters
Get forecast parameters and model information.

**Authentication:** Required

**Response (200):**
```json
{
  "forecast_period_days": 30,
  "model_type": "ARIMA",
  "last_training_date": "2024-01-14",
  "confidence_level": 0.90,
  "risk_factor": 0.95
}
```

---

## Loan Readiness Endpoints

### GET /api/loan-readiness
Get loan readiness assessment.

**Authentication:** Required

**Response (200):**
```json
{
  "readiness_score": 72,
  "status": "moderate",
  "overall_recommendation": "Your business shows moderate readiness. Improve cash flow consistency and reduce debt burden to increase eligibility.",
  "factors": [
    {
      "name": "Revenue Stability",
      "score": 75,
      "weight": 0.25,
      "contribution": 18.75,
      "status": "moderate",
      "recommendation": "Maintain consistent revenue growth"
    },
    {
      "name": "Profitability",
      "score": 80,
      "weight": 0.25,
      "contribution": 20,
      "status": "strong",
      "recommendation": null
    },
    {
      "name": "Debt Burden",
      "score": 60,
      "weight": 0.25,
      "contribution": 15,
      "status": "weak",
      "recommendation": "Reduce existing debt levels"
    },
    {
      "name": "Cash Flow",
      "score": 70,
      "weight": 0.25,
      "contribution": 17.5,
      "status": "moderate",
      "recommendation": "Improve cash flow consistency"
    }
  ],
  "improvement_suggestions": [
    "Increase operational efficiency to improve margins",
    "Accelerate receivables collection",
    "Reduce dependence on seasonal revenue",
    "Build emergency cash reserves"
  ],
  "last_updated": "2024-01-15T10:30:00Z"
}
```

---

### GET /api/loan-readiness/factors
Get detailed readiness factors.

**Authentication:** Required

**Response (200):** List of loan readiness factors

---

## AI CFO Endpoints

### POST /api/ai-cfo/chat
Send message to AI CFO assistant.

**Authentication:** Required

**Request:**
```json
{
  "message": "How is my business doing?",
  "context": {
    "period": "last_30_days"
  }
}
```

**Response (200):**
```json
{
  "message": {
    "id": "msg_1",
    "role": "assistant",
    "content": "Your business is showing positive growth with revenue up 15% compared to the previous month...",
    "timestamp": "2024-01-15T10:30:00Z",
    "thinking": "Analyzing financial metrics from past 30 days...",
    "sources": [
      {
        "type": "dashboard",
        "reference": "revenue_trend"
      }
    ]
  },
  "suggested_follow_ups": [
    "What are my biggest expenses?",
    "Will I face a cash shortage?",
    "Should I pursue a loan?"
  ],
  "insights": [
    {
      "type": "risk",
      "title": "High Receivables",
      "description": "You have ₹150,000 in outstanding receivables"
    }
  ]
}
```

---

### GET /api/ai-cfo/conversation
Get conversation history.

**Authentication:** Required

**Response (200):**
```json
{
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "How is my business doing?",
      "timestamp": "2024-01-15T10:00:00Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "Your business...",
      "timestamp": "2024-01-15T10:00:05Z"
    }
  ],
  "total_messages": 10,
  "created_at": "2024-01-15T09:00:00Z"
}
```

---

### DELETE /api/ai-cfo/conversation
Clear conversation history.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Conversation cleared"
}
```

---

### GET /api/ai-cfo/suggested-questions
Get suggested questions for AI CFO.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "question": "How is my business doing?",
    "category": "overview",
    "icon": "chart"
  },
  {
    "question": "Why is my cash flow decreasing?",
    "category": "cash_flow",
    "icon": "trending-down"
  },
  {
    "question": "Which customers owe me the most?",
    "category": "receivables",
    "icon": "users"
  }
]
```

---

## Recommendation Endpoints

### GET /api/recommendations
Get recommendations with pagination and filtering.

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1)
- `page_size` (optional, default: 20)
- `priority` (optional)
- `status` (optional)
- `source_agent` (optional)
- `category` (optional)
- `sort_by` (optional, default: "created_at")
- `sort_order` (optional, default: "desc")

**Response (200):**
```json
{
  "data": [
    {
      "id": "rec_1",
      "title": "Improve Cash Flow",
      "description": "You have ₹150,000 in overdue receivables",
      "reason": "Current receivables aging analysis shows significant overdue amounts",
      "priority": "high",
      "status": "new",
      "recommended_action": "Contact customers and accelerate collection",
      "expected_impact": "Improve cash balance by ₹150,000",
      "impact_value": 150000,
      "source_agent": "Invoice Agent",
      "category": "receivables",
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": null
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

---

### GET /api/recommendations/{id}
Get recommendation details.

**Authentication:** Required

**Response (200):** Single recommendation object

---

### PUT /api/recommendations/{id}/acknowledge
Acknowledge recommendation.

**Authentication:** Required

**Response (200):** Updated recommendation object

---

### PUT /api/recommendations/{id}/complete
Mark recommendation as completed.

**Authentication:** Required

**Response (200):** Updated recommendation object

---

### PUT /api/recommendations/{id}/dismiss
Dismiss recommendation.

**Authentication:** Required

**Response (200):** Updated recommendation object

---

## Alert Endpoints

### GET /api/alerts
Get alerts with pagination and filtering.

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1)
- `page_size` (optional, default: 20)
- `severity` (optional)
- `type` (optional)
- `is_read` (optional)
- `sort_by` (optional, default: "created_at")
- `sort_order` (optional, default: "desc")

**Response (200):**
```json
{
  "data": [
    {
      "id": "alert_1",
      "title": "GST Filing Due",
      "description": "GST filing for Q1 2024 is due on April 20, 2024",
      "severity": "medium",
      "type": "gst_deadline",
      "related_entity_type": "gst_record",
      "related_entity_id": "gst_1",
      "is_read": false,
      "action_url": "/gst/gst_1",
      "created_at": "2024-01-15T10:30:00Z",
      "expires_at": "2024-04-20T23:59:59Z"
    }
  ],
  "total": 8,
  "unread_count": 3,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

---

### GET /api/alerts/{id}
Get alert details.

**Authentication:** Required

**Response (200):** Single alert object

---

### PUT /api/alerts/{id}/read
Mark alert as read.

**Authentication:** Required

**Response (200):** Updated alert object

---

### DELETE /api/alerts/{id}
Dismiss/delete alert.

**Authentication:** Required

**Response (204):** No content

---

## Report Endpoints

### GET /api/reports
Get available report types.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": "financial_summary",
    "name": "Financial Summary",
    "description": "Comprehensive overview of financial performance",
    "format": "pdf"
  },
  {
    "id": "cash_flow_report",
    "name": "Cash Flow Report",
    "description": "Detailed cash flow analysis",
    "format": "pdf"
  }
]
```

---

### POST /api/reports/generate
Generate a new report.

**Authentication:** Required

**Request:**
```json
{
  "report_type": "financial_summary",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "include_sections": [
    "revenue",
    "expenses",
    "profitability",
    "cash_flow",
    "risks",
    "recommendations"
  ]
}
```

**Response (200):**
```json
{
  "id": "report_1",
  "report_type": "financial_summary",
  "title": "Financial Summary - January 2024",
  "generated_at": "2024-01-15T10:30:00Z",
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "summary": {
    "total_revenue": 500000,
    "total_expenses": 250000,
    "net_profit": 250000
  },
  "sections": [
    {
      "title": "Revenue",
      "content": { ... }
    }
  ]
}
```

---

### GET /api/reports/{id}
Get generated report.

**Authentication:** Required

**Response (200):** Report object

---

### GET /api/reports/{id}/download
Download report as PDF or Excel.

**Authentication:** Required

**Query Parameters:**
- `format` (optional, default: "pdf") - "pdf" or "excel"

**Response (200):** Binary file (PDF or Excel)

---

### GET /api/reports/history
Get report generation history.

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1)
- `page_size` (optional, default: 20)

**Response (200):**
```json
{
  "data": [
    {
      "id": "report_1",
      "report_type": "financial_summary",
      "generated_at": "2024-01-15T10:30:00Z",
      "generated_by": "user_123",
      "period_start": "2024-01-01",
      "period_end": "2024-01-31",
      "status": "completed"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

---

## Business Profile Endpoints

### GET /api/profile
Get business profile.

**Authentication:** Required

**Response (200):**
```json
{
  "id": "business_1",
  "business_name": "My Business",
  "business_type": "Sole Proprietor",
  "industry": "Technology",
  "gstin": "18AABCT1234H1Z0",
  "pan": "AABCT1234H",
  "incorporation_date": "2020-01-15",
  "email": "contact@mybusiness.com",
  "phone": "+91-9876543210",
  "address": "123 Business Street",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560001",
  "website": "https://mybusiness.com",
  "founded_year": 2020,
  "employee_count": 10,
  "annual_turnover": 5000000,
  "currency": "INR",
  "fiscal_year_start": "2024-01-01"
}
```

---

### PUT /api/profile
Update business profile.

**Authentication:** Required

**Request:** (All fields optional)
```json
{
  "business_name": "My Business",
  "business_type": "Sole Proprietor",
  "industry": "Technology"
}
```

**Response (200):** Updated profile object

---

### GET /api/profile/preferences
Get user preferences.

**Authentication:** Required

**Response (200):**
```json
{
  "id": "pref_1",
  "timezone": "Asia/Kolkata",
  "date_format": "DD-MM-YYYY",
  "currency": "INR",
  "number_format": "en-IN",
  "language": "en",
  "theme": "light",
  "notifications_enabled": true,
  "email_digest_frequency": "weekly",
  "risk_alert_threshold": "medium"
}
```

---

### PUT /api/profile/preferences
Update user preferences.

**Authentication:** Required

**Request:** (All fields optional)
```json
{
  "timezone": "Asia/Kolkata",
  "theme": "dark",
  "notifications_enabled": true
}
```

**Response (200):** Updated preferences object

---

## Error Handling Best Practices

### Handling 401 Unauthorized
- Token has expired
- Token is invalid
- User has been logged out
- **Action**: Redirect to login page, clear localStorage

### Handling 400 Bad Request
- Invalid input parameters
- Validation errors
- **Action**: Display validation error messages to user

### Handling 500 Internal Server Error
- Backend error
- **Action**: Show user-friendly error message, offer retry option

### Handling Network Errors
- No internet connection
- Backend is down
- **Action**: Show connectivity error, enable offline mode if possible

---

## Rate Limiting

- Rate limiting may be implemented on the backend
- Respect `Retry-After` headers
- Implement exponential backoff for retries

---

## Data Formats

### Date Format
All dates should be in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

### Currency
All amounts are in the smallest unit (paisa for INR):
- ₹100 is represented as `10000` (in paisa)
- Display format: Use Intl.NumberFormat for localized display

### Numbers
- Financial amounts are integers (in paisa/smallest unit)
- Percentages are decimal numbers (0-100)
- Rates are decimal numbers (e.g., 10.5 for 10.5%)

---

## Pagination

All list endpoints support pagination with:
- `page` - Page number (1-indexed)
- `page_size` - Items per page

Response includes:
- `data` - Array of items
- `total` - Total number of items
- `page` - Current page
- `page_size` - Items per page
- `total_pages` - Total number of pages

---

## Versioning

Currently on API version 1. Future versions may be released under:
- `/api/v2/...`
- `/api/v3/...`

---

## Changelog

- **v1.0.0** - Initial API release
  - Authentication endpoints
  - Dashboard endpoints
  - Transaction management
  - Invoice management
  - Expense tracking
  - GST management
  - Loan management
  - Financial forecasting
  - Risk analysis
  - Loan readiness assessment
  - AI CFO assistant
  - Recommendations
  - Alerts
  - Reports
  - Business profile management


---

# Document Upload, Extraction & History (v1.1.0)

## Upload & Document Extraction Endpoints

Base: `POST /api/uploads/*`

### Extract financial fields from an image/PDF

**POST** `/api/uploads/extract?import_type={transactions|invoices|expenses|gst|loans}`

Multipart upload (`file`). Extracts candidate rows from a PDF (text layer), an image
(Gemini vision when configured, otherwise Tesseract OCR when installed, otherwise a
manual-entry fallback). **Nothing is stored in the database** — the caller must show
the rows to the user for review.

```json
{
  "success": true,
  "data": {
    "file_name": "invoice-scan.pdf",
    "import_type": "invoices",
    "method": "gemini | tesseract | heuristics | manual",
    "confidence": "high | medium | low",
    "rows": [{ "invoice_number": "INV-77", "total_amount": "42500", "...": "..." }],
    "raw_text": "…(truncated)…",
    "row_count": 2,
    "note": "…guidance for the review step…"
  }
}
```

### Confirm extracted rows (the only path that inserts data)

**POST** `/api/uploads/extracted/confirm`

```json
{
  "import_type": "invoices",
  "file_name": "invoice-scan.pdf",
  "rows": [
    { "invoice_number": "INV-77", "customer_name": "Acme", "invoice_date": "2026-08-01",
      "due_date": "2026-08-31", "total_amount": 42500, "paid_amount": 0, "status": "sent" }
  ]
}
```

Rows are validated with the same business rules as CSV import (dates, amounts, statuses),
deduplicated against the business's existing records, and inserted. Returns the standard
import summary (`total_rows`, `successful_rows`, `failed_rows`, `duplicates`, `errors`).

## Enhanced CSV/Excel Import

`POST /api/{transactions|invoices|expenses|gst|loans}/import` now accepts **`.xlsx`**
files in addition to `.csv` (single sheet, first sheet used, same column names).
Duplicates and invalid rows are reported per-row as before.

## History Endpoints

### Unified activity timeline

**GET** `/api/history?page=1&limit=20&event_type=&status=&search=`

Returns a merged, business-scoped timeline of:

| `event_type`      | Source                                            |
|-------------------|---------------------------------------------------|
| `import`          | CSV/Excel imports and confirmed document imports   |
| `extraction`      | image/PDF document extraction runs                 |
| `report`          | generated PDF reports (with `report_id` to download) |
| `recommendations` | AI recommendation generation runs                  |
| `record`          | entity create/update/delete from the audit trail   |

```json
{
  "success": true,
  "data": [
    {
      "id": "…", "event_type": "report", "entity": "report", "status": "success",
      "message": "Generated Comprehensive Financial Report",
      "details": { "filename": "aicfo-…-20260821.pdf", "size_bytes": 11715 },
      "report_id": "6a88…", "created_at": "2026-08-21T20:02:25.163447"
    }
  ],
  "page": 1, "limit": 20, "total": 7, "pages": 1
}
```

## PDF Report Endpoints

### Generate & store a PDF report

**POST** `/api/reports/pdf` — body `{ "report_type": "comprehensive" | "financial_summary" | "cash_flow" | "risk" }`

Builds a branded PDF (KPI tables, health score, vector charts, GST/loans/risk sections,
AI recommendations, executive summary) from live business data, stores it in MongoDB
and returns `{ id, title, report_type, filename, size_bytes, generated_at }`.

### List generated PDFs

**GET** `/api/reports/pdf` — metadata only, newest first.

### Download a PDF

**GET** `/api/reports/pdf/{report_id}` — `application/pdf` (business-scoped; 404 for
other businesses, 401 unauthenticated).

### Delete a PDF

**DELETE** `/api/reports/pdf/{report_id}`

## Dashboard AI Recommendations

**GET** `/api/recommendations/dashboard?limit=6`

Fresh (unpersisted) data-driven recommendations for the Dashboard, sorted by priority,
covering receivables, cash flow, spending trends, cost saving, GST, loans, health and
priorities. Includes an optional `narrative` (Gemini when configured, deterministic
otherwise) and the `engine` used.

## Changelog

- **v1.1.0** - Uploads, document extraction, PDF reports & history
  - CSV **and Excel** imports on every finance module
  - Image/PDF extraction with editable review + explicit confirm (no silent inserts)
  - Real PDF report generation (reportlab) with charts, metrics and AI recommendations
  - Unified activity History feed with report re-download
  - Dashboard AI Recommendations section (data-driven, priority-ranked)
