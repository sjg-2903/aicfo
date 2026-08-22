# ─────────────────────────────────────────────────────────────────────────
# AI CFO — secrets: generated once by Terraform, stored as SSM SecureString.
#
# The EC2 bootstrap reads these and writes the Compose .env (mode 600).
# They are never committed to Git; they live in the Terraform state as well,
# so keep the state file private (local file mode 600, or an S3 backend with
# server-side encryption — recommended).
# Rotate manually in the console via: aws ssm put-parameter ... --overwrite
# (changes are not reverted by Terraform thanks to ignore_changes below).
# ─────────────────────────────────────────────────────────────────────────

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "mongo_root_password" {
  length  = 32
  special = false
}

resource "random_password" "mongo_app_password" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "${trimsuffix(var.ssm_path_prefix, "/")}/jwt_secret"
  type  = "SecureString"
  value = random_password.jwt_secret.result

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "mongo_root_password" {
  name  = "${trimsuffix(var.ssm_path_prefix, "/")}/mongo_root_password"
  type  = "SecureString"
  value = random_password.mongo_root_password.result

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "mongo_app_password" {
  name  = "${trimsuffix(var.ssm_path_prefix, "/")}/mongo_app_password"
  type  = "SecureString"
  value = random_password.mongo_app_password.result

  lifecycle {
    ignore_changes = [value]
  }
}

# Optional credentials — created only when a value is provided.
# Pass them with TF_VAR_openai_api_key / TF_VAR_gemini_api_key so they are
# never written into a file (tfvars files are git-ignored as well).
resource "aws_ssm_parameter" "openai_api_key" {
  count   = var.openai_api_key != "" ? 1 : 0
  name    = "${trimsuffix(var.ssm_path_prefix, "/")}/openai_api_key"
  type    = "SecureString"
  value   = var.openai_api_key
  overwrite = true

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "gemini_api_key" {
  count     = var.gemini_api_key != "" ? 1 : 0
  name      = "${trimsuffix(var.ssm_path_prefix, "/")}/gemini_api_key"
  type      = "SecureString"
  value     = var.gemini_api_key
  overwrite = true

  lifecycle {
    ignore_changes = [value]
  }
}
