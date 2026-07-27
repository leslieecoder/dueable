import { useEffect, useMemo, useState } from "react";
import { getDueableUrl } from "../lib/dueable-app";
import { StepChecklist } from "./StepChecklist";
import { TodaysStepCard } from "./TodaysStepCard";
import type { ExtensionOverviewFocus, ExtensionOverviewStep } from "./extension-types";

interface ToggleTaskResponse {
  success?: boolean;
  task?: ExtensionOverviewStep;
  progress?: ExtensionOverviewFocus["progress"];
  error?: string;
}

function sortSteps(steps: ExtensionOverviewStep[]) {
  return [...steps].sort((left, right) => left.order - right.order);
}

function calculateProgress(steps: ExtensionOverviewStep[]): ExtensionOverviewFocus["progress"] {
  return {
    completedSteps: steps.filter((step) => step.completed).length,
    totalSteps: steps.length,
  };
}

export function AssignmentSteps({
  steps: initialSteps,
  initialProgress,
  onAllStepsComplete,
  onCompleteAssignment,
  isCompletingAssignment,
}: {
  steps: ExtensionOverviewStep[];
  initialProgress: ExtensionOverviewFocus["progress"];
  onAllStepsComplete?: () => Promise<void> | void;
  onCompleteAssignment?: () => void;
  isCompletingAssignment?: boolean;
}) {
  const [steps, setSteps] = useState<ExtensionOverviewStep[]>(() => sortSteps(initialSteps));
  const [progress, setProgress] = useState(initialProgress);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSteps(sortSteps(initialSteps));
    setProgress(initialProgress);
    setErrorMessage(null);
  }, [initialProgress, initialSteps]);

  async function handleToggleStep(stepId: string, nextCompleted: boolean) {
    const previousSteps = steps;
    const nextSteps = sortSteps(steps.map((step) => (step.id === stepId ? { ...step, completed: nextCompleted } : step)));
    const nextProgress = calculateProgress(nextSteps);

    setPendingTaskId(stepId);
    setErrorMessage(null);
    setSteps(nextSteps);
    setProgress(nextProgress);

    try {
      const response = await fetch(getDueableUrl("/api/extension/toggle-task"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: stepId,
          completed: nextCompleted,
        }),
      });

      const payload = (await response.json()) as ToggleTaskResponse;

      if (!response.ok || !payload.success || !payload.task || !payload.progress) {
        throw new Error(payload.error ?? "Unable to update this step right now.");
      }

      setSteps((currentSteps) =>
        sortSteps(currentSteps.map((step) => (step.id === payload.task?.id ? payload.task : step))),
      );
      setProgress(payload.progress);

      if (payload.progress.totalSteps > 0 && payload.progress.completedSteps === payload.progress.totalSteps) {
        await onAllStepsComplete?.();
      }
    } catch (error) {
      setSteps(previousSteps);
      setProgress(calculateProgress(previousSteps));
      setErrorMessage("We couldn't save that step right now. Try again in a moment.");
    } finally {
      setPendingTaskId(null);
    }
  }

  const currentStep = useMemo(() => steps.find((step) => !step.completed) ?? null, [steps]);
  const otherSteps = useMemo(() => steps.filter((step) => step.id !== currentStep?.id), [currentStep?.id, steps]);

  return (
    <div className="steps-stack" aria-busy={pendingTaskId !== null}>
      <TodaysStepCard
        step={currentStep}
        progress={progress}
        isPending={pendingTaskId === currentStep?.id}
        isCompletingAssignment={isCompletingAssignment}
        onCompleteAssignment={onCompleteAssignment}
        onToggle={(completed) => {
          if (currentStep) {
            void handleToggleStep(currentStep.id, completed);
          }
        }}
      />

      {errorMessage ? <p className="panel-copy panel-feedback">{errorMessage}</p> : null}

      <StepChecklist
        steps={otherSteps}
        pendingTaskId={pendingTaskId}
        onToggle={(stepId, completed) => {
          void handleToggleStep(stepId, completed);
        }}
      />
    </div>
  );
}