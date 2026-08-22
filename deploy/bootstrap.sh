#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────
# AI CFO — one-time EC2 bootstrap (runs as cloud-init user-data).
#
# What it does:
#   1. Installs Docker + Compose plugin + AWS CLI + SSM agent
#   2. Mounts the dedicated EBS data disk at /var/lib/docker (survives
#      instance replacement)
#   3. Fetches secrets from AWS SSM Parameter Store (SecureString) written
#      by Terraform
#   4. Clones the application repo
#   5. Writes the Compose `.env` (mode 600) and starts the production stack
#   6. Installs the nightly MongoDB backup cron
#
# @PLACEHOLDERS@ are replaced by Terraform (replace()) so that shell
# variable syntax inside this script never conflicts with TF interpolation.
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail

REGION="@@REGION@@"
GIT_REPO="@@REPO_URL@@"
GIT_BRANCH="@@BRANCH@@"
SSM_PREFIX="@@SSM_PREFIX@@"
DOMAIN="@@DOMAIN@@"
CORS_ORIGINS="@@CORS_ORIGINS@@"
BACKUP_BUCKET="@@BACKUP_BUCKET@@"
ADMIN_EMAILS="@@ADMIN_EMAILS@@"

export DEBIAN_FRONTEND=noninteractive
log() { echo "[aicfo-bootstrap] $(date -u '+%F %T') $*"; }
exec > >(tee -a /var/log/aicfo-bootstrap.log) 2>&1

# ── 1. Prepare the Docker data disk (separate EBS volume) ──────────────────
DATA_DEV=""
for candidate in /dev/nvme1n1 /dev/xvdf /dev/sdf; do
  if [ -e "$candidate" ]; then DATA_DEV="$candidate"; break; fi
done
if [ -n "$DATA_DEV" ]; then
  log "Data disk found: $DATA_DEV"
  for i in $(seq 1 30); do
    [ -e "$DATA_DEV" ] && break
    sleep 5
  done
  if ! blkid -s TYPE -o value "$DATA_DEV" | grep -q ext4; then
    log "Formatting $DATA_DEV as ext4 ..."
    mkfs.ext4 -F "$DATA_DEV" >/dev/null
  fi
  mkdir -p /var/lib/docker
  if ! grep -q "$(blkid -s UUID -o value "$DATA_DEV")" /etc/fstab; then
    echo "UUID=$(blkid -s UUID -o value "$DATA_DEV") /var/lib/docker ext4 defaults,nofail 0 2" >> /etc/fstab
  fi
  mountpoint -q /var/lib/docker || mount /var/lib/docker
  log "Mounted $DATA_DEV at /var/lib/docker"
else
  log "WARNING: no data disk found; Docker data will live on the root volume."
fi

# ── 2. System packages ─────────────────────────────────────────────────────
log "Installing system packages ..."
apt-get update -q
apt-get install -y -q \
  docker.io docker-compose-v2 awscli curl git gnupg jq

systemctl enable --now docker
usermod -aG docker ubuntu

# ── 3. SSM agent (Session Manager shell + GitHub Actions deploys) ──────────
log "Installing SSM agent ..."
if ! systemctl is-active --quiet snap.amazon-ssm-agent.ssm-agent; then
  for i in $(seq 1 12); do
    snap version >/dev/null 2>&1 && break
    sleep 5
  done
  if command -v snap >/dev/null 2>&1; then
    snap install amazon-ssm-agent --classic || log "WARNING: SSM agent install failed (deploys via Actions will not work)"
    snap start --enable amazon-ssm-agent || true
  else
    log "WARNING: snapd unavailable; SSM agent install skipped"
  fi
fi

# ── 4. Secrets from SSM Parameter Store (SecureString) ─────────────────────
get_param() {
  aws ssm get-parameter --name "$1" --with-decryption --region "$REGION" \
    --query Parameter.Value --output text
}
ssm_optional() {
  local value
  if value=$(aws ssm get-parameter --name "$1" --with-decryption --region "$REGION" \
      --query Parameter.Value --output text 2>/dev/null); then
    printf '%s' "$value"
  else
    printf ''
  fi
}

log "Fetching secrets from $SSM_PREFIX ..."
JWT_SECRET="$(get_param "${SSM_PREFIX}/jwt_secret")"
MONGO_ROOT_PASSWORD="$(get_param "${SSM_PREFIX}/mongo_root_password")"
MONGO_APP_PASSWORD="$(get_param "${SSM_PREFIX}/mongo_app_password")"
OPENAI_API_KEY="$(ssm_optional "${SSM_PREFIX}/openai_api_key")"
GEMINI_API_KEY="$(ssm_optional "${SSM_PREFIX}/gemini_api_key")"

# ── 5. Clone / fetch application code ──────────────────────────────────────
APP_DIR=/home/ubuntu/aicfo
if [ ! -d "$APP_DIR/.git" ]; then
  log "Cloning $GIT_REPO (branch: $GIT_BRANCH) ..."
  sudo -u ubuntu git clone --branch "$GIT_BRANCH" --single-branch "$GIT_REPO" "$APP_DIR"
else
  log "Updating existing checkout ..."
  cd "$APP_DIR"
  sudo -u ubuntu git fetch origin "$GIT_BRANCH"
  sudo -u ubuntu git checkout "$GIT_BRANCH"
  sudo -u ubuntu git pull --ff-only
fi
cd "$APP_DIR"

# ── 6. Write the Compose environment ───────────────────────────────────────
log "Writing ${APP_DIR}/.env ..."
cat > .env <<EOF
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=$MONGO_ROOT_PASSWORD
MONGO_APP_USERNAME=aicfo_app
MONGO_APP_PASSWORD=$MONGO_APP_PASSWORD
JWT_SECRET=$JWT_SECRET
CORS_ORIGINS=$CORS_ORIGINS
DOMAIN=$DOMAIN
ADMIN_EMAILS=$ADMIN_EMAILS
LLM_PROVIDER=auto
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
GEMINI_API_KEY=$GEMINI_API_KEY
GEMINI_MODEL=gemini-3.6-flash
LOG_LEVEL=INFO
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_IMPORT_ROWS=10000
FORECAST_MIN_HISTORY_DAYS=14
FORECAST_HORIZON_DAYS=30
EOF
chown ubuntu:ubuntu .env
chmod 600 .env

# Backups: optional S3 upload target + nightly schedule.
if [ -n "$BACKUP_BUCKET" ]; then
  cat > /home/ubuntu/.aicfo-backup.env <<EOF
BACKUP_S3_BUCKET=$BACKUP_BUCKET
BACKUP_RETENTION_DAYS=7
EOF
  chown ubuntu:ubuntu /home/ubuntu/.aicfo-backup.env
  chmod 600 /home/ubuntu/.aicfo-backup.env
fi

chmod +x deploy/*.sh
sudo -u ubuntu bash -c '(crontab -l 2>/dev/null | grep -v aicfo-backup; echo "15 2 * * * \$HOME/aicfo/deploy/backup.sh >> \$HOME/aicfo-backup.log 2>&1") | crontab -'

# ── 7. Build and start the stack ───────────────────────────────────────────
log "Building and starting the Docker Compose stack ..."
sudo -u ubuntu docker compose -f docker-compose.prod.yml up -d --build

# ── 8. Wait for the backend health endpoint (inside the Docker network) ────
log "Waiting for backend /health ..."
for i in $(seq 1 30); do
  if sudo -u ubuntu docker compose -f docker-compose.prod.yml exec -T backend \
      python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health', timeout=5).status==200 else 1)"; then
    log "Stack is healthy (backend /health OK)."
    exit 0
  fi
  sleep 10
done

log "WARNING: stack did not become healthy within 5 minutes."
log "Inspect with: docker compose -f docker-compose.prod.yml ps"
log "and:        docker compose -f docker-compose.prod.yml logs --tail=100"
exit 1
