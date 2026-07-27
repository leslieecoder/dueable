import type { Task } from "@dueable/types";

export type ExtensionOverviewStep = Pick<Task, "id" | "title" | "description" | "estimatedMinutes" | "completed" | "order">;

export interface ExtensionOverviewFocus {
  assignment: {
    id: string;
    title: string;
    course: string;
    dueDate: string;
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
}

export interface ExtensionOverviewAssignment {
  id: string;
  title: string;
  courseTitle: string;
  dueDate: string;
  estimatedHours: number;
  pointsPossible: number | null;
  difficulty: string;
}

export interface ExtensionOverviewResponse {
  synced: boolean;
  focus: ExtensionOverviewFocus | null;
  upcoming: ExtensionOverviewAssignment[];
  error?: string;
}

export interface FormattedUpcomingAssignment extends ExtensionOverviewAssignment {
  formattedDueDate: string;
  formattedPoints: string | null;
}