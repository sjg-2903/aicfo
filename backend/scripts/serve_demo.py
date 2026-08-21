#!/usr/bin/env python3
"""Run a live API server backed by an in-memory, API-compatible MongoDB engine.

This is a **development-only** convenience for running the API without a local
MongoDB server (e.g. in restricted sandboxes). The application code and all
financial engines are identical to production; only the database engine is
swapped. For production, run against real MongoDB (see docker-compose.yml).

Usage (from the `backend/` directory):
    python -m scripts.serve_demo
"""

import asyncio

import uvicorn
from mongomock_motor import AsyncMongoMockClient

from app.db import mongodb
from app.db.indexes import create_indexes
from scripts.generate_demo_data import seed


async def setup() -> None:
    client = AsyncMongoMockClient()
    db = client["aicfo_demo"]
    await create_indexes(db)
    mongodb.set_database(db)
    summary = await seed(db, reset=True)
    print("Demo data seeded:", summary)


def main() -> None:
    asyncio.run(setup())
    # lifespan="off" so the app does not try to connect to a real MongoDB.
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, lifespan="off")


if __name__ == "__main__":
    main()
