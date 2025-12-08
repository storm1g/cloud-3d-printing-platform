# --- 1. EXECUTION ROLE (The Agent) ---
# Used by Fargate to pull the Docker image and write logs
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-${var.environment}-ecs-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# --- 2. TASK ROLE (The Application) ---
# Used by the Python script to talk to S3
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# CUSTOM POLICY: S3 Access for the Slicer Task
resource "aws_iam_policy" "slicer_s3_access" {
  name = "${var.project_name}-${var.environment}-slicer-s3-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadInputFiles"
        Effect = "Allow"
        Action = "s3:GetObject"
        Resource = [
          "${var.config_bucket_arn}/*",
          "${var.uploads_bucket_arn}/*"
        ]
      },
      {
        Sid    = "WriteOutputFiles"
        Effect = "Allow"
        Action = "s3:PutObject"
        Resource = "${var.processed_bucket_arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "task_s3" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.slicer_s3_access.arn
}