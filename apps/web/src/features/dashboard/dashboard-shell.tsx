import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import type { DashboardOverview } from "@dueable/types";
import type { AuthenticatedUser } from "@/lib/auth/user";

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) {
    return "Short step";
  }

  return `${minutes} min`;
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

function formatGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function formatProgressCopy(overview: DashboardOverview) {
  return `${overview.progress.completedTasks} of ${overview.progress.totalTasks} steps finished`;
}

export function DashboardShell({
  user,
  overview,
  activated = false,
}: {
  user: AuthenticatedUser;
  overview: DashboardOverview;
  activated?: boolean;
}) {
  const greeting = formatGreeting();
  const firstName = user.name.split(" ")[0] || "there";
  const spotlightTask = overview.todaysTasks[0] ?? null;
  const weeklyAssignments = overview.upcomingAssignments.slice(0, 4);
  const completedToday = overview.completedToday.slice(0, 2);

  return (
    <main className="space-y-8">
      <header className="space-y-4 px-1 pt-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2d6cdf] shadow-[0_14px_28px_-22px_rgba(45,108,223,0.55)]">
          <Sparkles className="h-4 w-4" /> Today
        </span>
        <div className="max-w-4xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8d99af]">{greeting}</p>
          <h1 className="text-[3.45rem] leading-[0.94] tracking-[-0.06em] text-[#15295c] sm:text-[4.6rem]">
            {firstName}, here&apos;s what deserves your attention.
          </h1>
          <p className="max-w-2xl text-[1.05rem] leading-8 text-[#6f7f99]">{overview.focusQuestion}</p>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <article className="overflow-hidden rounded-[36px] bg-[#3f73e5] text-white shadow-[0_34px_70px_-42px_rgba(45,108,223,0.58)]">
          <div className="space-y-8 px-7 py-7 sm:px-9 sm:py-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/72">Work on next</p>
                {spotlightTask ? (
                  <>
                    <p className="text-[0.98rem] font-medium text-white/78">{spotlightTask.courseTitle}</p>
                    <h2 className="max-w-3xl text-[2.8rem] leading-[0.95] tracking-tighter sm:text-[3.9rem]">{spotlightTask.assignmentTitle}</h2>
                  </>
                ) : (
                  <>
                    <p className="text-[0.98rem] font-medium text-white/78">You&apos;re in good shape</p>
                    <h2 className="max-w-3xl text-[2.8rem] leading-[0.95] tracking-tighter sm:text-[3.9rem]">You are caught up right now.</h2>
                  </>
                )}
              </div>

              <div className="rounded-3xl bg-white/12 px-5 py-4 backdrop-blur-sm">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/65">Progress</p>
                <p className="mt-3 text-[2.2rem] font-semibold tracking-[-0.04em]">{overview.progress.completionPercent}%</p>
                <p className="mt-1 text-sm text-white/72">{formatProgressCopy(overview)}</p>
              </div>
            </div>

            {spotlightTask ? (
              <>
                <div className="flex flex-wrap gap-3 text-sm font-medium text-white/84">
                  <span className="rounded-full bg-white/14 px-4 py-2">Due {formatDueDate(spotlightTask.dueDate)}</span>
                  <span className="rounded-full bg-white/14 px-4 py-2">{formatMinutes(spotlightTask.estimatedMinutes)}</span>
                  <span className="rounded-full bg-white/14 px-4 py-2">{overview.progress.activeAssignments} active assignments</span>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="rounded-[28px] bg-white px-6 py-6 text-[#173d4d] shadow-[0_24px_52px_-34px_rgba(15,23,42,0.42)]">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6e87a7]">Your next step</p>
                    <p className="mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.04em]">{spotlightTask.title}</p>
                    <p className="mt-4 text-[1rem] leading-8 text-[#5f728d]">Stay with this one piece first. The goal is to start cleanly, not finish the whole assignment at once.</p>
                    <Link
                      href={`/assignments/${spotlightTask.assignmentId}`}
                      className="mt-7 inline-flex min-h-14 items-center justify-center rounded-full bg-[#3f73e5] px-7 py-4 text-[1rem] font-semibold text-white"
                    >
                      Open action plan <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[26px] bg-[#2f61cd] px-5 py-5">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/62">Planned today</p>
                      <p className="mt-3 text-[2.15rem] font-semibold tracking-[-0.04em]">{overview.progress.plannedMinutesToday}</p>
                      <p className="mt-1 text-sm text-white/72">minutes of focused work</p>
                    </div>
                    <div className="rounded-[26px] bg-[#2f61cd] px-5 py-5">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/62">Completed</p>
                      <p className="mt-3 text-[2.15rem] font-semibold tracking-[-0.04em]">{overview.progress.completedTasks}</p>
                      <p className="mt-1 text-sm text-white/72">steps finished</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[28px] bg-white px-6 py-6 text-[#173d4d] shadow-[0_24px_52px_-34px_rgba(15,23,42,0.42)]">
                <p className="text-[1rem] leading-8 text-[#5f728d]">There is nothing urgent pulling at you. Use your weekly plan to get ahead before something becomes stressful.</p>
                <Link href="/assignments" className="mt-7 inline-flex min-h-14 items-center justify-center rounded-full bg-[#3f73e5] px-7 py-4 text-[1rem] font-semibold text-white">
                  Review your week
                </Link>
              </div>
            )}
          </div>

          {activated ? (
            <div className="border-t border-white/10 bg-[#3869d6] px-7 py-4 text-sm text-white/82 sm:px-9">
              Your semester is ready. Dueable will keep reordering this plan as you finish steps.
            </div>
          ) : null}
        </article>

        <aside className="space-y-4 rounded-4xl bg-white px-5 py-5 shadow-[0_24px_58px_-40px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8d99af]">This week</p>
              <h3 className="mt-2 text-[1.7rem] tracking-[-0.04em] text-[#15295c]">Keep momentum</h3>
            </div>
            <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-sm font-semibold text-[#2d6cdf]">{weeklyAssignments.length}</span>
          </div>

          <div className="space-y-3">
            {weeklyAssignments.length > 0 ? (
              weeklyAssignments.map((assignment, index) => (
                <Link
                  key={assignment.id}
                  href={`/assignments/${assignment.id}`}
                  className={`block rounded-3xl border px-4 py-4 transition ${
                    index === 0 ? "border-[#dbe5ff] bg-[#f5f8ff]" : "border-[#edf1f7] bg-[#fbfcff] hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9aa7bd]">{assignment.courseTitle}</p>
                      <p className="mt-2 text-[1.05rem] font-semibold leading-6 tracking-[-0.03em] text-[#15295c]">{assignment.title}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#5f6f89]">{assignment.progressPercent}%</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#6f7f99]">
                    <span className="rounded-full bg-white px-3 py-1.5">Due {formatDueDate(assignment.dueDate)}</span>
                    <span className="rounded-full bg-white px-3 py-1.5">{formatHours(assignment.estimatedHours)}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-[#dbe4f2] bg-[#fbfcff] px-4 py-5 text-sm leading-7 text-[#6f7f99]">
                No upcoming assignments are waiting right now.
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-[#f7f9fc] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#8d99af]">Finished today</p>
            {completedToday.length > 0 ? (
              <div className="mt-3 space-y-3">
                {completedToday.map((task) => (
                  <div key={task.id} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e8fbf4] text-[#19805f]">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#173d4d]">{task.title}</p>
                      <p className="mt-1 text-xs leading-6 text-[#6f7f99]">{task.assignmentTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-7 text-[#6f7f99]">Nothing checked off yet. Start the focus card first.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
