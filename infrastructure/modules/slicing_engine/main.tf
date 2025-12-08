# --- ECR REPOSITORY  ---
resource "aws_ecr_repository" "slicer" {
  name                 = "${var.project_name}-slicer"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# --- LOGGING ---
resource "aws_cloudwatch_log_group" "slicer" {
  name              = "/ecs/${var.project_name}-${var.environment}-slicer"
  retention_in_days = 7
}

# --- ECS CLUSTER ---
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"
}

# --- ECS TASK DEFINITION ---
resource "aws_ecs_task_definition" "slicer" {
  family                   = "${var.project_name}-${var.environment}-slicer-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  
  cpu    = 2048 # 2 vCPU
  memory = 4096 # 4 GB
  
  execution_role_arn = aws_iam_role.ecs_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "slicer"
      image     = "${aws_ecr_repository.slicer.repository_url}:latest"
      essential = true
      
      # Optional: Only needed if you have a healthcheck or web server in the container
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }
      ],

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.slicer.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      environment = [
        # --- INFRASTRUCTURE CONFIG (Managed by Terraform) ---
        { name = "AWS_REGION",       value = var.region },
        { name = "CONFIG_BUCKET",    value = var.config_bucket_name },
        { name = "PROCESSED_BUCKET", value = var.processed_bucket_name },
        { name = "UPLOADS_BUCKET",   value = var.uploads_bucket_name },
        
        # --- APP DEFAULTS ---
        { name = "FILAMENT_CONFIG_PATH", value = "filament.json" },
        { name = "PROCESS_CONFIG_PATH",  value = "process.json" },
        { name = "MACHINE_CONFIG_PATH",  value = "machine.json" },
        
        # --- DYNAMIC PLACEHOLDERS (To be overridden by Step Function) ---
        # We set defaults here so the task doesn't crash if run manually,
        # but the Step Function will inject the real Job ID and paths.
        { name = "JOB_ID",           value = "placeholder" },
        { name = "STL_FILE_PATH",    value = "placeholder" },
        { name = "OUTPUT_FILE_NAME", value = "placeholder" }
      ]
    }
  ])
}