output "ecr_repository_url" {
  value = aws_ecr_repository.slicer.repository_url
}
# output "step_function_arn" {
#   value = aws_sfn_state_machine.slicing_orchestrator.arn
# }