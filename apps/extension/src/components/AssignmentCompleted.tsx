export function AssignmentCompleted({
  assignmentTitle,
  nextTitle,
  autoAdvanceSeconds,
}: {
  assignmentTitle: string;
  nextTitle: string | null;
  autoAdvanceSeconds: number;
}) {
  return (
    <section className="popup-panel">
      <div className="completion-shell all-done-shell">
        <div className="all-done-check">✓</div>
        <h2 className="panel-title">{assignmentTitle} is done.</h2>
        <p className="panel-copy">
          {nextTitle ? `Nice work. Dueable already found your next priority: ${nextTitle}.` : "Nice work. You cleared this assignment and can keep moving."}
        </p>
        <p className="focus-complete-hint">{`Moving you to the next priority in ${autoAdvanceSeconds} second${autoAdvanceSeconds === 1 ? "" : "s"}...`}</p>
      </div>
    </section>
  );
}