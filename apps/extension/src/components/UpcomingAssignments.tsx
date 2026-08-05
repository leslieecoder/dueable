import type { FormattedUpcomingAssignment } from "./extension-types";
import { splitCourseDisplayLabel } from "./course-display";

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
  onSelect,
  onOpenAssignment,
}: {
  assignments: FormattedUpcomingAssignment[];
  selectedAssignmentId: string | null;
  onSelect: (assignmentId: string) => void;
  onOpenAssignment: (assignmentUrl: string) => void;
}) {
  return (
    <section className="popup-panel">
      <div className="upcoming-list compact">
        {assignments.map((assignment) => {
          const courseDisplay = splitCourseDisplayLabel(assignment.courseTitle);
          const courseCodePillStyle = buildCourseCodePillStyle(assignment.courseColor);

          return (
          <article key={assignment.id} className={`upcoming-card ${selectedAssignmentId === assignment.id ? "upcoming-card-selected" : ""}`}>
            <div className="focus-top-tags upcoming-top-tags">
              <span className="priority-pill">{assignment.priorityLabel}</span>
              {courseDisplay.courseCode ? <span className="course-code-pill" style={courseCodePillStyle}>{courseDisplay.courseCode}</span> : null}
              {assignment.badgeLabel ? <span className="work-ahead-pill">{assignment.badgeLabel}</span> : null}
            </div>
            <button
              type="button"
              className="assignment-title-button"
              onClick={() => {
                onSelect(assignment.id);
                if (assignment.assignmentUrl) {
                  onOpenAssignment(assignment.assignmentUrl);
                }
              }}
              disabled={!assignment.assignmentUrl}
            >
              <h3>{assignment.title}</h3>
            </button>
            <button type="button" className="upcoming-card-button upcoming-card-select-button" onClick={() => onSelect(assignment.id)}>
              <p>{courseDisplay.courseName}</p>
              <div className="upcoming-meta-row">
                <span>{assignment.formattedDueText}</span>
              </div>
              <p className="upcoming-progress-copy">{`${assignment.progress.completedSteps}/${assignment.progress.totalSteps}`}</p>
            </button>
          </article>
        )})}
      </div>
    </section>
  );
}