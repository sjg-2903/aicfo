#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# AI CFO — nightly MongoDB backup (scheduled by cron via bootstrap.sh).
#
#   - mongodump --archive --gzip  -> /home/ubuntu/aicfo-backups/
#   - keeps the last N days locally (default 7)
#   - optionally uploads a copy to S3 (BACKUP_S3_BUCKET in
#     /home/ubuntu/.aicfo-backup.env, written by the bootstrap)
#
# Restore example:
#   docker compose exec -T mongo sh -c '
#     mongorestore --archive --gzip --drop \
#       --username "$MONGO_INITDB_ROOT_USERNAME" \
#       --password "$MONGO_INITDB_ROOT_PASSWORD" \
#       --authenticationDatabase admin
#   ' < /home/ubuntu/aicfo-backups/aicfo-YYYY-MM-DD_HHMMSS.archive.gz
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP_DIR=/home/ubuntu/aicfo
BACKUP_DIR=/home/ubuntu/aicfo-backups
BACKUP_LOG=/home/ubuntu/aicfo-backup.log
STAMP=$(date +%F_%H%M%S)
ARCHIVE="$BACKUP_DIR/aicfo-$STAMP.archive.gz"

# Optional config written by deploy/bootstrap.sh.
if [ -f /home/ubuntu/.aicfo-backup.env ]; then
  # shellcheck disable=SC1091
  . /home/ubuntu/.aicfo-backup.env
fi
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

mkdir -p "$BACKUP_DIR"

echo "[aicfo-backup] $STAMP starting (retention: ${RETENTION_DAYS}d)" >> "$BACKUP_LOG"

cd "$APP_DIR"
docker compose exec -T mongo sh -c '
  mongodump --archive --gzip \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db aicfo
' > "$ARCHIVE" 2>>"$BACKUP_LOG" || {
  echo "[aicfo-backup] $STAMP FAILED (mongodump exited non-zero)" >> "$BACKUP_LOG"
  exit 1
}

# Local retention.
find "$BACKUP_DIR" -name 'aicfo-*.archive.gz' -mtime +"$RETENTION_DAYS" -delete

# Off-site copy (optional).
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  aws s3 cp "$ARCHIVE" "s3://$BACKUP_S3_BUCKET/aicfo/$STAMP.archive.gz" \
    --only-show-errors >> "$BACKUP_LOG" 2>&1 \
    && echo "[aicfo-backup] $STAMP uploaded to s3://$BACKUP_S3_BUCKET" >> "$BACKUP_LOG" \
    || echo "[aicfo-backup] $STAMP S3 upload FAILED" >> "$BACKUP_LOG"
fi

echo "[aicfo-backup] $STAMP done: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))" >> "$BACKUP_LOG"
