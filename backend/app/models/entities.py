"""Internal domain entities (plain dataclasses) + document field helpers.

The MongoDB documents are built through these constructors so field names stay
consistent across services, analytics and tests.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from app.utils.dates import utcnow


@dataclass
class User:
    email: str
    hashed_password: str
    role: str
    owner_name: str
    business_id: Optional[Any] = None
    is_active: bool = True
    token_version: int = 0
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)


@dataclass
class Business:
    owner_id: Any
    business_name: str
    business_type: str = ""
    industry: str = ""
    email: str = ""
    phone: str = ""
    gstin: str = ""
    pan: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    website: str = ""
    currency: str = "INR"
    fiscal_year_start: str = "04-01"
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)


@dataclass
class Transaction:
    business_id: Any
    date: datetime
    description: str
    amount: float
    type: str  # income | expense
    category: str
    payment_method: str = ""
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)


@dataclass
class Invoice:
    business_id: Any
    invoice_number: str
    customer_name: str
    invoice_date: datetime
    due_date: datetime
    total_amount: float
    paid_amount: float = 0.0
    status: str = "sent"
    customer_email: str = ""
    items: list = field(default_factory=list)
    notes: str = ""
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)


@dataclass
class Expense:
    business_id: Any
    date: datetime
    description: str
    category: str
    vendor: str
    amount: float
    payment_method: str = ""
    recurring: bool = False
    notes: str = ""
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)


@dataclass
class GSTRecord:
    business_id: Any
    period: str
    period_start: datetime
    period_end: datetime
    due_date: datetime
    taxable_turnover: float
    tax_amount: float
    paid_amount: float = 0.0
    status: str = "pending"
    reference_number: str = ""
    notes: str = ""
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)


@dataclass
class Loan:
    business_id: Any
    lender: str
    loan_type: str
    principal_amount: float
    outstanding_amount: float
    interest_rate: float
    emi_amount: float
    start_date: datetime
    end_date: datetime
    next_emi_date: Optional[datetime] = None
    status: str = "active"
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)
