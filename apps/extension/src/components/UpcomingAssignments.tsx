import { CircleHelp, Clock3, NotebookText, PlayCircle } from "lucide-react";
import { useEffect, type ReactNode, useState } from "react";
import type { FormattedUpcomingAssignment } from "./extension-types";
import { splitCourseDisplayLabel } from "./course-display";

const WORK_MINUTES = 20;
const TIMER_STORAGE_KEY = "dueablePomodoroTimer";

interface StoredTimerStateMap {
  [assignmentId: string]: {
    completedFocusBlocks?: number;
    targetFocusBlocks?: number;
  };
}

function formatPriorityLabel(priorityLabel: string, priorityNumber: number) {
  const matchedNumber = priorityLabel.match(/\d+/)?.[0];

  if (matchedNumber && Number(matchedNumber) === priorityNumber) {
    return `Priority #${matchedNumber}`;
  }

  return `Priority #${priorityNumber}`;
}

function formatEstimatedDuration(hours: number) {
  const minutes = Math.max(20, Math.round(hours * 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const roundedHours = minutes / 60;
  return Number.isInteger(roundedHours) ? `${roundedHours.toFixed(0)} hrs` : `${roundedHours.toFixed(1)} hrs`;
}

function getSuggestedFocusBlocks(estimatedHours: number) {
  return Math.max(1, Math.ceil((estimatedHours * 60) / WORK_MINUTES));
}

function getImpactReason(pointsPossible: number | null) {
  if (pointsPossible === null || !Number.isFinite(pointsPossible)) {
    return "Counts toward your course progress";
  }

  if (pointsPossible >= 100) {
    return `High impact at ${Number.isInteger(pointsPossible) ? pointsPossible : pointsPossible.toFixed(1)} points`;
  }

  if (pointsPossible >= 40) {
    return `Solid course impact at ${Number.isInteger(pointsPossible) ? pointsPossible : pointsPossible.toFixed(1)} points`;
  }

  return `Worth finishing with ${Number.isInteger(pointsPossible) ? pointsPossible : pointsPossible.toFixed(1)} points on the line`;
}

function getEffortReason(estimatedHours: number) {
  if (estimatedHours >= 6) {
    return "Needs a deep work block";
  }

  if (estimatedHours >= 3) {
    return "Needs focused time soon";
  }

  return "Can be finished in a lighter session";
}

function getTimingReason(assignment: FormattedUpcomingAssignment) {
  if (assignment.badgeLabel === "Work Ahead") {
    return "Best to start early before it becomes urgent";
  }

  if (assignment.dateLabel === "Available until") {
    return "Already overdue, but still open in Canvas";
  }

  if (assignment.dateLabel === "Closed") {
    return "Past due and closed, so it stays lower in the queue";
  }

  const dueTime = new Date(assignment.dueDate).getTime();
  const now = Date.now();
  const daysUntilDue = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));

  if (!Number.isNaN(daysUntilDue) && daysUntilDue <= 1) {
    return "Due very soon, so urgency pushes it up";
  }

  if (!Number.isNaN(daysUntilDue) && daysUntilDue <= 3) {
    return "Due in the next few days";
  }

  return "Scheduled for this week";
}

function getPriorityReasons(assignment: FormattedUpcomingAssignment) {
  return [
    getTimingReason(assignment),
    getImpactReason(assignment.pointsPossible),
    getEffortReason(assignment.estimatedHours),
  ];
}

function getDuePillClassName(dateText: string) {
  const lowered = dateText.toLowerCase();
  return lowered.includes("available until") || lowered.includes("closed") || lowered.includes("today")
    ? "priority-meta-pill priority-meta-pill-urgent"
    : "priority-meta-pill priority-meta-pill-calm";
}

function getQueueBadge(assignment: FormattedUpcomingAssignment) {
  if (assignment.badgeLabel === "Work Ahead") {
    return {
      label: "Work Ahead",
      className: "priority-meta-pill priority-meta-pill-work-ahead",
    };
  }

  if (assignment.dateLabel === "Available until" || assignment.dateLabel === "Closed") {
    return {
      label: "Overdue",
      className: "priority-meta-pill priority-meta-pill-overdue",
    };
  }

  return null;
}

function getCardThemeClass(assignment: FormattedUpcomingAssignment, priorityNumber: number) {
  if (assignment.badgeLabel === "Work Ahead") {
    return priorityNumber === 1 ? "priority-summary-card-work-ahead-strong" : "priority-summary-card-work-ahead-soft";
  }

  if (assignment.dateLabel === "Available until" || assignment.dateLabel === "Closed") {
    return priorityNumber === 1 ? "priority-summary-card-overdue-strong" : "priority-summary-card-overdue-soft";
  }

  return priorityNumber === 1 ? "priority-summary-card-this-week-strong" : "priority-summary-card-this-week-soft";
}

function buildCourseCodePillStyle(courseColor: string | null | undefined) {
  if (!courseColor || !/^#[0-9a-f]{6}$/i.test(courseColor)) {
    return undefined;
  }

  return {
    borderColor: `${courseColor}33`,
    backgroundColor: `${courseColor}14`,
    color: courseColor,
  };
}

export function UpcomingAssignments({
  assignments,
  selectedAssignmentId,
  expandedAssignmentId,
  onSelect,
  onOpenAssignment,
  onStartAssignment,
  renderExpandedContent,
}: {
  assignments: FormattedUpcomingAssignment[];
  selectedAssignmentId: string | null;
  expandedAssignmentId: string | null;
  onSelect: (assignmentId: string) => void;
  onOpenAssignment: (assignmentUrl: string) => void;
  onStartAssignment: (assignmentId: string) => void;
  renderExpandedContent: (assignment: FormattedUpcomingAssignment, priorityNumber: number) => ReactNode;
}) {
  const [timerSummaryByAssignment, setTimerSummaryByAssignment] = useState<
    Record<string, { completedFocusBlocks: number; targetFocusBlocks: number }>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function loadStoredTimerState() {
      const stored = await chrome.storage.local.get(TIMER_STORAGE_KEY);
      const storedStates = (stored[TIMER_STORAGE_KEY] as StoredTimerStateMap | undefined) ?? {};

      if (cancelled) {
        return;
      }

      setTimerSummaryByAssignment(
        Object.fromEntries(
          Object.entries(storedStates).map(([assignmentId, state]) => [
            assignmentId,
            {
              completedFocusBlocks: Math.max(0, state.completedFocusBlocks ?? 0),
              targetFocusBlocks: Math.max(1, state.targetFocusBlocks ?? 0),
            },
          ]),
        ),
      );
    }

    void loadStoredTimerState();

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && changes[TIMER_STORAGE_KEY]) {
        void loadStoredTimerState();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [assignments]);

  return (
    <section className="popup-panel">
      <div className="priority-card-list">
        {assignments.map((assignment, index) => {
          const courseDisplay = splitCourseDisplayLabel(assignment.courseTitle);
          const courseCodePillStyle = buildCourseCodePillStyle(assignment.courseColor);
          const priorityNumber = index + 1;
          const bannerCourseStyle =
            priorityNumber === 1
              ? {
                  ...courseCodePillStyle,
                  borderColor: "rgba(255, 255, 255, 0.34)",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                }
              : courseCodePillStyle;
          const suggestedFocusBlocks = getSuggestedFocusBlocks(assignment.estimatedHours);
          const storedTimerSummary = timerSummaryByAssignment[assignment.id];
          const targetFocusBlocks = Math.max(storedTimerSummary?.targetFocusBlocks ?? suggestedFocusBlocks, 1);
          const completedFocusBlocks = Math.min(targetFocusBlocks, storedTimerSummary?.completedFocusBlocks ?? 0);
          const completionPercent = Math.round((completedFocusBlocks / targetFocusBlocks) * 100);
          const metaBadges = [assignment.formattedPoints, formatEstimatedDuration(assignment.estimatedHours)].filter(
            (value): value is string => Boolean(value),
          );
          const isExpanded = expandedAssignmentId === assignment.id;
          const queueBadge = getQueueBadge(assignment);
          const cardThemeClass = getCardThemeClass(assignment, priorityNumber);
          const priorityReasons = getPriorityReasons(assignment);

          return (
            <article
              key={assignment.id}
              className={`priority-summary-card ${selectedAssignmentId === assignment.id ? "priority-summary-card-selected" : ""} ${cardThemeClass}${isExpanded ? " priority-summary-card-expanded" : ""}`}
            >
              <div className="priority-summary-select" onClick={() => onSelect(assignment.id)} role="button" tabIndex={0} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(assignment.id);
                }
              }}>
                <div className="priority-summary-banner">
                  <span className="priority-banner-label">{formatPriorityLabel(assignment.priorityLabel, priorityNumber)}</span>
                  <span className="priority-banner-course" style={bannerCourseStyle}>
                    <NotebookText size={15} strokeWidth={2.1} />
                    <span>{courseDisplay.courseCode ?? courseDisplay.courseName}</span>
                  </span>
                </div>

                <div className="priority-summary-body">
                  <div className="priority-summary-heading">
                    <button
                      type="button"
                      className="assignment-title-button priority-summary-title-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(assignment.id);

                        if (assignment.assignmentUrl) {
                          onOpenAssignment(assignment.assignmentUrl);
                        }
                      }}
                      disabled={!assignment.assignmentUrl}
                    >
                      <h3>{assignment.title}</h3>
                    </button>
                  </div>

                  <div className="priority-summary-meta">
                    <span className={getDuePillClassName(assignment.formattedDueText)}>
                      <Clock3 size={14} strokeWidth={2.1} />
                      <span>{assignment.formattedDueText}</span>
                    </span>
                    {queueBadge ? <span className={queueBadge.className}>{queueBadge.label}</span> : null}
                    {metaBadges.map((badge) => (
                      <span key={badge} className="priority-meta-pill priority-meta-pill-info">
                        {badge}
                      </span>
                    ))}
                  </div>

                  {!isExpanded ? (
                    <>
                      <div className="priority-progress-copy-row">
                        <p>{`${completedFocusBlocks} of ${suggestedFocusBlocks} focus ${suggestedFocusBlocks === 1 ? "session" : "sessions"} completed`}</p>
                        <strong>{`${completionPercent}%`}</strong>
                      </div>
                      <div className="priority-progress-track" aria-hidden="true">
                        <div className="priority-progress-fill" style={{ width: `${completionPercent}%` }} />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <button type="button" className="priority-start-button" onClick={() => onStartAssignment(assignment.id)}>
                <PlayCircle size={22} strokeWidth={2.2} />
                <span>Start this assignment</span>
              </button>

              {isExpanded ? (
                <div className="priority-expanded-content">
                  <div className="priority-explainer-card">
                    <div className="priority-explainer-header">
                      <span className="priority-explainer-label">
                        <CircleHelp size={15} strokeWidth={2.2} />
                        <span>{priorityNumber === 1 ? "Why this first?" : "Why this here?"}</span>
                      </span>
                      <span className="priority-explainer-pill">Chosen for urgency, impact, and effort</span>
                    </div>
                    <div className="priority-explainer-reasons">
                      {priorityReasons.map((reason) => (
                        <p key={reason}>{reason}</p>
                      ))}
                    </div>
                  </div>
                  {renderExpandedContent(assignment, priorityNumber)}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}