import type { PlannerAssignment, PlannerPlan } from "@/services/planner/types";

export interface AIProvider {
  readonly name: string;
  generatePlan(assignment: PlannerAssignment): Promise<PlannerPlan>;
}