"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { generateChecklistPlanAction } from "@/features/assignments/actions";
import { initialPlannerActionState } from "@/features/planner/planner-state";

function SubmitButton({ hasTasks }: { hasTasks: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-[18px] bg-[#2d6cdf] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#245ec6] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Building your steps..." : hasTasks ? "Refresh my steps" : "Create my steps"}
      </button>
      <p className="text-xs leading-5 text-[#7b88a2]" aria-live="polite">
        {pending ? "Turning this assignment into smaller steps..." : "Dueable can draft a starter checklist so you do not have to plan from scratch."}
      </p>
    </div>
  );
}

export function PlannerForm({ assignmentId, hasTasks }: { assignmentId: string; hasTasks: boolean }) {
  const [state, formAction] = useActionState(generateChecklistPlanAction, initialPlannerActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="mode" value={hasTasks ? "replace" : "append"} />
      <SubmitButton hasTasks={hasTasks} />
      {state.message ? (
        <p className={state.status === "error" ? "text-sm text-rose-600" : "text-sm text-emerald-700"} aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}