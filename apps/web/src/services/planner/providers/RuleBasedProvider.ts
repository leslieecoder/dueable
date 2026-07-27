import type { AssignmentPlan, AssignmentPlanTask, PlannerDifficulty } from "@dueable/types";
import type { AIProvider } from "@/services/planner/providers/AIProvider";
import type { PlannerAssignment } from "@/services/planner/types";

function inferAssignmentType(assignment: PlannerAssignment) {
  const content = `${assignment.title} ${assignment.description}`.toLowerCase();

  if (content.includes("research paper")) {
    return "Research Paper";
  }

  if (content.includes("presentation")) {
    return "Presentation";
  }

  if (content.includes("programming") || content.includes("coding") || content.includes("software") || content.includes("build feature")) {
    return "Programming";
  }

  return "General Assignment";
}

function estimateDifficulty(estimatedHours: number): PlannerDifficulty {
  if (estimatedHours >= 8) {
    return "High";
  }

  if (estimatedHours >= 4) {
    return "Medium";
  }

  return "Low";
}

function toTasks(steps: Array<{ title: string; description: string; estimatedMinutes: number }>): AssignmentPlanTask[] {
  return steps.map((step, index) => ({
    ...step,
    order: index + 1,
  }));
}

function buildTasks(assignmentType: string): AssignmentPlanTask[] {
  if (assignmentType === "Research Paper") {
    return toTasks([
      { title: "Choose Topic", description: "Select a focused research topic.", estimatedMinutes: 30 },
      { title: "Find Sources", description: "Gather credible sources that match the topic.", estimatedMinutes: 45 },
      { title: "Read Sources", description: "Review sources and capture the most useful ideas.", estimatedMinutes: 60 },
      { title: "Create Outline", description: "Organize the main argument and supporting points.", estimatedMinutes: 40 },
      { title: "Write Draft", description: "Draft the paper section by section.", estimatedMinutes: 90 },
      { title: "Revise", description: "Improve clarity, flow, and evidence use.", estimatedMinutes: 45 },
      { title: "Proofread", description: "Check grammar, formatting, and citations.", estimatedMinutes: 30 },
      { title: "Submit", description: "Do a final check and submit the assignment.", estimatedMinutes: 10 },
    ]);
  }

  if (assignmentType === "Presentation") {
    return toTasks([
      { title: "Research Topic", description: "Collect the main ideas and supporting facts.", estimatedMinutes: 45 },
      { title: "Create Slides", description: "Build a clear slide structure with concise content.", estimatedMinutes: 75 },
      { title: "Practice", description: "Rehearse the talk and time the delivery.", estimatedMinutes: 45 },
      { title: "Revise", description: "Tighten the slides and speaking points.", estimatedMinutes: 30 },
      { title: "Present", description: "Prepare the final version and present confidently.", estimatedMinutes: 20 },
    ]);
  }

  if (assignmentType === "Programming") {
    return toTasks([
      { title: "Understand Requirements", description: "Read the assignment carefully and identify constraints.", estimatedMinutes: 30 },
      { title: "Plan Solution", description: "Sketch the implementation approach before coding.", estimatedMinutes: 35 },
      { title: "Build Feature", description: "Implement the core functionality in small pieces.", estimatedMinutes: 90 },
      { title: "Test", description: "Run the code and verify expected behavior.", estimatedMinutes: 40 },
      { title: "Debug", description: "Fix issues found during testing.", estimatedMinutes: 45 },
      { title: "Refactor", description: "Clean up the implementation for readability and maintainability.", estimatedMinutes: 30 },
      { title: "Submit", description: "Review deliverables and submit the final work.", estimatedMinutes: 10 },
    ]);
  }

  return toTasks([
    { title: "Review Assignment", description: "Understand the instructions, deliverables, and due date.", estimatedMinutes: 20 },
    { title: "Break Down Requirements", description: "List the main parts of the work that need to be completed.", estimatedMinutes: 30 },
    { title: "Draft a First Pass", description: "Create an initial version or rough work product.", estimatedMinutes: 60 },
    { title: "Revise and Improve", description: "Refine the work based on gaps or weak spots.", estimatedMinutes: 40 },
    { title: "Proofread and Submit", description: "Do a final quality check and submit on time.", estimatedMinutes: 20 },
  ]);
}

export class RuleBasedProvider implements AIProvider {
  readonly name = "rule_based";

  async generatePlan(assignment: PlannerAssignment): Promise<AssignmentPlan> {
    const type = inferAssignmentType(assignment);
    const tasks = buildTasks(type);
    const estimatedHours = Math.max(assignment.estimatedHours, Math.ceil(tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) / 60));
    const estimatedDays = Math.max(1, Math.min(tasks.length, Math.ceil(estimatedHours / 2)));

    return {
      type,
      title: assignment.title,
      estimatedHours,
      estimatedDays,
      difficulty: estimateDifficulty(estimatedHours),
      tasks,
    };
  }
}