import type { Task } from "@dueable/types";

export type ExtensionOverviewStep = Pick<Task, "id" | "title" | "description" | "estimatedMinutes" | "completed" | "order">;

export interface ExtensionOverviewFocus {
  assignment: {
    id: string;
    title: string;
    course: string;
    courseColor: string | null;
    dueDate: string;
    dateLabel: string;
    assignmentUrl: string | null;
    points: number | null;
  };
  steps: ExtensionOverviewStep[];
  progress: {
    completedSteps: number;
    totalSteps: number;
  };
  estimatedHours: number;
  difficulty: string;
  priorityLabel: string;
  planProvider: string | null;
  badgeLabel: string | null;
}

export interface ExtensionOverviewAssignment {
  id: string;
  title: string;
  courseTitle: string;
  courseColor: string | null;
  dueDate: string;
  dateLabel: string;
  assignmentUrl: string | null;
  estimatedHours: number;
  pointsPossible: number | null;
  difficulty: string;
  priorityLabel: string;
  planProvider: string | null;
  badgeLabel: string | null;
  steps: ExtensionOverviewStep[];
  progress: {
    completedSteps: number;
    totalSteps: number;
  };
}

export interface ExtensionOverviewResponse {
  synced: boolean;
  userName?: string;
  focus: ExtensionOverviewFocus | null;
  upcoming: ExtensionOverviewAssignment[];
  workAhead: ExtensionOverviewAssignment[];
  overdue: ExtensionOverviewAssignment[];
  closedOverdue: ExtensionOverviewAssignment[];
  error?: string;
}

export interface FormattedUpcomingAssignment extends ExtensionOverviewAssignment {
  formattedDueText: string;
  formattedPoints: string | null;
}