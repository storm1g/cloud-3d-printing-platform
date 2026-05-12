output "amplify_app_id" {
  value = aws_amplify_app.frontend.id
}

output "amplify_default_domain" {
  description = "The default Amplify URL for this branch: https://<branch>.<app-id>.amplifyapp.com"
  value       = "https://${aws_amplify_branch.this.branch_name}.${aws_amplify_app.frontend.default_domain}"
}
