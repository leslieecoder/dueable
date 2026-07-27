import Link from "next/link";
import type { AssignmentListItem } from "@/features/assignments/data";

type AssignmentSectionKey = "needs-attention" | "upcoming" | "later";

const sectionMeta: Record<AssignmentSectionKey, { title: string; description: string; surfaceClassName: string; buttonClassName: string }> = {
  "needs-attention": {
    title: "Start here",
    description: "What deserves your attention right now.",
    surfaceClassName: "bg-[linear-gradient(180deg,_rgba(255,185,138,0.42),_rgba(255,255,255,0.95))]",
    buttonClassName: "bg-[#2D6CDF] text-white hover:bg-[#245ec6]",
  },
  upcoming: {
    title: "Coming up",
    description: "Visible, but not urgent yet.",
    surfaceClassName: "bg-[linear-gradient(180deg,_rgba(50,196,154,0.2),_rgba(255,255,255,0.95))]",
    buttonClassName: "bg-[#e8fbf4] text-[#146b53] hover:bg-[#d8f6eb]",
  },
  later: {
    title: "Later",
    description: "Safe to ignore for today.",
    surfaceClassName: "bg-[linear-gradient(180deg,_rgba(167,139,250,0.24),_rgba(255,255,255,0.95))]",
    buttonClassName: "bg-[#f1ebff] text-[#6d58c7] hover:bg-[#e9e0ff]",
  },
};

function getAssignmentSection(dueDate: string): AssignmentSectionKey {
  const now = Date.now();
  const diffDays = Math.ceil((new Date(dueDate).getTime() - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) {
    return "needs-attention";
  }

  if (diffDays <= 7) {
    return "upcoming";
  }

  return "later";
}

function formatDueLabel(dueDate: string) {
  const parsedDueDate = new Date(dueDate);

  if (Number.isNaN(parsedDueDate.getTime())) {
    return "Due date unavailable";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDueDay = new Date(parsedDueDate.getFullYear(), parsedDueDate.getMonth(), parsedDueDate.getDate()).getTime();
  const diffDays = Math.round((startOfDueDay - startOfToday) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return overdueDays === 1 ? "1 day overdue" : `${overdueDays} days overdue`;
  }

  if (diffDays === 0) {
    return "Due today";
  }

  if (diffDays === 1) {
    return "1 day left";
  }

  return `${diffDays} days left`;
}

function formatDueDate(dueDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(dueDate));
}

function formatEstimatedEffort(hours: number) {
  if (hours <= 1) {
    return "About 1 hour";
  }

  if (Number.isInteger(hours)) {
    return `${hours} hours`;
  }

  return `${hours.toFixed(1)} hours`;
}

function formatPoints(pointsPossible: number | null) {
  if (!Number.isFinite(pointsPossible) || pointsPossible === null) {
    return null;
  }

  const rounded = Number.isInteger(pointsPossible) ? pointsPossible.toFixed(0) : pointsPossible.toFixed(1);
  return `${rounded} points`;
}

export function AssignmentSections({
  items,
  activeAssignmentId,
}: {
  items: AssignmentListItem[];
  activeAssignmentId?: string;
}) {
  const groupedItems: Record<AssignmentSectionKey, AssignmentListItem[]> = {
    "needs-attention": [],
    upcoming: [],
    later: [],
  };

  for (const item of items) {
    groupedItems[getAssignmentSection(item.dueDate)].push(item);
  }

  return (
    <div className="grid gap-7 xl:grid-cols-3 xl:items-start">
      {(["needs-attention", "upcoming", "later"] as AssignmentSectionKey[]).map((sectionKey) => {
        const sectionItems = groupedItems[sectionKey];
        const meta = sectionMeta[sectionKey];

        if (sectionItems.length === 0) {
          return null;
        }

        return (
          <section key={sectionKey} className={`rounded-[28px] p-6 sm:p-7 shadow-[0_24px_42px_-34px_rgba(15,23,42,0.35)] ${meta.surfaceClassName}`}>
            <div className="space-y-2">
              <h2 className="dueable-display text-[2rem] leading-none tracking-[-0.04em] text-[#0F172A] sm:text-[2.2rem]">{meta.title}</h2>
              <p className="text-[1.04rem] leading-7 text-[#56657f]">{meta.description}</p>
            </div>

            <div className="mt-6 space-y-4">
              {sectionItems.map((item) => {
                const isActive = item.id === activeAssignmentId;
                const pointsLabel = formatPoints(item.pointsPossible);

                return (
                  <article
                    key={item.id}
                    className={`rounded-[24px] bg-white/94 p-6 sm:p-7 shadow-[0_24px_36px_-30px_rgba(15,23,42,0.22)] transition ${
                      isActive ? "ring-2 ring-[#2D6CDF]/25" : ""
                    }`}
                  >
                    <p className="text-[1rem] font-medium text-[#6f7f99]">{item.courseTitle}</p>
                    <h3 className="mt-3 text-[1.52rem] font-semibold leading-8 tracking-[-0.03em] text-[#0F172A] sm:text-[1.62rem]">{item.title}</h3>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.92rem]">
                      {pointsLabel ? <span className="rounded-full bg-[#fff8eb] px-3 py-1.5 font-semibold text-[#9a6a17]">{pointsLabel}</span> : null}
                    </div>
                    <div className="mt-5 space-y-2 text-[1.04rem] text-[#56657f]">
                      <p className="text-[1.08rem] font-semibold text-[#2D6CDF]">Due {formatDueDate(item.dueDate)}</p>
                      <p>{formatDueLabel(item.dueDate)}</p>
                      <p>{formatEstimatedEffort(item.estimatedHours)}</p>
                    </div>
                    <Link
                      href={`/assignments/${item.id}`}
                      className={`mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full px-5 py-3.5 text-[1.08rem] font-semibold transition ${meta.buttonClassName}`}
                    >
                      {sectionKey === "needs-attention" ? "Start this" : sectionKey === "upcoming" ? "See plan" : "View when ready"}
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}