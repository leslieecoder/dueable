import { ChartSpline, CircleCheckBig, Clock3, FileCheck2 } from "lucide-react";
import { useMemo, useState } from "react";

interface ImportProgressState {
  percent: number;
  label: string;
  detail: string;
}

interface IntroSlide {
  title: string;
  description: string;
  icon: "import" | "priority" | "focus";
}

const INTRO_SLIDES: IntroSlide[] = [
  {
    title: "Import your semester",
    description: "Connect to Canvas and pull in your active courses and assignments in seconds.",
    icon: "import",
  },
  {
    title: "Prioritize what matters",
    description: "Each assignment is ranked by urgency, grade impact, and remaining effort. No guesswork.",
    icon: "priority",
  },
  {
    title: "Focus and keep moving",
    description: "Start a focus block on your top assignment and let Dueable keep the rest of your week organized.",
    icon: "focus",
  },
];

function IntroIcon({ icon }: { icon: IntroSlide["icon"] }) {
  if (icon === "import") {
    return <FileCheck2 size={34} strokeWidth={2.1} />;
  }

  if (icon === "priority") {
    return <ChartSpline size={34} strokeWidth={2.1} />;
  }

  return <Clock3 size={34} strokeWidth={2.1} />;
}

export function CanvasOnboarding({
  courseCount,
  importStage,
  importSummary,
  importProgress,
  isImporting,
  isResetting,
  feedbackMessage,
  onImport,
  onContinue,
  onReset,
}: {
  courseCount: number;
  importStage: "idle" | "syncing" | "done";
  importSummary: { coursesImported: number; assignmentsImported: number } | null;
  importProgress: ImportProgressState | null;
  isImporting: boolean;
  isResetting: boolean;
  feedbackMessage: string | null;
  onImport: () => void;
  onContinue: () => void;
  onReset?: () => void;
}) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = useMemo(() => INTRO_SLIDES[activeSlideIndex] ?? INTRO_SLIDES[0], [activeSlideIndex]);
  const isLastSlide = activeSlideIndex === INTRO_SLIDES.length - 1;

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
        <div className="onboarding-shell onboarding-state-shell onboarding-state-shell-success">
          <div className="state-mark state-mark-success" aria-hidden="true">
            <CircleCheckBig size={34} strokeWidth={2.4} />
          </div>
          <h2 className="panel-title">Your semester is ready</h2>
          <p className="panel-copy onboarding-success-copy">Dueable imported your courses and assignments so you can start with a clear plan.</p>

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

          {feedbackMessage ? <p className="panel-copy panel-feedback">{feedbackMessage}</p> : null}

          <button type="button" className="primary-button" onClick={onContinue}>
            View my priority queue
          </button>
          {onReset ? (
            <button type="button" className="text-button onboarding-inline-text-button" onClick={onReset} disabled={isResetting}>
              {isResetting ? "Removing import..." : "Undo import"}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="popup-panel">
      <div className="onboarding-shell onboarding-state-shell onboarding-intro-shell">
        <div className="onboarding-intro-icon-shell" aria-hidden="true">
          <IntroIcon icon={activeSlide.icon} />
        </div>

        <div className="onboarding-intro-copy-block">
          <h2 className="panel-title">{activeSlide.title}</h2>
          <p className="panel-copy">{activeSlide.description}</p>
        </div>

        <div className="onboarding-dots" aria-label={`Step ${activeSlideIndex + 1} of ${INTRO_SLIDES.length}`}>
          {INTRO_SLIDES.map((slide, index) => (
            <span
              key={slide.title}
              className={`onboarding-dot${index === activeSlideIndex ? " onboarding-dot-active" : ""}`}
            />
          ))}
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={isLastSlide ? onImport : () => setActiveSlideIndex((currentIndex) => Math.min(currentIndex + 1, INTRO_SLIDES.length - 1))}
          disabled={isImporting}
        >
          {isImporting ? "Importing semester" : isLastSlide ? "Import semester" : "Next"}
        </button>
        <button type="button" className="text-button onboarding-inline-text-button" onClick={onContinue}>
          Skip intro
        </button>
        {onReset ? (
          <button type="button" className="secondary-button" onClick={onReset} disabled={isResetting}>
            {isResetting ? "Removing import..." : "Remove previous imports"}
          </button>
        ) : null}

        {feedbackMessage ? <p className="panel-copy panel-feedback">{feedbackMessage}</p> : null}
      </div>
    </section>
  );
}
