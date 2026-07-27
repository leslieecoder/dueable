import Link from "next/link";
import { redirect } from "next/navigation";
import { getAssignmentList } from "@/features/assignments/data";

type TimelineTone = "blue" | "purple" | "green" | "peach";

const toneClasses: Record<TimelineTone, { badge: string; border: string; button: string }> = {
  blue: {
    badge: "bg-[#edf3ff] text-[#2d6cdf]",
    border: "border-l-[#2d6cdf]",
    button: "bg-[#3f73e5] text-white",
  },
  purple: {
    badge: "bg-[#f1ebff] text-[#8d79f5]",
    border: "border-l-[#a78bfa]",
    button: "bg-[#9b7ff3] text-white",
  },
  green: {
    badge: "bg-[#e8fbf4] text-[#19805f]",
    border: "border-l-[#32c49a]",
    button: "bg-[#32c49a] text-white",
  },
  peach: {
    badge: "bg-[#fff1e7] text-[#ff9d62]",
    border: "border-l-[#ffb98a]",
    button: "bg-[#ffb27c] text-white",
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
      <header className="max-w-3xl">
        <p className="dueable-eyebrow text-[#9aa7bd]">Assignments</p>
        <h1 className="dueable-display mt-4 text-[3.5rem] leading-[0.95] tracking-tighter text-[#0f172a] sm:text-[4.5rem]">Your Week</h1>
        <p className="mt-5 text-[1.05rem] leading-8 text-[#7b88a2]">Dueable organized your assignments based on urgency, grade impact, and estimated effort.</p>
      </header>

      <section className="relative space-y-10 before:absolute before:bottom-0 before:left-[13px] before:top-2 before:w-px before:bg-[#d7ddea]">
        {orderedGroups.map(([key, items], groupIndex) => {
          const { weekday, shortDate } = formatDateParts(key);

          return (
            <div key={key} className="relative grid gap-4 pl-10">
              <div className="absolute left-0 top-2 h-3 w-3 rounded-full bg-[#2d6cdf] ring-4 ring-[#f5f7fa]" />
              <div className="flex items-baseline gap-3">
                <h2 className="text-[2rem] tracking-[-0.04em] text-[#15295c]">{weekday}</h2>
                <span className="text-sm text-[#8a93a5]">{shortDate}</span>
                {groupIndex === 0 ? <span className="rounded-full bg-[#3f73e5] px-2.5 py-1 text-xs font-semibold text-white">Today</span> : null}
              </div>

              <div className="space-y-5">
                {items.map((assignment, index) => {
                  const tag = inferTag(assignment.title);
                  const tone = toneClasses[tag.tone];
                  const pointsLabel = formatPoints(assignment.pointsPossible);

                  return (
                    <article key={assignment.id} className={`rounded-[28px] border border-white/80 border-l-4 ${tone.border} bg-white p-5 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.2)] sm:p-6`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>{tag.label}</span>
                          <h3 className="text-[2rem] leading-tight tracking-[-0.04em] text-[#15295c]">{assignment.title}</h3>
                          <p className="text-base text-[#7b88a2]">{assignment.courseTitle}</p>
                          <div className="flex flex-wrap gap-3 text-sm text-[#6f7f99]">
                            <span>{formatDateParts(assignment.dueDate).dateTime}</span>
                            {pointsLabel ? <span>{pointsLabel}</span> : null}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-[#98a0af]">{formatEffort(assignment.estimatedHours)}</span>
                      </div>

                      <div className="mt-5 rounded-[18px] bg-[#f6f8fc] px-4 py-3">
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

      <section className="rounded-[20px] bg-[#eef3fb] px-5 py-4 text-sm leading-7 text-[#4f5f79]">
        <strong>Dueable updates this plan as you work.</strong> Complete an assignment and it disappears from your week. Start a focus session and your coach adapts.
      </section>
    </main>
  );
}