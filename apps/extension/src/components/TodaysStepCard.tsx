import { ProgressIndicator } from "./ProgressIndicator";
import type { ExtensionOverviewFocus, ExtensionOverviewStep } from "./extension-types";

export function TodaysStepCard({
  step,
  progress,
  isPending,
  onToggle,
  isCompletingAssignment,
  onCompleteAssignment,
}: {
  step: ExtensionOverviewStep | null;
  progress: ExtensionOverviewFocus["progress"];
  isPending: boolean;
  onToggle: (completed: boolean) => void;
  isCompletingAssignment?: boolean;
  onCompleteAssignment?: () => void;
}) {
  const stepNumber = step ? step.order + 1 : null;

  return (
    <section className="popup-panel">
      <div className="today-step-shell checklist-shell">
        <div className="steps-progress-block">
          <p className="steps-progress-copy">{`${progress.completedSteps}/${progress.totalSteps} completed`}</p>
          <ProgressIndicator completed={progress.completedSteps} total={progress.totalSteps} label="" />
        </div>

        {step ? (
          <div className="current-step-card">
            <div className="current-step-copy">
              <p className="step-chip">{stepNumber ? `Step ${stepNumber}` : "Current step"}</p>
              <h3 className="today-step-title">{step.title}</h3>
              {step?.estimatedMinutes ? <p className="today-step-time">{step.estimatedMinutes} min</p> : null}
              {step?.description ? <p className="panel-copy">{step.description}</p> : null}
            </div>

            <button type="button" className="step-toggle-button" onClick={() => onToggle(!step.completed)} disabled={isPending}>
              {isPending ? "Saving..." : "Mark complete"}
            </button>
          </div>
        ) : (
          <div className="inline-complete-card">
            <div className="inline-complete-check">✓</div>
            <div>
              <p className="inline-complete-title">All steps complete!</p>
              <p className="inline-complete-copy">Ready to mark as done.</p>
            </div>

            {onCompleteAssignment ? (
              <button type="button" className="success-button" onClick={onCompleteAssignment} disabled={isCompletingAssignment}>
                {isCompletingAssignment ? "Completing..." : "Mark Assignment Complete"}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}