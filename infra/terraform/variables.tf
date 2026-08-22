# ─────────────────────────────────────────────────────────────────────────
# AI CFO — AWS deployment variables
# (defaults are tuned to keep monthly cost low; see DEPLOYMENT.md)
# ─────────────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region to deploy into (Mumbai is a good default for India)."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Short project name used in resource names/tags."
  type        = string
  default     = "aicfo"
}

variable "environment" {
  description = "Deployment environment (prod, staging, ...)."
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "subnet_cidr" {
  type    = string
  default = "10.20.1.0/24"
}

variable "availability_zone" {
  description = "AZ for the public subnet. Leave empty to use the first available."
  type        = string
  default     = ""
}

# ── Compute ─────────────────────────────────────────────────────────────────

variable "instance_type" {
  description = "EC2 instance type. t3.small is fine for this stack; t3.medium if the AI features get busy."
  type        = string
  default     = "t3.small"
}

variable "root_volume_size_gb" {
  description = "Size of the OS root volume."
  type        = number
  default     = 20
}

variable "data_volume_size_gb" {
  description = "Size of the dedicated EBS volume holding Docker data (MongoDB + Caddy). "
  type        = number
  default     = 30
}

variable "key_name" {
  description = "Optional existing EC2 key pair name. Leave empty to use SSM Session Manager only (recommended)."
  type        = string
  default     = ""
}

variable "allowed_ssh_cidrs" {
  description = "CIDRs allowed to SSH (only used when key_name is set). Default: no inbound SSH."
  type        = list(string)
  default     = []
}

# ── Application / secrets ───────────────────────────────────────────────────

variable "git_repo_url" {
  description = "Repository cloned by the EC2 bootstrap."
  type        = string
  default     = "https://github.com/sjg-2903/aicfo.git"
}

variable "git_branch" {
  type    = string
  default = "main"
}

variable "ssm_path_prefix" {
  description = "SSM Parameter Store path where secrets are stored/read."
  type        = string
  default     = "/aicfo/prod"
}

variable "openai_api_key" {
  description = "Optional. If set, stored in SSM (SecureString) and used by the backend. Prefer TF_VAR_openai_api_key to keep it out of files."
  type        = string
  default     = ""
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Optional. If set, stored in SSM (SecureString) and used by the backend."
  type        = string
  default     = ""
  sensitive   = true
}

variable "admin_emails" {
  description = "Optional comma-separated emails granted the ADMIN role."
  type        = string
  default     = ""
}

# ── Domain (optional) ───────────────────────────────────────────────────────

variable "domain_name" {
  description = "Optional public domain for the app (e.g. app.example.com). Empty = plain HTTP on the public IP."
  type        = string
  default     = ""
}

variable "route53_zone_name" {
  description = "Route 53 hosted zone name. If empty, derived from domain_name (e.g. app.example.com -> example.com)."
  type        = string
  default     = ""
}

variable "enable_www" {
  description = "Also create a www.<domain> A record."
  type        = bool
  default     = false
}

# ── Backups (optional) ──────────────────────────────────────────────────────

variable "backup_bucket_name" {
  description = "Optional S3 bucket for nightly MongoDB backups (must be globally unique). Empty = local backups only."
  type        = string
  default     = ""
}
