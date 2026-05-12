variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "github_repository" {
  description = "Full GitHub repo URL, e.g. https://github.com/your-username/your-repo"
  type        = string
}

variable "github_token" {
  description = "GitHub Personal Access Token with repo + admin:repo_hook scopes. Mark sensitive so it never appears in plan output."
  type        = string
  sensitive   = true
}

variable "github_branch" {
  description = "Git branch to auto-deploy for this environment (e.g. develop for dev, main for prod)"
  type        = string
}

variable "rest_api_endpoint" {
  description = "NEXT_PUBLIC_REST_API_ENDPOINT injected into the Amplify build"
  type        = string
}

variable "websocket_url" {
  description = "NEXT_PUBLIC_WEBSOCKET_URL injected into the Amplify build"
  type        = string
}
