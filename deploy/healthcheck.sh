#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# AI CFO — production stack health check (run on the EC2 host).
#
# Prints the Compose service status and fails unless the backend /health
# endpoint answers 200 over the internal Docker network (works with or
# without a custom DOMAIN).
#
# Usage: sudo -u ubuntu bash /home/ubuntu/aicfo/deploy/healthcheck.sh
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP_DIR=/home/ubuntu/aicfo
cd "$APP_DIR"

sudo -u ubuntu docker compose -f docker-compose.prod.yml ps

sudo -u ubuntu docker compose -f docker-compose.prod.yml exec -T backend \
  python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health', timeout=5).status==200 else 1)"

echo "[aicfo-health] backend /health OK"
