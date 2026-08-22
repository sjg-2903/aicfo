# ─────────────────────────────────────────────────────────────────────────
# AI CFO — IAM role for the EC2 instance:
#   • AmazonSSMManagedInstanceCore  -> Session Manager shell + SSM deploys
#   • Read secrets from SSM Parameter Store (/aicfo/prod/*)
#   • (optional) write backups to the S3 bucket
# ─────────────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${var.project}-${var.environment}-app"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "app" {
  statement {
    sid     = "ReadAicfoSecrets"
    effect  = "Allow"
    actions = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = [
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${trimsuffix(var.ssm_path_prefix, "/")}/*"
    ]
  }

  statement {
    sid       = "DecryptDefaultSsmKey"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["arn:aws:kms:${var.aws_region}:${data.aws_caller_identity.current.account_id}:alias/aws/ssm"]
  }

  dynamic "statement" {
    for_each = var.backup_bucket_name != "" ? [1] : []
    content {
      sid       = "UploadDatabaseBackups"
      effect    = "Allow"
      actions   = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
      resources = [aws_s3_bucket.backup[0].arn, "${aws_s3_bucket.backup[0].arn}/*"]
    }
  }
}

resource "aws_iam_policy" "app" {
  name   = "${var.project}-${var.environment}-app"
  policy = data.aws_iam_policy_document.app.json
}

resource "aws_iam_role_policy_attachment" "app" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.app.arn
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.project}-${var.environment}-app"
  role = aws_iam_role.app.name
}
