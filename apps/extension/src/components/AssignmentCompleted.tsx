export function AssignmentCompleted({
  assignmentTitle,
  nextTitle,
  onContinue,
}: {
  assignmentTitle: string;
  nextTitle: string | null;
  onContinue: () => void;
}) {
  return (
    <section className="popup-panel">
      <div className="completion-shell">
        <p className="section-label">Assignment completed</p>
        <h2 className="panel-title">{assignmentTitle} is done.</h2>
        <p className="panel-copy">
          {nextTitle ? `Nice work. Dueable already found your next priority: ${nextTitle}.` : "Nice work. You cleared this assignment and can keep moving."}
        </p>
        <button type="button" className="primary-button" onClick={onContinue}>
          {nextTitle ? "Continue to next priority" : "Back to Dueable"}
        </button>
      </div>
    </section>
  );
}