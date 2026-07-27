"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatFocusDurationLabel, formatFocusElapsedLabel } from "@/features/focus/focus-session";
import { useAppStore } from "@/stores/app-store";

interface StudentFocusAssignment {
  id: string;
  title: string;
  courseTitle: string;
  dueDate: string;
  estimatedHours: number;
  pointsPossible: number | null;
}

type FocusPriorityLevel = "high" | "medium" | "low";

interface StudentFocusPriority {
  level: FocusPriorityLevel;
  factors: string[];
}

interface StudentFocusAction {
  title: string;
  estimatedMinutes: number;
}

export interface StudentFocusResponse {
  focus: {
    assignment: StudentFocusAssignment;
    priority: StudentFocusPriority;
    explanation: string;
    recommendedAction: StudentFocusAction;
  } | null;
  message?: string;
  error?: string;
}

type FocusCardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | {
      status: "success";
      focus: NonNullable<StudentFocusResponse["focus"]>;
    };

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatDaysLeft(value: string) {
  const dueDate = new Date(value);

  if (Number.isNaN(dueDate.getTime())) {
    return "Due date unavailable";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
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

function formatAttentionLabel(level: FocusPriorityLevel) {
  if (level === "high") {
    return "Worth doing now";
  }

  if (level === "medium") {
    return "Good to tackle soon";
  }

  return "Can wait a little";
}

function priorityPillClasses(level: FocusPriorityLevel) {
  if (level === "high") {
    return "bg-rose-100 text-rose-700";
  }

  if (level === "medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function formatEstimatedTime(hours: number) {
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

export function StudentFocusCard() {
  const [state, setState] = useState<FocusCardState>({ status: "loading" });
  const hasHydrated = useAppStore((store) => store.hasHydrated);
  const focusSession = useAppStore((store) => store.focusSession);
  const [elapsedLabel, setElapsedLabel] = useState<string>("");

  useEffect(() => {
    if (!hasHydrated || !focusSession) {
      setElapsedLabel("");
      return;
    }

    setElapsedLabel(formatFocusElapsedLabel(focusSession.startedAt));

    const intervalId = window.setInterval(() => {
      setElapsedLabel(formatFocusElapsedLabel(focusSession.startedAt));
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasHydrated, focusSession]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/focus", {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = (await response.json()) as StudentFocusResponse;

        if (!active) {
          return;
        }

        if (!response.ok) {
          setState({
            status: "error",
            message: payload.error ?? "Unable to load your focus right now.",
          });
          return;
        }

        if (!payload.focus) {
          setState({
            status: "empty",
            message: payload.message ?? "No focus recommendation is available right now.",
          });
          return;
        }

        setState({
          status: "success",
          focus: payload.focus,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unable to load your focus right now.",
        });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <section className="dueable-surface rounded-[32px] p-7 sm:p-9">
        <p className="dueable-eyebrow text-[#9aa7bd]">Your focus today</p>
        <h2 className="dueable-display mt-4 text-[2.75rem] leading-[0.98] tracking-[-0.05em] text-[#0f172a] sm:text-[3.45rem]">Finding the one thing worth starting next...</h2>
        <div className="mt-8 space-y-4">
          <div className="h-28 animate-pulse rounded-[24px] bg-[#eef3fb]" />
          <div className="h-36 animate-pulse rounded-[24px] bg-[#f4f7fc]" />
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="dueable-surface rounded-[32px] p-7 sm:p-9">
        <p className="dueable-eyebrow text-[#9aa7bd]">Your focus today</p>
        <h2 className="dueable-display mt-4 text-[2.6rem] leading-[1] tracking-[-0.05em] text-[#0f172a] sm:text-[3.1rem]">We couldn&apos;t load your focus.</h2>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[#6f7f99]">{state.message}</p>
      </section>
    );
  }

  if (state.status === "empty") {
    return (
      <section className="dueable-surface rounded-[32px] p-7 sm:p-9">
        <p className="dueable-eyebrow text-[#9aa7bd]">Your focus today</p>
        <h2 className="dueable-display mt-4 text-[2.6rem] leading-[1] tracking-[-0.05em] text-[#0f172a] sm:text-[3.1rem]">Nothing urgent is pulling at you right now.</h2>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[#6f7f99]">{state.message}</p>
        <Link href="/assignments" className="dueable-button-primary mt-7 inline-flex min-h-14 items-center justify-center px-7 py-4 text-[1.05rem] font-semibold">
          Open your assignments
        </Link>
      </section>
    );
  }

  const { assignment, priority, explanation, recommendedAction } = state.focus;
  const pointsLabel = formatPoints(assignment.pointsPossible);

  return (
    <section className="dueable-surface rounded-[32px] bg-[linear-gradient(145deg,_rgba(255,255,255,0.96),_rgba(248,250,255,0.94))] p-7 sm:p-10">
      {hasHydrated && focusSession ? (
        <div className="mb-8 rounded-[24px] bg-[linear-gradient(135deg,_rgba(50,196,154,0.14),_rgba(45,108,223,0.08))] p-5 sm:p-6">
          <p className="dueable-eyebrow text-[#5a8b7d]">Active focus</p>
          <p className="mt-3 text-[1.35rem] font-semibold tracking-[-0.03em] text-[#173d4d]">{focusSession.assignmentTitle}</p>
          <p className="mt-2 text-[1rem] leading-7 text-[#53726a]">Current step: {focusSession.currentStep.title}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.98rem]">
            <span className="rounded-full bg-white/85 px-4 py-2 font-semibold text-[#1b5e52]">{formatFocusDurationLabel(focusSession.duration)}</span>
            <span className="rounded-full bg-white/75 px-4 py-2 font-semibold text-[#4f627d]">{elapsedLabel || formatFocusElapsedLabel(focusSession.startedAt)}</span>
          </div>
          <Link
            href={`/assignments/${focusSession.assignmentId}`}
            className="dueable-button-primary mt-5 inline-flex min-h-12 items-center justify-center px-6 py-3 text-[1rem] font-semibold"
          >
            Continue focus
          </Link>
        </div>
      ) : null}

      <div className="max-w-5xl">
        <p className="dueable-eyebrow text-[#9aa7bd]">Your focus today</p>
        <p className="mt-5 text-[0.95rem] font-semibold uppercase tracking-[0.24em] text-[#2d6cdf]">Work on this now</p>
        <p className="mt-4 text-[1.05rem] font-medium text-[#7b88a2]">{assignment.courseTitle}</p>
        <h2 className="dueable-display mt-3 text-[3.25rem] leading-[0.92] tracking-[-0.05em] text-[#0f172a] sm:text-[4.65rem]">{assignment.title}</h2>
        <p className="mt-5 max-w-3xl text-[1.08rem] leading-8 text-[#5f6f89]">{explanation}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-[1.05rem] text-[#5f6f89]">
          <span className="rounded-full bg-[#eef4ff] px-4 py-2.5 font-semibold text-[#2d6cdf]">Due {formatDueDate(assignment.dueDate)}</span>
          {pointsLabel ? <span className="rounded-full bg-[#fff8eb] px-4 py-2.5 font-semibold text-[#9a6a17]">{pointsLabel}</span> : null}
          <span className="rounded-full bg-[#eef9f5] px-4 py-2.5 font-semibold text-[#19805f]">{formatEstimatedTime(assignment.estimatedHours)}</span>
          <span className="rounded-full bg-[#fff4ec] px-4 py-2.5 font-semibold text-[#b86c3f]">{formatDaysLeft(assignment.dueDate)}</span>
          <span className={`rounded-full px-4 py-2.5 font-semibold ${priorityPillClasses(priority.level)}`}>{formatAttentionLabel(priority.level)}</span>
        </div>
      </div>

      <div className="mt-9 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[24px] bg-[#fbfcff] p-6 sm:p-7">
          <p className="dueable-eyebrow text-[#9aa7bd]">Why this now</p>
          <p className="mt-5 text-[1.06rem] leading-8 text-[#5f6f89]">This recommendation is based on the signals below.</p>
          <ul className="mt-5 space-y-3 text-base leading-8 text-[#5f6f89]">
            {priority.factors.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-[#2d6cdf]" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[24px] bg-[linear-gradient(135deg,_rgba(255,185,138,0.24),_rgba(50,196,154,0.14),_rgba(45,108,223,0.1))] p-6 sm:p-8">
          <p className="dueable-eyebrow text-[#5a8b7d]">First small action</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/85 px-4 py-2 text-[0.98rem] font-semibold text-[#1b5e52]">{recommendedAction.estimatedMinutes} minutes to start</span>
            <span className="rounded-full bg-white/70 px-4 py-2 text-[0.98rem] font-semibold text-[#4d6f68]">One step only</span>
          </div>
          <p className="mt-5 text-[2.05rem] font-semibold leading-tight tracking-[-0.04em] text-[#173d4d]">{recommendedAction.title}</p>
          <p className="mt-4 text-[1.06rem] leading-8 text-[#5f7b76]">Start with this one action first. You do not need to finish the whole assignment right now.</p>
          <Link
            href={`/assignments/${assignment.id}`}
            className="dueable-button-primary mt-8 inline-flex min-h-14 items-center justify-center px-8 py-4 text-[1.2rem] font-semibold transition"
          >
            Start this step
          </Link>
          <div className="mt-5 rounded-[20px] bg-white/80 px-5 py-4 text-base leading-7 text-[#5f6f89]">
            After that, you&apos;ll open the assignment, see the checklist, and keep moving one step at a time.
          </div>
        </div>
      </div>
    </section>
  );
}