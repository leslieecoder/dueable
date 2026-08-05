export function AllAssignmentsCompleted({
  onSeeWorkAhead,
  onReviewOverdue,
}: {
  onSeeWorkAhead: () => void;
  onReviewOverdue: () => void;
}) {
  return (
    <section className="popup-panel">
      <div className="completion-shell all-done-shell">
        <div className="all-done-check">✓</div>
        <h2 className="panel-title">All caught up! 🎉</h2>
        <p className="panel-copy">You&apos;ve completed everything due this week. Enjoy the moment — you earned it.</p>
        <div className="completion-actions">
          <button type="button" className="primary-button" onClick={onSeeWorkAhead}>
            See Work Ahead
          </button>
          <button type="button" className="dashboard-button" onClick={onReviewOverdue}>
            Review Overdue Work
          </button>
        </div>
      </div>
    </section>
  );
}