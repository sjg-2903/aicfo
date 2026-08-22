output "instance_id" {
  description = "EC2 instance id (also the value for the GitHub Actions secret EC2_INSTANCE_ID)."
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Elastic IP of the app server."
  value       = aws_eip.app.public_ip
}

output "public_url" {
  description = "URL to open in a browser (HTTP on the IP, or HTTPS on the custom domain)."
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_eip.app.public_ip}"
}

output "ssm_path_prefix" {
  description = "SSM Parameter Store path holding the production secrets."
  value       = var.ssm_path_prefix
}

output "ssm_session_command" {
  description = "Open a shell on the server without SSH (recommended default)."
  value       = "aws ssm start-session --target ${aws_instance.app.id} --region ${var.aws_region}"
}

output "route53_zone_id" {
  description = "Hosted zone used for the custom domain (only when domain_name is set)."
  value       = var.domain_name != "" ? data.aws_route53_zone.app[0].zone_id : null
}

output "backup_bucket" {
  description = "Off-site backup bucket (only when backup_bucket_name is set)."
  value       = var.backup_bucket_name != "" ? aws_s3_bucket.backup[0].bucket : null
}
