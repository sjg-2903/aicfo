# ─────────────────────────────────────────────────────────────────────────
# AI CFO — optional custom domain:
#   ACM certificate (DNS validation) + Route 53 A records; automatic HTTPS
#   is then handled by Caddy on the instance (DOMAIN is injected at
#   bootstrap). Everything here is created only when var.domain_name is set
#   and the hosted zone exists in Route 53.
# ─────────────────────────────────────────────────────────────────────────

resource "aws_acm_certificate" "app" {
  count                     = var.domain_name != "" ? 1 : 0
  domain_name               = var.domain_name
  subject_alternative_names = var.enable_www ? ["www.${var.domain_name}"] : []
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_route53_zone" "app" {
  count = var.domain_name != "" ? 1 : 0
  name  = local.route53_zone_name
}

resource "aws_route53_record" "cert_validation" {
  count = var.domain_name != "" ? length(aws_acm_certificate.app[0].domain_validation_options) : 0

  name    = aws_acm_certificate.app[0].domain_validation_options[count.index].resource_record_name
  type    = aws_acm_certificate.app[0].domain_validation_options[count.index].resource_record_type
  zone_id = data.aws_route53_zone.app[0].zone_id
  records = [aws_acm_certificate.app[0].domain_validation_options[count.index].resource_record_value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "app" {
  count                   = var.domain_name != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.app[0].arn
  validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn
}

resource "aws_route53_record" "app" {
  count   = var.domain_name != "" ? 1 : 0
  name    = var.domain_name
  zone_id = data.aws_route53_zone.app[0].zone_id
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}

resource "aws_route53_record" "www" {
  count   = var.domain_name != "" && var.enable_www ? 1 : 0
  name    = "www.${var.domain_name}"
  zone_id = data.aws_route53_zone.app[0].zone_id
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}
