# AI CFO — AWS infrastructure (Terraform)

Deploys the full production stack to **one EC2 instance running Docker
Compose** (Caddy reverse proxy + FastAPI + MongoDB) with:

- VPC / public subnet / Internet Gateway / security groups
- EC2 instance (Ubuntu 24.04, IMDSv2 enforced, encrypted root volume)
- **Dedicated encrypted EBS data disk** for Docker volumes, so MongoDB data
  survives instance replacement
- Elastic IP (stable public address)
- IAM role: SSM Session Manager + read access to SSM secrets (+ optional S3
  backup uploads)
- Secrets in **SSM Parameter Store (SecureString)** — generated automatically
  (`JWT_SECRET`, MongoDB root/app passwords); never in Git
- cloud-init bootstrap (`deploy/bootstrap.sh`) — installs Docker, mounts the
  data disk, clones the repo, writes `.env`, starts the stack, installs the
  nightly backup cron
- Optional: Route 53 + ACM custom domain with automatic HTTPS (Caddy/Let's
  Encrypt), and an S3 bucket for off-site MongoDB backups

## Prerequisites

- AWS CLI with credentials (`aws sts get-caller-identity` should work)
- Terraform >= 1.5 — https://developer.hashicorp.com/terraform/downloads
- A Route 53 hosted zone **only if** you want a custom domain

## Quick start

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars (region, optional domain, bucket, ...)

terraform init
terraform plan
terraform apply
```

`apply` takes about 5–10 minutes (image download + npm build + Docker pulls).

When it finishes:

```bash
terraform output public_url     # open this in a browser
terraform output public_ip
terraform output ssm_session_command   # shell on the server without SSH
```

Optional AI keys (backend-only, never in files):

```bash
TF_VAR_openai_api_key="..." TF_VAR_gemini_api_key="..." terraform apply
```

## What got created (and where the secrets are)

| Resource | Location |
| --- | --- |
| Infrastructure state | `terraform.tfstate` (keep it private; move to S3 for teams — see `versions.tf`) |
| JWT secret + MongoDB passwords | SSM SecureString under `ssm_path_prefix` (default `/aicfo/prod/*`) |
| App `.env` | `/home/ubuntu/aicfo/.env` on the EC2 host (mode 600, re-hydrated on boot) |
| MongoDB data | EBS volume at `/var/lib/docker` (survives instance replacement) |
| Backups | `/home/ubuntu/aicfo-backups/` nightly, + S3 if configured |

## Everyday operations

```bash
# Shell on the server (no SSH key needed):
aws ssm start-session --target <instance_id> --region ap-south-1

# Logs:
sudo docker compose -f /home/ubuntu/aicfo/docker-compose.prod.yml logs -f caddy
sudo docker compose -f /home/ubuntu/aicfo/docker-compose.prod.yml logs -f backend

# Health:
curl http://<public-ip>/health
```

## Upgrades

- **Code change**: push to `main` → GitHub Actions rebuilds and restarts the
  stack (see `.github/workflows/deploy.yml`), or manually:
  `sudo -u ubuntu bash /home/ubuntu/aicfo/deploy/update.sh`
- **Server/DB size change**: edit `instance_type` / `data_volume_size_gb` in
  `terraform.tfvars` and `terraform apply`. The data disk keeps MongoDB data;
  the app instance is replaced (a few minutes of downtime).

> EBS gp3 volumes can only be *grown*. Re-applying with a smaller
> `data_volume_size_gb` is a no-op (and shrinking is not supported by EBS).

## Teardown

```bash
terraform destroy
```

`terraform destroy` deletes the instance, EIP, VPC, volumes, SSM parameters
**and** the EBS data disk — MongoDB data will be lost unless you kept a
backup (S3 bucket is also deleted when created by this config). To keep a
backup bucket after teardown, manage it outside this config or export the
last dump first.

## Security notes

- No inbound SSH by default; use SSM Session Manager (add `key_name` +
  `allowed_ssh_cidrs` if you need SSH).
- IMDSv2 is required; the EC2 role only has SSM/S3/secret-read scopes.
- Secrets are never committed; `.env` on the host is mode 600.
- Change the EIP/URL and remember: CORS origins are baked into `.env` at
  bootstrap — changing `domain_name` triggers a re-bootstrap.
- Rotate secrets manually in SSM (bootstrap picks them up on the next
  re-apply/re-boot; Terraform won't overwrite thanks to `ignore_changes`).
