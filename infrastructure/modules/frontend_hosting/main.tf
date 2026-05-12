# =============================================================================
# AMPLIFY HOSTING — Frontend (Next.js SSR)
#
# AWS Amplify Hosting handles:
#   - Building the Next.js app on every git push to the tracked branch
#   - Serving it with SSR support (platform = "WEB_COMPUTE")
#   - TLS certificate + CDN in front automatically
#
# Why WEB_COMPUTE instead of WEB?
#   WEB = static files only (like S3 + CloudFront).
#   WEB_COMPUTE = runs a Node.js server behind the scenes, which is required
#   for Next.js App Router server components and API routes.
#   Our app uses Next.js 15 App Router, so WEB_COMPUTE is mandatory.
# =============================================================================

resource "aws_amplify_app" "frontend" {
  name       = "${var.project_name}-frontend"
  repository = var.github_repository

  # GitHub Personal Access Token — marked sensitive in variables.tf so
  # Terraform never prints it in plan/apply output.
  access_token = var.github_token

  platform = "WEB_COMPUTE"

  # ---------------------------------------------------------------------------
  # Build spec — tells Amplify how to install, build, and where to find output.
  #
  # Our repo is a monorepo: the Next.js app lives under apps/frontend/.
  # We use `cd apps/frontend` as the first step so all npm commands run there.
  #
  # baseDirectory: after `npm run build`, Next.js outputs to apps/frontend/.next
  # The `**/*` glob captures everything Amplify needs to serve the app.
  # ---------------------------------------------------------------------------
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - cd apps/frontend
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: apps/frontend/.next
        files:
          - '**/*'
      cache:
        paths:
          - apps/frontend/node_modules/**/*
          - apps/frontend/.next/cache/**/*
  EOT

  # ---------------------------------------------------------------------------
  # Environment variables injected at BUILD TIME.
  #
  # These become available as process.env.NEXT_PUBLIC_* during the build.
  # Because they're prefixed with NEXT_PUBLIC_, Next.js also inlines them into
  # the client bundle — the browser can read them without a server roundtrip.
  #
  # IMPORTANT: If the API Gateway endpoints ever change (e.g. new deployment),
  # update these here and re-trigger the Amplify build. The values are baked
  # into the JS bundle at build time, not resolved at runtime.
  # ---------------------------------------------------------------------------
  environment_variables = {
    NEXT_PUBLIC_REST_API_ENDPOINT = var.rest_api_endpoint
    NEXT_PUBLIC_WEBSOCKET_URL     = var.websocket_url
    # Tell Next.js we're running on Amplify's SSR compute platform
    _CUSTOM_IMAGE   = "amplify:al2023"
    AMPLIFY_MONOREPO_APP_ROOT = "apps/frontend"
  }
}

# =============================================================================
# AMPLIFY BRANCH
#
# An aws_amplify_branch links a specific git branch to this Amplify app.
# When you push to this branch on GitHub, Amplify automatically:
#   1. Pulls the latest code
#   2. Runs the build_spec above
#   3. Deploys the result
#
# enable_auto_build = true is what makes CI/CD happen automatically.
# Without it, you'd have to trigger deploys manually from the console.
#
# stage = "DEVELOPMENT" is a label — it affects how Amplify logs and
# displays the environment in the console. Use "PRODUCTION" for the main branch.
# =============================================================================
resource "aws_amplify_branch" "this" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = var.github_branch

  stage             = var.environment == "prod" ? "PRODUCTION" : "DEVELOPMENT"
  enable_auto_build = true
}
