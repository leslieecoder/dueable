interface ImportProgressState {
  percent: number;
  label: string;
  detail: string;
}

export function CanvasOnboarding({
  courseCount,
  importStage,
  importSummary,
  importProgress,
  isImporting,
  feedbackMessage,
  onImport,
  onContinue,
}: {
  courseCount: number;
  importStage: "idle" | "syncing" | "done";
  importSummary: { coursesImported: number; assignmentsImported: number } | null;
  importProgress: ImportProgressState | null;
  isImporting: boolean;
  feedbackMessage: string | null;
  onImport: () => void;
  onContinue: () => void;
}) {
  if (importStage === "syncing") {
    return (
      <section className="popup-panel">
        <div className="onboarding-shell onboarding-state-shell">
          <div className="state-mark-spinner" aria-hidden="true">
            <div className="state-mark-spinner-ring" />
            <div className="state-mark-spinner-core" />
          </div>
          <h2 className="panel-title">Importing your semester...</h2>
          <p className="panel-copy">{importProgress?.detail ?? "Preparing your assignments and study steps."}</p>

          <div className="import-progress-block">
            <div className="progress-track">
              <div className="progress-fill progress-fill-import" style={{ width: `${importProgress?.percent ?? 8}%` }} />
            </div>
            <p className="import-progress-copy">{`${Math.round(importProgress?.percent ?? 8)}%`}</p>
          </div>

          <div className="import-summary-list">
            <p className="import-summary-item">{courseCount > 0 ? `${courseCount} courses found` : "Looking for active courses"}</p>
            <p className="import-summary-item">{importProgress?.label ?? "Importing assignments from Canvas"}</p>
          </div>

          {feedbackMessage ? <p className="panel-copy panel-feedback">{feedbackMessage}</p> : null}
        </div>
      </section>
    );
  }

  if (importStage === "done") {
    return (
      <section className="popup-panel">
        <div className="onboarding-shell onboarding-state-shell">
          <div className="state-mark">✓</div>
          <h2 className="panel-title">Your semester is ready</h2>
          <p className="panel-copy">Dueable imported:</p>

          <div className="semester-stats-grid">
            <article className="semester-stat-card">
              <strong>{importSummary?.coursesImported ?? courseCount}</strong>
              <span>courses</span>
            </article>
            <article className="semester-stat-card">
              <strong>{importSummary?.assignmentsImported ?? 0}</strong>
              <span>assignments</span>
            </article>
          </div>

          <p className="panel-copy">Your assignments have been prioritized based on due date, points, difficulty, and workload.</p>

          {feedbackMessage ? <p className="panel-copy panel-feedback">{feedbackMessage}</p> : null}

          <button type="button" className="primary-button" onClick={onContinue}>
            See what I should work on
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="popup-panel">
      <div className="onboarding-shell onboarding-state-shell">
        <div className="auth-mark auth-mark-logo-shell">
          <img src="./assets/logo.png" alt="Dueable" className="auth-mark-logo" />
        </div>
        <div>
          <h2 className="panel-title">Set up your semester</h2>
          <p className="panel-copy">Import your assignments and rubrics from Canvas so Dueable can organize what you need to work on.</p>
        </div>

        <button type="button" className="primary-button" onClick={onImport} disabled={isImporting}>
          {isImporting ? "Importing from Canvas" : "Import from Canvas"}
        </button>

        {feedbackMessage ? <p className="panel-copy panel-feedback">{feedbackMessage}</p> : null}
      </div>
    </section>
  );
}