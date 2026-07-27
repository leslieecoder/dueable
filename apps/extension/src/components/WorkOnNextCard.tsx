import type { ExtensionOverviewFocus } from "./extension-types";

export function WorkOnNextCard({
  focus,
  metadata,
}: {
  focus: ExtensionOverviewFocus;
  metadata: string[];
}) {
  return (
    <section className="popup-panel focus-panel">
      <p className="section-label">Work on next</p>
      <div className="focus-card focus-card-accent">
        <div className="focus-card-header">
          <div>
            <h2>{focus.assignment.title}</h2>
            <p className="focus-course">{focus.assignment.course}</p>
          </div>
          <span className="priority-pill">{focus.priorityLabel}</span>
        </div>

        <div className="tag-row">
          {metadata.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}