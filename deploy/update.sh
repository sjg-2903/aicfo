#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# AI CFO — deploy/update: rebuild and restart the production stack.
#
# Run on the EC2 host (as the ubuntu user), directly or via SSM
# (used by .github/workflows/deploy.yml):
#   aws ssm send-command ... --parameters 'commands=["sudo -u ubuntu bash /home/ubuntu/aicfo/deploy/update.sh"]'
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP_DIR=/home/ubuntu/aicfo
COMPOSE_FILE=docker-compose.prod.yml
LOG=/home/ubuntu/aicfo-deploy.log

log() { echo "[aicfo-update] $(date -u '+%F %T') $*" | tee -a "$LOG"; }

cd "$APP_DIR"

log "Fetching latest code from origin/main ..."
sudo -u ubuntu git fetch origin
sudo -u ubuntu git checkout main
sudo -u ubuntu git pull --ff-only

log "Rebuilding and restarting the stack ..."
sudo -u ubuntu docker compose -f "$COMPOSE_FILE" up -d --build

log "Pruning dangling images ..."
sudo -u ubuntu docker image prune -f >/dev/null 2>&1 || true

log "Waiting for backend /health (inside the Docker network) ..."
for i in $(seq 1 30); do
  if sudo -u ubuntu bash "$APP_DIR/deploy/healthcheck.sh" >/dev/null 2>&1; then
    log "Health OK — deploy complete."
    exit 0
  fi
  sleep 10
done

log "ERROR: health check failed. Inspect with:"
log "  docker compose -f $COMPOSE_FILE ps"
log "  docker compose -f $COMPOSE_FILE logs --tail=100"
exit 1
