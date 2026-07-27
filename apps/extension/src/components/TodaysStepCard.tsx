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
  return (
    <section className="popup-panel">
      <div className="today-step-shell">
        <div>
          <p className="section-label">Today's step</p>
          <h3 className="today-step-title">{step ? step.title : "You finished every step"}</h3>
          {step?.description ? <p className="panel-copy">{step.description}</p> : null}
        </div>

        {step?.estimatedMinutes ? <p className="today-step-time">{step.estimatedMinutes} min</p> : null}

        <div className="steps-progress-block">
          <p className="steps-heading">Progress</p>
          <p className="steps-progress-copy">{`${progress.completedSteps} / ${progress.totalSteps} steps completed`}</p>
          <ProgressIndicator completed={progress.completedSteps} total={progress.totalSteps} label="" />
        </div>

        {step ? (
          <button type="button" className="primary-button" onClick={() => onToggle(!step.completed)} disabled={isPending}>
            {isPending ? "Saving step..." : step.completed ? "Mark Step Incomplete" : "Mark Step Complete"}
          </button>
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