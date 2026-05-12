variable "github_repository" {
  description = "Full GitHub repo URL, e.g. https://github.com/your-username/your-repo"
  type        = string
}

variable "github_token" {
  description = "GitHub PAT with repo + admin:repo_hook scopes"
  type        = string
  sensitive   = true
}

variable "github_branch" {
  description = "Branch Amplify watches for auto-deploy"
  type        = string
  default     = "develop"
}
