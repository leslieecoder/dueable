import Link from "next/link";
import { toggleChecklistTaskAction } from "@/features/assignments/actions";
import type { AssignmentDetailData } from "@/features/assignments/data";

function formatDueTag(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatHours(hours: number) {
  if (hours <= 1) {
    return "1 hr";
  }

  if (Number.isInteger(hours)) {
    return `${hours} hrs`;
  }

  return `${hours.toFixed(1)} hrs`;
}

function formatPoints(pointsPossible: number | null) {
  if (!Number.isFinite(pointsPossible) || pointsPossible === null) {
    return null;
  }

  return `${Number.isInteger(pointsPossible) ? pointsPossible.toFixed(0) : pointsPossible.toFixed(1)} pts`;
}

function buildSummary(assignment: AssignmentDetailData) {
  const diffHours = (new Date(assignment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
  const pointsLabel = formatPoints(assignment.pointsPossible);

  if (diffHours <= 24 && pointsLabel) {
    return `This is ${pointsLabel} of your grade and closes soon.`;
  }

  if (diffHours <= 24) {
    return "This assignment closes soon. Finish the next step before you think about the whole thing.";
  }

  if (pointsLabel) {
    return `This is worth ${pointsLabel}. Finishing one small step now will make the rest easier.`;
  }

  return "Take the next small step first, then let the rest of the roadmap wait.";
}

function sanitizeAssignmentInstructions(description: string) {
  return description
    .replace(/<(script|style|iframe|object|embed|form|input|button|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\b[^>]*href=(['"])(.*?)\1[^>]*>/gi, (_match, _quote, href: string) => {
      const safeHref = href.trim();

      if (!/^https?:\/\//i.test(safeHref)) {
        return "<a>";
      }

      return `<a href="${safeHref.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" target="_blank" rel="noreferrer noopener">`;
    })
    .replace(/<(?!\/?(?:h1|h2|h3|h4|h5|h6|p|ul|ol|li|a|strong|em|b|i|br|blockquote)\b)[^>]+>/gi, "")
    .replace(/<(h1|h2|h3|h4|h5|h6|p|ul|ol|li|strong|em|b|i|blockquote)\b[^>]*>/gi, "<$1>")
    .replace(/<br\b[^>]*>/gi, "<br />")
    .trim();
}

export function AssignmentDetailShell({ assignment }: { assignment: AssignmentDetailData }) {
  const pointsLabel = formatPoints(assignment.pointsPossible);
  const firstOpenTask = assignment.checklist.find((task) => !task.completed) ?? null;
  const firstOpenIndex = firstOpenTask ? assignment.checklist.findIndex((task) => task.id === firstOpenTask.id) : assignment.checklist.length - 1;
  const firstActionAnchor = firstOpenTask ? `#step-${firstOpenTask.id}` : "#instructions";
  const progressPercent = assignment.totalTasks > 0 ? Math.round((assignment.completedTasks / assignment.totalTasks) * 100) : 0;
  const instructionsHtml = assignment.description ? sanitizeAssignmentInstructions(assignment.description) : "";

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-4">
        <Link href="/assignments" className="text-sm font-medium text-[#7b88a2]">
          ← Back to assignments
        </Link>
        <h1 className="dueable-display text-[3rem] leading-[0.95] tracking-[-0.05em] text-[#15295c] sm:text-[3.9rem]">{assignment.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-[#edf3ff] px-3 py-1.5 font-semibold text-[#2d6cdf]">{assignment.courseTitle}</span>
          <span className="rounded-full bg-[#fff1e7] px-3 py-1.5 font-semibold text-[#ff6e60]">{formatDueTag(assignment.dueDate)}</span>
          {pointsLabel ? <span className="rounded-full bg-[#f4f8ff] px-3 py-1.5 font-semibold text-[#5b6e8d]">{pointsLabel}</span> : null}
          <span className="rounded-full bg-[#f2f4f8] px-3 py-1.5 font-semibold text-[#838b99]">{formatHours(assignment.estimatedHours)}</span>
        </div>
        <p className="text-[1.05rem] leading-8 text-[#6f7f99]">{buildSummary(assignment)}</p>
      </div>

      <section className="dueable-soft-panel rounded-[30px] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#ff7a1a] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white">#1 Priority</span>
          <span className="rounded-full bg-[#b9df6f] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#486229]">Work ahead</span>
        </div>
        <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#6e87a7]">Your next step</p>
        <h2 className="mt-4 text-[2.35rem] leading-tight tracking-[-0.04em] text-[#24395c]">{firstOpenTask?.title ?? "Everything here is finished"}</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#607087]">
          <span className="rounded-full border border-[#dfe7f5] bg-white px-4 py-2">{firstOpenTask ? `${firstOpenTask.estimatedMinutes} min` : "All checklist steps are done."}</span>
          <span className="rounded-full border border-[#dfe7f5] bg-white px-4 py-2">{assignment.completedTasks}/{assignment.totalTasks} completed</span>
        </div>
        <a href={firstActionAnchor} className="dueable-button-primary mt-7 inline-flex min-h-14 w-full items-center justify-center px-7 py-4 text-[1.05rem] font-semibold text-white">
          Start this step
        </a>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between text-sm font-medium text-[#6f7f99]">
          <span>{assignment.totalTasks > 0 ? `Step ${Math.max(firstOpenIndex + 1, 1)} of ${assignment.totalTasks}` : "No steps yet"}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dfe7fb]">
          <div className="h-full rounded-full bg-[linear-gradient(135deg,#2ec5a0,#2d6cdf)]" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <section className="space-y-3">
        {assignment.checklist.length > 0 ? (
          assignment.checklist.map((task) => (
            <form key={task.id} id={`step-${task.id}`} action={toggleChecklistTaskAction}>
              <input type="hidden" name="assignmentId" value={assignment.id} />
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="completed" value={task.completed ? "false" : "true"} />
              <button
                type="submit"
                className={`flex w-full items-center justify-between gap-4 rounded-[18px] border px-4 py-4 text-left shadow-[0_18px_42px_-34px_rgba(15,23,42,0.12)] ${
                  task.completed
                    ? "border-[#bfead9] bg-[#eefcf5] text-[#5f7f73]"
                    : "border-[#e7ecf4] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,250,255,0.96))] text-[#1d2940]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${task.completed ? "bg-[#32c49a] text-white" : "border border-[#2ec5a0] text-[#2ec5a0]"}`}>
                    {task.completed ? "✓" : ""}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9aa7bd]">Step {task.order + 1}</span>
                    <span className={`text-[1rem] font-medium ${task.completed ? "line-through" : ""}`}>{task.title}</span>
                  </span>
                </span>
                <span className="shrink-0 text-sm text-[#97a0b0]">{task.estimatedMinutes} min</span>
              </button>
            </form>
          ))
        ) : (
          <div className="dueable-soft-panel rounded-[18px] border border-dashed px-5 py-6 text-base leading-8 text-[#6b7a94]">
            No steps have been created for this assignment yet.
          </div>
        )}
      </section>

      <details id="instructions" className="dueable-soft-panel rounded-[18px] px-5 py-4" open>
        <summary className="cursor-pointer text-[1rem] font-semibold text-[#1d2940]">View original assignment instructions</summary>
        <div className="mt-4">
          {instructionsHtml ? (
            <div
              className="assignment-instructions space-y-4 text-[1rem] leading-8 text-[#5d6d87] [&_a]:font-semibold [&_a]:text-[#2d6cdf] [&_a]:underline [&_blockquote]:rounded-[18px] [&_blockquote]:border-l-4 [&_blockquote]:border-[#dbe7ff] [&_blockquote]:bg-[#f8faff] [&_blockquote]:px-4 [&_blockquote]:py-3 [&_h1]:text-[1.6rem] [&_h1]:font-semibold [&_h1]:tracking-[-0.03em] [&_h1]:text-[#173d4d] [&_h2]:text-[1.35rem] [&_h2]:font-semibold [&_h2]:tracking-[-0.03em] [&_h2]:text-[#173d4d] [&_h3]:text-[1.15rem] [&_h3]:font-semibold [&_h3]:text-[#173d4d] [&_li]:ml-5 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:whitespace-pre-wrap [&_ul]:list-disc [&_ul]:space-y-2"
              dangerouslySetInnerHTML={{ __html: instructionsHtml }}
            />
          ) : (
            <p className="text-[1rem] leading-8 text-[#7b88a2]">No instructions were imported for this assignment.</p>
          )}
        </div>
      </details>
    </main>
  );
}
