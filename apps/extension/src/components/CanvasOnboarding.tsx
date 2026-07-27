export function CanvasOnboarding({
  courseCount,
  isImporting,
  feedbackMessage,
  onImport,
}: {
  courseCount: number;
  isImporting: boolean;
  feedbackMessage: string | null;
  onImport: () => void;
}) {
  return (
    <section className="popup-panel">
      <div className="onboarding-shell">
        <div>
          <p className="section-label">Canvas onboarding</p>
          <h2 className="panel-title">Bring your semester into Dueable</h2>
          <p className="panel-copy">Connect your current Canvas classes so Dueable can turn them into one clear next step at a time.</p>
        </div>

        <div className="onboarding-steps-grid">
          <article className="onboarding-step-card sky">
            <p className="mini-label">Step 1</p>
            <h3>Open Canvas</h3>
            <p>Stay on your Canvas dashboard or course page before opening Dueable.</p>
          </article>

          <article className="onboarding-step-card mint">
            <p className="mini-label">Step 2</p>
            <h3>Find your current classes</h3>
            <p>{courseCount > 0 ? `${courseCount} current Canvas class${courseCount === 1 ? "" : "es"} ready to sync.` : "Dueable will look for your active semester classes."}</p>
          </article>

          <article className="onboarding-step-card peach">
            <p className="mini-label">Step 3</p>
            <h3>Import assignments</h3>
            <p>Bring over what matters now so the extension can show your next assignment and step.</p>
          </article>
        </div>

        <button type="button" className="primary-button" onClick={onImport} disabled={isImporting}>
          {isImporting ? "Importing assignments..." : "Import Assignments"}
        </button>

        {feedbackMessage ? <p className="panel-copy panel-feedback">{feedbackMessage}</p> : null}
      </div>
    </section>
  );
}