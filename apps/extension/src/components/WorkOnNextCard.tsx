import type { ExtensionOverviewFocus } from "./extension-types";
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

export function WorkOnNextCard({
  focus,
  metadata,
}: {
  focus: ExtensionOverviewFocus;
  metadata: string[];
}) {
  const courseDisplay = splitCourseDisplayLabel(focus.assignment.course);
  const courseCodePillStyle = buildCourseCodePillStyle(focus.assignment.courseColor);

  return (
    <section className="popup-panel focus-panel">
      <div className="focus-card focus-card-accent">
        <div className="focus-top-tags">
          <span className="priority-pill">{focus.priorityLabel}</span>
          {courseDisplay.courseCode ? <span className="course-code-pill" style={courseCodePillStyle}>{courseDisplay.courseCode}</span> : null}
          <span className="work-ahead-pill">Work Ahead</span>
        </div>

        <div className="focus-card-header">
          <div>
            <h2>{focus.assignment.title}</h2>
            <p className="focus-course">{courseDisplay.courseName}</p>
          </div>
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