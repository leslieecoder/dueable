import type { Assignment } from "@dueable/types";
import { getAssignments } from "@/features/assignments/data";
import { createPriorityService, type PriorityLevel } from "@/services/priority/PriorityService";

export interface PrioritizedAssignment {
  assignment: Assignment;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  reasons: string[];
}

export async function getPrioritizedAssignments(): Promise<PrioritizedAssignment[]> {
  const assignments = await getAssignments();
  const priorityService = createPriorityService();

  return assignments
    .map((assignment) => {
      const priority = priorityService.calculatePriority(assignment);

      return {
        assignment,
        priorityScore: priority.score,
        priorityLevel: priority.priorityLevel,
        reasons: priority.reasons,
      } satisfies PrioritizedAssignment;
    })
    .sort((left, right) => right.priorityScore - left.priorityScore);
}