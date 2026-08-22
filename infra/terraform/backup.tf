# ─────────────────────────────────────────────────────────────────────────
# AI CFO — optional off-site backup bucket (created only when
# var.backup_bucket_name is set). The nightly backup script uploads MongoDB
# dumps here via the instance profile.
# ─────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "backup" {
  count  = var.backup_bucket_name != "" ? 1 : 0
  bucket = var.backup_bucket_name
}

resource "aws_s3_bucket_public_access_block" "backup" {
  count                   = var.backup_bucket_name != "" ? 1 : 0
  bucket                  = aws_s3_bucket.backup[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "backup" {
  count  = var.backup_bucket_name != "" ? 1 : 0
  bucket = aws_s3_bucket.backup[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  count  = var.backup_bucket_name != "" ? 1 : 0
  bucket = aws_s3_bucket.backup[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
