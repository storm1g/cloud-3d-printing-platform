# --- IAM ROLE FOR STEP FUNCTIONS ---
# The Step Function needs its own identity so AWS knows what it's allowed to do.
# The "trust policy" (assume_role_policy) says: "only the Step Functions service
# can use this role" — not a human, not Lambda, only Step Functions.
resource "aws_iam_role" "sfn_role" {
  name = "${var.project_name}-${var.environment}-sfn-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "states.amazonaws.com" }
    }]
  })
}

# What the Step Function is ALLOWED to do:
# 1. RunTask  — actually launch the Fargate container
# 2. PassRole — hand the ECS execution + task roles to Fargate when launching
# 3. EventBridge rules — required for the .sync integration (so Step Functions
#    can subscribe to ECS task completion events instead of polling manually)
resource "aws_iam_policy" "sfn_policy" {
  name = "${var.project_name}-${var.environment}-sfn-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "RunECSTask"
        Effect   = "Allow"
        Action   = ["ecs:RunTask"]
        Resource = [aws_ecs_task_definition.slicer.arn]
      },
      {
        Sid    = "PassRolesToECS"
        Effect = "Allow"
        Action = ["iam:PassRole"]
        Resource = [
          aws_iam_role.ecs_execution_role.arn,
          aws_iam_role.ecs_task_role.arn
        ]
      },
      {
        Sid    = "AllowECSSyncViaEventBridge"
        Effect = "Allow"
        Action = [
          "events:PutTargets",
          "events:PutRule",
          "events:DescribeRule"
        ]
        # AWS creates this specific rule automatically for ECS sync integrations
        Resource = ["arn:aws:events:${var.region}:*:rule/StepFunctionsGetEventsForECSTaskRule"]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sfn_policy" {
  role       = aws_iam_role.sfn_role.name
  policy_arn = aws_iam_policy.sfn_policy.arn
}

# --- STATE MACHINE ---
# The definition is the workflow itself, written in Amazon States Language (ASL).
# We use jsonencode() so Terraform can inject resource references directly
# instead of hardcoding ARNs like in your personal account version.
resource "aws_sfn_state_machine" "slicing_orchestrator" {
  name     = "${var.project_name}-${var.environment}-orchestrator"
  role_arn = aws_iam_role.sfn_role.arn

  definition = jsonencode({
    Comment = "Runs the Slicer Fargate Task and waits for it to complete."
    StartAt = "RunSlicingTask"
    States = {
      RunSlicingTask = {
        Type = "Task"
        # .sync means: launch the task AND wait for it to finish before moving on.
        # Without .sync it would fire-and-forget (the old version had this problem).
        Resource = "arn:aws:states:::ecs:runTask.sync"
        Parameters = {
          LaunchType     = "FARGATE"
          Cluster        = aws_ecs_cluster.main.arn
          TaskDefinition = aws_ecs_task_definition.slicer.arn
          NetworkConfiguration = {
            AwsvpcConfiguration = {
              Subnets        = var.public_subnet_ids
              SecurityGroups = [var.security_group_id]
              AssignPublicIp = "ENABLED"
            }
          }
          Overrides = {
            ContainerOverrides = [
              {
                Name = "slicer"
                Environment = [
                  # Static values: same for every job, known at deploy time
                  { Name = "AWS_REGION",           Value    = var.region },
                  { Name = "CONFIG_BUCKET",         Value    = var.config_bucket_name },
                  { Name = "UPLOADS_BUCKET",        Value    = var.uploads_bucket_name },
                  { Name = "PROCESSED_BUCKET",      Value    = var.processed_bucket_name },
                  # Dynamic values: the ".$" suffix means "read from the Step Function
                  # input JSON at runtime" — these come from whoever starts the execution
                  { Name = "JOB_ID",               "Value.$" = "$.JobId" },
                  { Name = "STL_FILE_PATH",        "Value.$" = "$.StlFilePath" },
                  { Name = "MACHINE_CONFIG_PATH",  "Value.$" = "$.MachineConfigPath" },
                  { Name = "PROCESS_CONFIG_PATH",  "Value.$" = "$.ProcessConfigPath" },
                  { Name = "FILAMENT_CONFIG_PATH", "Value.$" = "$.FilamentConfigPath" },
                  { Name = "OUTPUT_FILE_NAME",     "Value.$" = "$.OutputFileName" }
                ]
              }
            ]
          }
        }
        End = true
      }
    }
  })
}
