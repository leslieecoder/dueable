import type { PriorityLevel } from "@/services/priority/PriorityService";
import { getAssignmentDetail } from "@/features/assignments/data";
import { getPrioritizedAssignments } from "@/services/priority/PrioritizedAssignmentsService";

export interface StudentFocusAction {
  title: string;
  estimatedMinutes: number;
}

export interface StudentFocusResult {
  assignment: {
    id: string;
    title: string;
    courseTitle: string;
    dueDate: string;
    estimatedHours: number;
    pointsPossible: number | null;
    completedSteps: number;
    totalSteps: number;
  };
  priority: {
    level: PriorityLevel;
    factors: string[];
  };
  explanation: string;
  recommendedAction: StudentFocusAction;
}

export interface StudentFocusService {
  getStudentFocus(): Promise<StudentFocusResult | null>;
}

class DefaultStudentFocusService implements StudentFocusService {
  async getStudentFocus(): Promise<StudentFocusResult | null> {
    const prioritizedAssignments = await getPrioritizedAssignments();
    const topAssignment = prioritizedAssignments.find((entry) => entry.assignment.status !== "completed");

    if (!topAssignment) {
      return null;
    }

    const assignmentDetail = await getAssignmentDetail(topAssignment.assignment.id);

    if (!assignmentDetail) {
      return null;
    }

    return {
      assignment: {
        id: assignmentDetail.id,
        title: assignmentDetail.title,
        courseTitle: assignmentDetail.courseTitle,
        dueDate: assignmentDetail.dueDate,
        estimatedHours: assignmentDetail.estimatedHours,
        pointsPossible: assignmentDetail.pointsPossible,
        completedSteps: assignmentDetail.completedTasks,
        totalSteps: assignmentDetail.totalTasks,
      },
      priority: {
        level: topAssignment.priorityLevel,
        factors: buildRecommendationFactors(topAssignment.reasons),
      },
      explanation: buildRecommendationExplanation(assignmentDetail.title, topAssignment.reasons),
      recommendedAction: buildRecommendedAction(assignmentDetail),
    } satisfies StudentFocusResult;
  }
}

function buildRecommendationFactors(reasons: string[]) {
  const factors: string[] = [];

  for (const reason of reasons) {
    const factor = mapReasonToFactor(reason);

    if (!factor || factors.includes(factor)) {
      continue;
    }

    factors.push(factor);

    if (factors.length === 4) {
      break;
    }
  }

  return factors;
}

function buildRecommendationExplanation(title: string, reasons: string[]) {
  const factors = buildRecommendationFactors(reasons).slice(0, 3);

  if (factors.length === 0) {
    return `Start ${title} because it is the clearest place to make progress today.`;
  }

  return `Start ${title} because ${joinFactors(factors)}.`;
}

function mapReasonToFactor(reason: string): string | null {
  switch (reason) {
    case "Recently past due":
      return "the deadline just passed";
    case "Past due":
      return "the deadline has already passed";
    case "Past due for more than two weeks":
      return "it has been unresolved for a while";
    case "Due within 24 hours":
      return "it is due very soon";
    case "Due within 3 days":
      return "it is due soon";
    case "Due within 7 days":
      return "the deadline is coming up";
    case "Due within 14 days":
      return "it is worth preparing for now";
    case "High point value":
      return "it could have a strong impact on your grade";
    case "Moderate point value":
      return "it carries meaningful grade weight";
    case "Low point value":
      return "it still counts toward your course grade";
    case "Large estimated workload":
      return "it needs preparation time";
    case "Moderate estimated workload":
      return "it will take more than one quick sitting";
    case "Small estimated workload":
      return "you could make progress on it quickly";
    case "Not started yet":
      return "you have not started it yet";
    case "Already started":
      return "you already have momentum on it";
    default:
      return null;
  }
}

function joinFactors(factors: string[]) {
  if (factors.length === 1) {
    return factors[0];
  }

  if (factors.length === 2) {
    return `${factors[0]} and ${factors[1]}`;
  }

  return `${factors.slice(0, -1).join(", ")}, and ${factors[factors.length - 1]}`;
}

function buildRecommendedAction(assignmentDetail: {
  title: string;
  estimatedHours: number;
  checklist: Array<{
    title: string;
    completed: boolean;
    estimatedMinutes: number;
  }>;
}) {
  const firstIncompleteTask = assignmentDetail.checklist.find((task) => !task.completed);

  if (firstIncompleteTask) {
    return {
      title: firstIncompleteTask.title,
      estimatedMinutes: firstIncompleteTask.estimatedMinutes,
    } satisfies StudentFocusAction;
  }

  if (assignmentDetail.estimatedHours >= 6) {
    return {
      title: `Break down ${assignmentDetail.title} into a smaller first step`,
      estimatedMinutes: 20,
    } satisfies StudentFocusAction;
  }

  return {
    title: "Review assignment requirements",
    estimatedMinutes: 15,
  } satisfies StudentFocusAction;
}

export function createStudentFocusService(): StudentFocusService {
  return new DefaultStudentFocusService();
}

export async function getStudentFocus() {
  return createStudentFocusService().getStudentFocus();
}