import type { ExtensionOverviewStep } from "./extension-types";

export function StepChecklist({
  steps,
  pendingTaskId,
  onToggle,
}: {
  steps: ExtensionOverviewStep[];
  pendingTaskId: string | null;
  onToggle: (stepId: string, completed: boolean) => void;
}) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <section className="popup-panel">
      <div className="other-steps-block">
        <p className="section-label">Step checklist</p>
        <div className="steps-list">
          {steps.map((step) => (
            <label key={step.id} className={`step-item ${step.completed ? "step-item-complete" : ""}`}>
              <span className="step-item-main">
                <input
                  type="checkbox"
                  checked={step.completed}
                  disabled={pendingTaskId === step.id}
                  onChange={(event) => onToggle(step.id, event.target.checked)}
                />
                <span>{step.title}</span>
              </span>
              {step.estimatedMinutes > 0 ? <span className="step-minutes">{step.estimatedMinutes} min</span> : null}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}