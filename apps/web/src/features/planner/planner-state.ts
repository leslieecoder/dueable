export interface PlannerActionState {
  status: "idle" | "error" | "success";
  message?: string;
}

export const initialPlannerActionState: PlannerActionState = {
  status: "idle",
};