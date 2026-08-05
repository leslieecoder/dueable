import { useEffect, useMemo, useState } from "react";
import { AssignmentCompleteButton } from "./AssignmentCompleteButton";
import { splitCourseDisplayLabel } from "./course-display";
import { getDueableUrl } from "../lib/dueable-app";
import { StepChecklist } from "./StepChecklist";
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

function buildCourseCodePillStyle(courseColor: string | null | undefined) {
  if (!courseColor || !/^#[0-9a-f]{6}$/i.test(courseColor)) {
    return undefined;
  }

  return {
    borderColor: `${courseColor}33`,
    backgroundColor: `${courseColor}14`,
    color: courseColor,
  };
}

export function AssignmentSteps({
  focus,
  metadata,
  steps: initialSteps,
  initialProgress,
  onOpenAssignment,
  onCompleteAssignment,
  isCompletingAssignment,
}: {
  focus: ExtensionOverviewFocus;
  metadata: string[];
  steps: ExtensionOverviewStep[];
  initialProgress: ExtensionOverviewFocus["progress"];
  onOpenAssignment?: () => void;
  onCompleteAssignment?: () => void;
  isCompletingAssignment?: boolean;
}) {
  const isWorkAhead = focus.badgeLabel === "Work Ahead";
  const [steps, setSteps] = useState<ExtensionOverviewStep[]>(() => sortSteps(initialSteps));
  const [progress, setProgress] = useState(initialProgress);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(() => sortSteps(initialSteps).find((step) => !step.completed)?.id ?? initialSteps[0]?.id ?? null);
  const courseDisplay = useMemo(() => splitCourseDisplayLabel(focus.assignment.course), [focus.assignment.course]);
  const courseCodePillStyle = useMemo(() => buildCourseCodePillStyle(focus.assignment.courseColor), [focus.assignment.courseColor]);

  useEffect(() => {
    const sortedSteps = sortSteps(initialSteps);

    setSteps(sortedSteps);
    setProgress(initialProgress);
    setErrorMessage(null);
    setExpandedStepId((currentExpandedStepId) => {
      if (currentExpandedStepId && sortedSteps.some((step) => step.id === currentExpandedStepId)) {
        return currentExpandedStepId;
      }

      return sortedSteps.find((step) => !step.completed)?.id ?? sortedSteps[0]?.id ?? null;
    });
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
      if (isWorkAhead) {
        setProgress((currentProgress) =>
          calculateProgress(sortSteps(previousSteps.map((step) => (step.id === payload.task?.id ? payload.task ?? step : step)))).totalSteps === currentProgress.totalSteps
            ? calculateProgress(sortSteps(previousSteps.map((step) => (step.id === payload.task?.id ? payload.task ?? step : step))))
            : currentProgress,
        );
      } else {
        setProgress(payload.progress);
      }
    } catch {
      setSteps(previousSteps);
      setProgress(calculateProgress(previousSteps));
      setErrorMessage("We couldn't save that step right now. Try again in a moment.");
    } finally {
      setPendingTaskId(null);
    }
  }

  const allStepsCompleted = useMemo(() => {
    if (progress.totalSteps === 0) {
      return true;
    }

    return progress.completedSteps === progress.totalSteps;
  }, [progress.completedSteps, progress.totalSteps]);

  return (
    <section className="popup-panel focus-panel" aria-busy={pendingTaskId !== null}>
      <div className="focus-card focus-card-accent focus-card-with-steps">
        <div className="focus-top-tags">
          <span className="priority-pill">{focus.priorityLabel}</span>
          {courseDisplay.courseCode ? <span className="course-code-pill" style={courseCodePillStyle}>{courseDisplay.courseCode}</span> : null}
          {focus.badgeLabel ? <span className="work-ahead-pill">{focus.badgeLabel}</span> : null}
        </div>

        <div className="focus-card-header">
          <div>
            <button type="button" className="assignment-title-button assignment-title-button-large" onClick={onOpenAssignment} disabled={!onOpenAssignment}>
              <h2>{focus.assignment.title}</h2>
            </button>
            <p className="focus-course">{courseDisplay.courseName}</p>
          </div>
        </div>

        <div className="tag-row">
          {metadata.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>

        <div className="focus-steps-shell checklist-shell">
          <div className="steps-progress-block">
            <p className="steps-progress-copy">{`${progress.completedSteps}/${progress.totalSteps} completed`}</p>
            <div className="progress-indicator">
              <div className="progress-track" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${Math.round((progress.completedSteps / (progress.totalSteps || 1)) * 100)}%` }} />
              </div>
            </div>
          </div>

          <StepChecklist
            steps={steps}
            expandedStepId={expandedStepId}
            pendingTaskId={pendingTaskId}
            onExpand={(stepId) => {
              setExpandedStepId((currentStepId) => (currentStepId === stepId ? null : stepId));
            }}
            onToggle={(stepId, completed) => {
              void handleToggleStep(stepId, completed);
            }}
          />

          {errorMessage ? <p className="panel-copy panel-feedback">{errorMessage}</p> : null}

          {onCompleteAssignment && !isWorkAhead ? (
            <div className="focus-complete-action">
              <AssignmentCompleteButton
                isPending={Boolean(isCompletingAssignment)}
                disabled={!allStepsCompleted}
                onClick={onCompleteAssignment}
              />
              {!allStepsCompleted ? <p className="focus-complete-hint">Complete every step to mark this assignment done.</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}