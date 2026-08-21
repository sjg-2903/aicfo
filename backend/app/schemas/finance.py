"""Schemas for transactions, invoices, expenses, GST records and loans."""

from datetime import datetime
from typing import Literal, Optional

from app.schemas.common import NaiveDatetime

from pydantic import BaseModel, Field


# ── Transactions ─────────────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    date: NaiveDatetime
    description: str = Field(min_length=1, max_length=300)
    amount: float = Field(gt=0)
    type: Literal["income", "expense"]
    category: str = Field(default="", max_length=80)
    payment_method: str = Field(default="", max_length=40)
    reference_id: Optional[str] = Field(default=None, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=500)


class TransactionUpdate(BaseModel):
    date: Optional[NaiveDatetime] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=300)
    amount: Optional[float] = Field(default=None, gt=0)
    type: Optional[Literal["income", "expense"]] = None
    category: Optional[str] = Field(default=None, max_length=80)
    payment_method: Optional[str] = Field(default=None, max_length=40)
    reference_id: Optional[str] = Field(default=None, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=500)


# ── Invoices ────────────────────────────────────────────────────────────────
class InvoiceItemCreate(BaseModel):
    description: str = Field(min_length=1, max_length=300)
    quantity: float = Field(gt=0)
    unit_price: float = Field(ge=0)


class InvoiceCreate(BaseModel):
    invoice_number: str = Field(min_length=1, max_length=40)
    customer_name: str = Field(min_length=1, max_length=120)
    customer_email: Optional[str] = Field(default=None, max_length=120)
    invoice_date: NaiveDatetime
    due_date: NaiveDatetime
    total_amount: float = Field(gt=0)
    paid_amount: float = Field(default=0.0, ge=0)
    status: Literal["draft", "sent", "paid", "overdue", "cancelled"] = "sent"
    items: list[InvoiceItemCreate] = Field(default_factory=list)
    notes: Optional[str] = Field(default=None, max_length=500)


class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = Field(default=None, min_length=1, max_length=40)
    customer_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    customer_email: Optional[str] = Field(default=None, max_length=120)
    invoice_date: Optional[NaiveDatetime] = None
    due_date: Optional[NaiveDatetime] = None
    total_amount: Optional[float] = Field(default=None, gt=0)
    paid_amount: Optional[float] = Field(default=None, ge=0)
    status: Optional[Literal["draft", "sent", "paid", "overdue", "cancelled"]] = None
    items: Optional[list[InvoiceItemCreate]] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class MarkPaidRequest(BaseModel):
    paid_amount: float = Field(ge=0)


# ── Expenses ────────────────────────────────────────────────────────────────
class ExpenseCreate(BaseModel):
    date: NaiveDatetime
    description: str = Field(min_length=1, max_length=300)
    category: str = Field(default="", max_length=80)
    vendor: str = Field(default="", max_length=120)
    amount: float = Field(gt=0)
    payment_method: str = Field(default="", max_length=40)
    recurring: bool = False
    notes: Optional[str] = Field(default=None, max_length=500)


class ExpenseUpdate(BaseModel):
    date: Optional[NaiveDatetime] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=300)
    category: Optional[str] = Field(default=None, max_length=80)
    vendor: Optional[str] = Field(default=None, max_length=120)
    amount: Optional[float] = Field(default=None, gt=0)
    payment_method: Optional[str] = Field(default=None, max_length=40)
    recurring: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=500)


# ── GST ─────────────────────────────────────────────────────────────────────
class GSTCreate(BaseModel):
    period: str = Field(min_length=1, max_length=40)
    period_start: NaiveDatetime
    period_end: NaiveDatetime
    due_date: NaiveDatetime
    taxable_turnover: float = Field(ge=0)
    tax_amount: float = Field(ge=0)
    paid_amount: float = Field(default=0.0, ge=0)
    status: Literal["pending", "filed", "paid", "overdue"] = "pending"
    reference_number: Optional[str] = Field(default=None, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=500)


class GSTUpdate(BaseModel):
    period: Optional[str] = Field(default=None, min_length=1, max_length=40)
    period_start: Optional[NaiveDatetime] = None
    period_end: Optional[NaiveDatetime] = None
    due_date: Optional[NaiveDatetime] = None
    taxable_turnover: Optional[float] = Field(default=None, ge=0)
    tax_amount: Optional[float] = Field(default=None, ge=0)
    paid_amount: Optional[float] = Field(default=None, ge=0)
    status: Optional[Literal["pending", "filed", "paid", "overdue"]] = None
    reference_number: Optional[str] = Field(default=None, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=500)


# ── Loans ───────────────────────────────────────────────────────────────────
class LoanCreate(BaseModel):
    lender: str = Field(min_length=1, max_length=120)
    loan_type: str = Field(default="", max_length=80)
    principal_amount: float = Field(gt=0)
    outstanding_amount: float = Field(ge=0)
    interest_rate: float = Field(ge=0, le=100)
    emi_amount: float = Field(ge=0)
    start_date: NaiveDatetime
    end_date: NaiveDatetime
    next_emi_date: Optional[NaiveDatetime] = None
    status: Literal["active", "closed", "defaulted"] = "active"


class LoanUpdate(BaseModel):
    lender: Optional[str] = Field(default=None, min_length=1, max_length=120)
    loan_type: Optional[str] = Field(default=None, max_length=80)
    principal_amount: Optional[float] = Field(default=None, gt=0)
    outstanding_amount: Optional[float] = Field(default=None, ge=0)
    interest_rate: Optional[float] = Field(default=None, ge=0, le=100)
    emi_amount: Optional[float] = Field(default=None, ge=0)
    start_date: Optional[NaiveDatetime] = None
    end_date: Optional[NaiveDatetime] = None
    next_emi_date: Optional[NaiveDatetime] = None
    status: Optional[Literal["active", "closed", "defaulted"]] = None
