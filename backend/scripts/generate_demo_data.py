#!/usr/bin/env python3
"""Generate completely synthetic MSME demo data and push it through the same
backend services + MongoDB pipeline used in production.

Usage (from the `backend/` directory):
    python -m scripts.generate_demo_data --yes

Demo data is only written when Demo Mode is explicitly enabled
(DEMO_MODE=true) or the `--yes` flag is passed. It never touches real data.
"""

import argparse
import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.errors import ConflictError
from app.db import mongodb
from app.db.indexes import create_indexes
from app.schemas.auth import RegisterRequest
from app.schemas.finance import (
    ExpenseCreate,
    GSTCreate,
    InvoiceCreate,
    LoanCreate,
    TransactionCreate,
)
from app.services import (
    alert_service,
    auth_service,
    expense_service,
    forecast_service,
    gst_service,
    invoice_service,
    loan_readiness_service,
    loan_service,
    recommendation_service,
    risk_service,
    transaction_service,
)

CATEGORIES_EXPENSE = ["Salaries", "Raw Materials", "Rent", "Utilities", "Marketing", "Logistics", "Maintenance"]
CATEGORIES_INCOME = ["Sales", "Services", "Consulting"]
CUSTOMERS = [
    "Delta Traders", "Metro Logistics", "Sunrise Retail", "Global Exports",
    "Apex Distributors", "North Star Corp", "Vertex Solutions", "Proxima Ltd",
    "Tech Innovators", "Prime Retail",
]
VENDORS = ["SteelMart Suppliers", "Prime Properties", "Google", "BESCOM", "TechServ", "FastFreight", "Stationery Hub"]
LENDERS = ["HDFC Bank", "State Bank of India", "Tata Capital", "ICICI Bank"]


async def wipe_demo_data(db: AsyncIOMotorDatabase, business_id) -> None:
    for coll in ["transactions", "invoices", "expenses", "gst_records", "loans",
                 "forecasts", "risk_assessments", "recommendations", "alerts"]:
        await db[coll].delete_many({"business_id": business_id})


async def seed(
    db: AsyncIOMotorDatabase,
    *,
    email: str = "owner@acmeindustries.com",
    password: str = "demo12345",
    business: str = "Acme Industries Pvt. Ltd.",
    owner: str = "Rajesh Sharma",
    months: int = 6,
    reset: bool = True,
    rng_seed: int = 42,
) -> dict:
    """Seed synthetic data for a demo business into the given database."""
    rng = random.Random(rng_seed)

    # 1. Demo user + business (through the auth service).
    try:
        await auth_service.register(
            db,
            RegisterRequest(
                email=email, password=password,
                business_name=business, owner_name=owner,
                business_type="Private Limited", industry="Manufacturing",
            ),
        )
    except ConflictError:
        pass  # demo user already exists — reuse it

    user = await db["users"].find_one({"email": email})
    if not user:
        raise RuntimeError("Could not create demo user")
    business_doc = await db["businesses"].find_one({"owner_id": user["_id"]})
    business_id = business_doc["_id"]

    if reset:
        await wipe_demo_data(db, business_id)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start = now - timedelta(days=30 * months)

    # 2. Transactions.
    tx_count = 0
    d = start
    while d <= now:
        for _ in range(rng.randint(0, 2)):
            await transaction_service.create(
                db, business_id, user["_id"],
                TransactionCreate(
                    date=d, description=f"Invoice payment — {rng.choice(CUSTOMERS)}",
                    amount=round(rng.uniform(15000, 420000), 2), type="income",
                    category=rng.choice(CATEGORIES_INCOME),
                    payment_method=rng.choice(["Bank Transfer", "UPI", "Cheque", "NEFT"]),
                ),
            )
            tx_count += 1
        for _ in range(rng.randint(0, 2)):
            await transaction_service.create(
                db, business_id, user["_id"],
                TransactionCreate(
                    date=d, description=rng.choice(["Raw material purchase", "Monthly salaries", "Rent payment", "Electricity bill", "Marketing campaign"]),
                    amount=round(rng.uniform(3000, 120000), 2), type="expense",
                    category=rng.choice(CATEGORIES_EXPENSE),
                    payment_method=rng.choice(["Bank Transfer", "Credit Card", "NEFT", "UPI"]),
                ),
            )
            tx_count += 1
        d += timedelta(days=rng.randint(1, 4))

    # 3. Invoices.
    for i in range(1, months * 5 + 1):
        invoice_date = start + timedelta(days=rng.randint(0, max(1, (now - start).days - 30)))
        due_date = invoice_date + timedelta(days=30)
        total = round(rng.uniform(40000, 500000), 2)
        paid = total if rng.random() < 0.6 else round(total * rng.uniform(0, 0.8), 2)
        status = "paid" if paid >= total else ("overdue" if due_date < now else "sent")
        await invoice_service.create(
            db, business_id, user["_id"],
            InvoiceCreate(
                invoice_number=f"INV-{invoice_date.year}-{100 + i}",
                customer_name=rng.choice(CUSTOMERS),
                invoice_date=invoice_date, due_date=due_date,
                total_amount=total, paid_amount=paid, status=status,
            ),
        )

    # 4. Expenses (categorized, recurring).
    for i in range(months * 6):
        e_date = start + timedelta(days=rng.randint(0, max(1, (now - start).days)))
        await expense_service.create(
            db, business_id, user["_id"],
            ExpenseCreate(
                date=e_date, description=rng.choice(["Raw material", "Salaries", "Rent", "Electricity", "Ads", "Transport", "Maintenance"]),
                category=rng.choice(CATEGORIES_EXPENSE), vendor=rng.choice(VENDORS),
                amount=round(rng.uniform(5000, 150000), 2),
                payment_method=rng.choice(["Bank Transfer", "Credit Card", "NEFT"]),
                recurring=rng.random() < 0.4,
            ),
        )

    # 5. GST records.
    for i in range(months):
        period_start = (now - timedelta(days=30 * (months - i))).replace(day=1)
        period_end = (period_start + timedelta(days=31)).replace(day=1)
        due = period_end + timedelta(days=20)
        tax = round(rng.uniform(250000, 550000), 2)
        paid = tax if due < now and rng.random() < 0.75 else 0.0
        status = "paid" if paid >= tax else ("overdue" if due < now else "pending")
        await gst_service.create(
            db, business_id, user["_id"],
            GSTCreate(
                period=period_start.strftime("%b %Y"), period_start=period_start,
                period_end=period_end, due_date=due, taxable_turnover=round(tax / 0.18, 2),
                tax_amount=tax, paid_amount=paid, status=status,
            ),
        )

    # 6. Loans.
    for lender, loan_type, principal in zip(
        LENDERS, ["Term Loan", "Working Capital", "Equipment Finance", "Term Loan"],
        [6000000, 3000000, 2000000, 1500000],
    ):
        await loan_service.create(
            db, business_id, user["_id"],
            LoanCreate(
                lender=lender, loan_type=loan_type, principal_amount=principal,
                outstanding_amount=round(principal * 0.7, 2), interest_rate=round(rng.uniform(9, 12), 2),
                emi_amount=round(principal * rng.uniform(0.02, 0.05), 2),
                start_date=now - timedelta(days=365 * 2), end_date=now + timedelta(days=365 * 3),
                next_emi_date=now + timedelta(days=rng.randint(2, 25)),
            ),
        )

    # 7. Derived analytics through the same engines used by the API.
    await forecast_service.generate(db, business_id, days=30)
    await risk_service.analyze(db, business_id)
    await loan_readiness_service.analyze(db, business_id)
    await recommendation_service.generate(db, business_id)
    await alert_service.generate(db, business_id)

    return {
        "email": email,
        "business_id": str(business_id),
        "transactions": tx_count,
        "invoices": months * 5,
        "expenses": months * 6,
        "gst_records": months,
        "loans": 4,
    }


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Seed synthetic MSME demo data")
    p.add_argument("--yes", action="store_true", help="Confirm demo seeding")
    p.add_argument("--email", default="owner@acmeindustries.com")
    p.add_argument("--password", default="demo12345")
    p.add_argument("--business", default="Acme Industries Pvt. Ltd.")
    p.add_argument("--owner", default="Rajesh Sharma")
    p.add_argument("--months", type=int, default=6)
    p.add_argument("--reset", action="store_true")
    return p


async def main() -> None:
    args = build_parser().parse_args()
    if not settings.DEMO_MODE and not args.yes:
        print("Refusing to seed demo data: set DEMO_MODE=true or pass --yes.")
        sys.exit(1)

    await mongodb.connect()
    db = mongodb.get_db()
    await create_indexes(db)
    summary = await seed(
        db, email=args.email, password=args.password, business=args.business,
        owner=args.owner, months=args.months, reset=args.reset,
    )
    print("Seeded demo data:", summary)
    await mongodb.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
