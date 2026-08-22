# ─────────────────────────────────────────────────────────────────────────
# AI CFO — provider, network, security groups, EC2 instance, EIP, user data
# ─────────────────────────────────────────────────────────────────────────

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# Ubuntu 24.04 LTS (Noble)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# ── Network ─────────────────────────────────────────────────────────────────

resource "aws_vpc" "app" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "app" {
  vpc_id = aws_vpc.app.id
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.app.id
  cidr_block              = var.subnet_cidr
  availability_zone       = var.availability_zone != "" ? var.availability_zone : data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.app.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.app.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ── Security groups ─────────────────────────────────────────────────────────

resource "aws_security_group" "app" {
  name        = "${var.project}-${var.environment}-app"
  description = "AI CFO application server"
  vpc_id      = aws_vpc.app.id

  ingress {
    description = "HTTP from the internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from the internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH is optional; SSM Session Manager is used instead by default.
  dynamic "ingress" {
    for_each = length(var.allowed_ssh_cidrs) > 0 ? [1] : []
    content {
      description = "SSH (optional, restricted to allowed CIDRs)"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = var.allowed_ssh_cidrs
    }
  }

  egress {
    description = "All outbound (apt, Docker Hub, GitHub, SSM, AI providers)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── Compute ─────────────────────────────────────────────────────────────────

resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = aws_iam_instance_profile.app.name
  associate_public_ip_address = true
  key_name                    = var.key_name != "" ? var.key_name : null
  user_data                   = local.user_data
  user_data_replace_on_change = true

  root_block_device {
    volume_size           = var.root_volume_size_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  # Require IMDSv2 tokens (SSRF hardening).
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name = "${var.project}-${var.environment}-app"
  }
}

# Static IP: survives instance replacement and is the app's public endpoint.
resource "aws_eip" "app" {
  domain = "vpc"
  tags = {
    Name = "${var.project}-${var.environment}-eip"
  }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}

# Dedicated data disk: Docker volumes (MongoDB, Caddy certs) live here so an
# instance replacement (for example an AMI/type change) keeps the database.
resource "aws_ebs_volume" "data" {
  availability_zone = aws_subnet.public.availability_zone
  size              = var.data_volume_size_gb
  type              = "gp3"
  encrypted         = true

  tags = {
    Name = "${var.project}-${var.environment}-docker-data"
  }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.app.id
}

# ── User data (cloud-init), rendered from deploy/bootstrap.sh ───────────────
# @@TOKEN@@ placeholders are replaced with replace() so Terraform
# interpolation never conflicts with shell variable syntax in the script.
locals {
  route53_zone_name = var.route53_zone_name != "" ? var.route53_zone_name : (
    var.domain_name != ""
    ? join(".", slice(split(".", var.domain_name), 1, length(split(".", var.domain_name))))
    : ""
  )
  # Public origin: custom domain when configured, otherwise the Elastic IP.
  origin = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_eip.app.public_ip}"

  user_data = replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  file("${path.module}/../../deploy/bootstrap.sh"),
                  "@@REGION@@", var.aws_region
                ),
                "@@REPO_URL@@", var.git_repo_url
              ),
              "@@BRANCH@@", var.git_branch
            ),
            "@@SSM_PREFIX@@", var.ssm_path_prefix
          ),
          "@@DOMAIN@@", var.domain_name
        ),
        "@@CORS_ORIGINS@@", local.origin
      ),
      "@@BACKUP_BUCKET@@", var.backup_bucket_name
    ),
    "@@ADMIN_EMAILS@@", var.admin_emails
  )
}
