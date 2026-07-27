import type { FormattedUpcomingAssignment } from "./extension-types";

export function UpcomingAssignments({ assignments }: { assignments: FormattedUpcomingAssignment[] }) {
  return (
    <section className="popup-panel">
      <div className="panel-header-row">
        <p className="section-label">Also upcoming</p>
      </div>

      <div className="upcoming-list compact">
        {assignments.map((assignment) => (
          <article key={assignment.id} className="upcoming-card">
            <h3>{assignment.title}</h3>
            <p>{assignment.courseTitle}</p>
            <div className="upcoming-meta-row">
              {assignment.formattedPoints ? <span>{assignment.formattedPoints}</span> : null}
              <span>Due {assignment.formattedDueDate}</span>
              <span>{assignment.difficulty}</span>
            </div>
            <p className="upcoming-progress-copy">0/4</p>
          </article>
        ))}
      </div>
    </section>
  );
}