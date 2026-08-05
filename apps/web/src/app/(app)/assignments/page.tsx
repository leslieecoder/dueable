import Link from "next/link";
import { redirect } from "next/navigation";
import { getAssignmentList } from "@/features/assignments/data";

type TimelineTone = "blue" | "purple" | "green" | "peach";

const toneClasses: Record<TimelineTone, { badge: string; border: string; button: string }> = {
  blue: {
    badge: "bg-[#edf3ff] text-[#2d6cdf]",
    border: "border-l-[#2d6cdf]",
    button: "dueable-button-primary text-white",
  },
  purple: {
    badge: "bg-[#f1ebff] text-[#8d79f5]",
    border: "border-l-[#a78bfa]",
    button: "bg-[#f1ebff] text-[#6d58c7]",
  },
  green: {
    badge: "bg-[#e8fbf4] text-[#19805f]",
    border: "border-l-[#32c49a]",
    button: "dueable-button-primary text-white",
  },
  peach: {
    badge: "bg-[#fff1e7] text-[#ff9d62]",
    border: "border-l-[#ffb98a]",
    button: "bg-[#fff1e7] text-[#c77743]",
  },
};

function formatDateParts(value: string) {
  const date = new Date(value);

  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date),
    shortDate: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date),
    dateTime: new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date),
  };
}

function buildWhyToday(dueDate: string, pointsPossible: number | null) {
  const diffDays = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return `Due ${formatDateParts(dueDate).dateTime}. This is your most urgent assignment right now.`;
  }

  if (diffDays <= 2) {
    return `Due ${formatDateParts(dueDate).dateTime}. Starting now gives you room to finish without rushing.`;
  }

  if (pointsPossible && pointsPossible >= 75) {
    return `This one carries meaningful points. Starting earlier makes the workload easier to spread out.`;
  }

  return `Starting this earlier keeps your week lighter and prevents a last-minute pileup.`;
}

function formatEffort(hours: number) {
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

function inferTag(title: string): { label: string; tone: TimelineTone } {
  const lowered = title.toLowerCase();

  if (lowered.includes("quiz") || lowered.includes("midterm") || lowered.includes("study")) {
    return { label: "Studying", tone: "blue" };
  }

  if (lowered.includes("lab") || lowered.includes("science")) {
    return { label: "Science", tone: "green" };
  }

  if (lowered.includes("read") || lowered.includes("chapter")) {
    return { label: "Reading", tone: "peach" };
  }

  if (lowered.includes("paper") || lowered.includes("essay") || lowered.includes("draft")) {
    return { label: "Writing", tone: "purple" };
  }

  return { label: "Math", tone: "blue" };
}

export default async function AssignmentsPage() {
  const assignments = await getAssignmentList();

  if (assignments.length === 0) {
    redirect("/onboarding");
  }

  const grouped = new Map<string, typeof assignments>();

  for (const assignment of assignments) {
    const key = new Date(assignment.dueDate).toDateString();
    const existing = grouped.get(key) ?? [];
    existing.push(assignment);
    grouped.set(key, existing);
  }

  const orderedGroups = [...grouped.entries()].sort((left, right) => new Date(left[0]).getTime() - new Date(right[0]).getTime());

  return (
    <main className="max-w-5xl space-y-10">
      <header className="max-w-4xl space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e5f8] bg-white px-4 py-2 text-sm font-semibold text-[#2d6cdf] shadow-[0_14px_28px_-24px_rgba(45,108,223,0.2)]">
          Weekly plan
        </span>
        <div className="space-y-3">
          <p className="dueable-eyebrow text-[#9aa7bd]">Assignments</p>
          <h1 className="dueable-display text-[3.3rem] leading-[0.95] tracking-[-0.05em] text-[#15295c] sm:text-[4.15rem]">Your week at a glance.</h1>
          <p className="max-w-2xl text-[1.05rem] leading-8 text-[#7b88a2]">Dueable organized your assignments based on urgency, grade impact, and estimated effort.</p>
        </div>
      </header>

      <section className="relative space-y-10 before:absolute before:bottom-0 before:left-[15px] before:top-2 before:w-px before:bg-[#dce4f1]">
        {orderedGroups.map(([key, items], groupIndex) => {
          const { weekday, shortDate } = formatDateParts(key);

          return (
            <div key={key} className="relative grid gap-4 pl-10">
              <div className="absolute left-0 top-2 h-4 w-4 rounded-full bg-[linear-gradient(135deg,_#1dc9b2,_#2d6cdf)] ring-4 ring-[#f7fbff]" />
              <div className="flex items-baseline gap-3">
                <h2 className="dueable-display text-[1.95rem] tracking-[-0.04em] text-[#15295c]">{weekday}</h2>
                <span className="text-sm text-[#8a93a5]">{shortDate}</span>
                {groupIndex === 0 ? <span className="rounded-full bg-[linear-gradient(135deg,_#2ec5a0,_#1fb78f)] px-2.5 py-1 text-xs font-semibold text-white">Today</span> : null}
              </div>

              <div className="space-y-5">
                {items.map((assignment, index) => {
                  const tag = inferTag(assignment.title);
                  const tone = toneClasses[tag.tone];
                  const pointsLabel = formatPoints(assignment.pointsPossible);

                  return (
                    <article key={assignment.id} className={`dueable-soft-panel rounded-[28px] border-l-4 ${tone.border} p-5 sm:p-6`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>{tag.label}</span>
                            {index === 0 && groupIndex === 0 ? <span className="rounded-full bg-[#b9df6f] px-3 py-1 text-xs font-semibold text-[#486229]">Work ahead</span> : null}
                          </div>
                          <h3 className="text-[2rem] leading-tight tracking-[-0.04em] text-[#15295c]">{assignment.title}</h3>
                          <p className="text-base text-[#7b88a2]">{assignment.courseTitle}</p>
                          <div className="flex flex-wrap gap-3 text-sm text-[#6f7f99]">
                            <span className="rounded-full border border-[#e2e8f3] bg-white px-3 py-1.5">{formatDateParts(assignment.dueDate).dateTime}</span>
                            {pointsLabel ? <span>{pointsLabel}</span> : null}
                          </div>
                        </div>
                        <span className="rounded-full border border-[#dfe7f5] bg-white px-3 py-1.5 text-sm font-medium text-[#607087]">{formatEffort(assignment.estimatedHours)}</span>
                      </div>

                      <div className="mt-5 rounded-[18px] border border-[#e9eef6] bg-white/82 px-4 py-3">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#9aa7bd]">Why today</p>
                        <p className="mt-2 text-sm leading-7 text-[#5f6f89]">{buildWhyToday(assignment.dueDate, assignment.pointsPossible)}</p>
                      </div>

                      <Link href={`/assignments/${assignment.id}`} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[14px] px-5 py-3 text-sm font-semibold ${tone.button}`}>
                        Start Assignment
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="dueable-soft-panel rounded-[20px] px-5 py-4 text-sm leading-7 text-[#4f5f79]">
        <strong>Dueable updates this plan as you work.</strong> Complete an assignment and it disappears from your week. Start a focus session and your coach adapts.
      </section>
    </main>
  );
}