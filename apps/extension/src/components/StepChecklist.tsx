import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { ExtensionOverviewStep } from "./extension-types";

function renderLinkedText(text: string) {
  const urlPattern = /(https?:\/\/[^\s<]+[^\s<.,!?;:])/g;
  const matches = Array.from(text.matchAll(urlPattern));

  if (matches.length === 0) {
    return text;
  }

  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const url = match[0];
    const startIndex = match.index ?? 0;

    if (startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, startIndex));
    }

    parts.push(
      <a key={`${url}-${startIndex}`} href={url} target="_blank" rel="noreferrer" className="step-description-link">
        {url}
      </a>,
    );

    lastIndex = startIndex + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function StepChecklist({
  steps,
  expandedStepId,
  pendingTaskId,
  onExpand,
  onToggle,
}: {
  steps: ExtensionOverviewStep[];
  expandedStepId: string | null;
  pendingTaskId: string | null;
  onExpand: (stepId: string) => void;
  onToggle: (stepId: string, completed: boolean) => void;
}) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <section className="popup-panel">
      <div className="other-steps-block">
        <div className="steps-list">
          {steps.map((step) => {
            const isExpanded = expandedStepId === step.id;

            return (
              <div key={step.id} className={`step-item step-item-card ${step.completed ? "step-item-complete" : ""} ${isExpanded ? "step-item-expanded" : ""}`}>
                <div className="step-item-row">
                  <label className="step-item-main">
                    <input
                      type="checkbox"
                      checked={step.completed}
                      disabled={pendingTaskId === step.id}
                      onChange={(event) => onToggle(step.id, event.target.checked)}
                    />
                    <span className="step-item-copy">
                      <strong className="step-item-label">{`Step ${step.order + 1}`}</strong>
                      <span className="step-item-title">{step.title}</span>
                      {step.estimatedMinutes > 0 ? <span className="step-minutes">{step.estimatedMinutes} min</span> : null}
                    </span>
                  </label>

                  <button
                    type="button"
                    className={`step-expand-button ${isExpanded ? "step-expand-button-open" : ""}`}
                    onClick={() => onExpand(step.id)}
                    aria-expanded={isExpanded}
                    aria-label={`Toggle details for step ${step.order + 1}`}
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>

                {isExpanded && step.description ? <div className="step-description">{renderLinkedText(step.description)}</div> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}