export function AllAssignmentsCompleted({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <section className="popup-panel">
      <div className="completion-shell all-done-shell">
        <div className="all-done-check">✓</div>
        <p className="section-label">All assignments completed</p>
        <h2 className="panel-title">You are caught up for now.</h2>
        <p className="panel-copy">There is no remaining assignment work in Dueable right now. Open your dashboard if you want to review the rest of your semester.</p>
        <button type="button" className="primary-button" onClick={onOpenDashboard}>
          Open Dashboard
        </button>
      </div>
    </section>
  );
}