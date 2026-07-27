import type { Assignment, AssignmentPlan } from "@dueable/types";

export type PlannerAssignment = Assignment;
export type PlannerPlan = AssignmentPlan;

export interface PlannerGenerationResult {
  plan: PlannerPlan;
  provider: string;
  fallbackUsed: boolean;
}