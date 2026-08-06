"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Minus,
  NotebookText,
  PauseCircle,
  PlayCircle,
  Plus,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlannerQueueView = "work_ahead" | "overdue" | null;
type PlannerQueueTab = "this_week" | "work_ahead" | "overdue";
type TimerPhase = "work" | "short_break" | "long_break";

interface ExtensionOverviewStep {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
  order: number;
}

interface ExtensionOverviewAssignment {
  id: string;
  title: string;
  courseTitle: string;
  courseColor: string | null;
  dueDate: string;
  dateLabel: string;
  assignmentUrl: string | null;
  estimatedHours: number;
  pointsPossible: number | null;
  difficulty: string;
  priorityLabel: string;
  planProvider: string | null;
  badgeLabel: string | null;
  steps: ExtensionOverviewStep[];
  progress: {
    completedSteps: number;
    totalSteps: number;
  };
}

interface ExtensionOverviewPayload {
  synced: boolean;
  userName?: string;
  focus: {
    assignment: {
      id: string;
      title: string;
      course: string;
      courseColor: string | null;
      dueDate: string;
      dateLabel: string;
      assignmentUrl: string | null;
      points: number | null;
    };
    steps: ExtensionOverviewStep[];
    progress: {
      completedSteps: number;
      totalSteps: number;
    };
    estimatedHours: number;
    difficulty: string;
    priorityLabel: string;
    planProvider: string | null;
    badgeLabel: string | null;
  } | null;
  upcoming: ExtensionOverviewAssignment[];
  workAhead: ExtensionOverviewAssignment[];
  overdue: ExtensionOverviewAssignment[];
  closedOverdue: ExtensionOverviewAssignment[];
}

interface CompleteAssignmentResponse {
  success?: boolean;
  overview?: ExtensionOverviewPayload;
  error?: string;
}

interface CompletionState {
  assignmentTitle: string;
  nextTitle: string | null;
}

interface StoredTimerState {
  assignmentId: string;
  phase: TimerPhase;
  secondsRemaining: number;
  isTimerRunning: boolean;
  completedFocusBlocks: number;
  targetFocusBlocks: number;
  endsAt: number | null;
}

type StoredTimerStateMap = Record<string, StoredTimerState>;

const ASSIGNMENT_COMPLETED_AUTO_ADVANCE_MS = 1400;
const WORK_MINUTES = 20;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const WORK_SESSIONS_UNTIL_LONG_BREAK = 4;
const TIMER_STORAGE_KEY = "dueable-web-pomodoro-timer";

function getPhaseDurationSeconds(phase: TimerPhase) {
  if (phase === "work") {
    return WORK_MINUTES * 60;
  }

  if (phase === "short_break") {
    return SHORT_BREAK_MINUTES * 60;
  }

  return LONG_BREAK_MINUTES * 60;
}

function getPhaseLabel(phase: TimerPhase) {
  if (phase === "work") {
    return "Pomodoro";
  }

  if (phase === "short_break") {
    return "Short break";
  }

  return "Long break";
}

function getPhasePrompt(phase: TimerPhase) {
  if (phase === "work") {
    return "Stay with this assignment for one focused block.";
  }

  if (phase === "short_break") {
    return "Take a short reset, then come back.";
  }

  return "You earned a longer reset before your next round.";
}

function formatTimer(secondsRemaining: number) {
  const safeSeconds = Math.max(0, secondsRemaining);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatDueDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatPoints(pointsPossible: number | null) {
  if (!Number.isFinite(pointsPossible) || pointsPossible === null) {
    return null;
  }

  return `${Number.isInteger(pointsPossible) ? pointsPossible.toFixed(0) : pointsPossible.toFixed(1)} pts`;
}

function formatEstimatedDuration(hours: number) {
  const minutes = Math.max(20, Math.round(hours * 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const roundedHours = minutes / 60;
  return Number.isInteger(roundedHours) ? `${roundedHours.toFixed(0)} hrs` : `${roundedHours.toFixed(1)} hrs`;
}

function normalizeCourseCode(rawCourseCode: string) {
  const normalizedCourseCode = rawCourseCode.replace(/\s+/g, " ").trim();
  const compactMatch = normalizedCourseCode.match(/^([A-Z]{2,})\s*(\d{3})/i);

  if (!compactMatch) {
    return normalizedCourseCode;
  }

  return `${compactMatch[1].toUpperCase()} ${compactMatch[2]}`;
}

function splitCourseDisplayLabel(courseLabel: string) {
  const normalizedCourseLabel = courseLabel.replace(/\s+/g, " ").trim();

  if (!normalizedCourseLabel) {
    return {
      courseCode: null,
      courseName: "",
    };
  }

  const dashedMatch = normalizedCourseLabel.split(" - ");

  if (dashedMatch.length > 1) {
    const [courseCode, ...courseNameParts] = dashedMatch;
    const courseName = courseNameParts.join(" - ").trim();

    if (courseCode && courseName) {
      return {
        courseCode: normalizeCourseCode(courseCode),
        courseName,
      };
    }
  }

  const compactMatch = normalizedCourseLabel.match(/^([A-Z]{2,}\s*\d[\w.-]*(?:\s+\([^)]*\))?)\s+(.+)$/);

  if (compactMatch) {
    return {
      courseCode: normalizeCourseCode(compactMatch[1]),
      courseName: compactMatch[2].trim(),
    };
  }

  return {
    courseCode: null,
    courseName: normalizedCourseLabel,
  };
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

function getWeeklyAssignments(payload: ExtensionOverviewPayload) {
  if (!payload.focus) {
    return [] as ExtensionOverviewAssignment[];
  }

  return [
    {
      id: payload.focus.assignment.id,
      title: payload.focus.assignment.title,
      courseTitle: payload.focus.assignment.course,
      courseColor: payload.focus.assignment.courseColor,
      dueDate: payload.focus.assignment.dueDate,
      dateLabel: payload.focus.assignment.dateLabel,
      assignmentUrl: payload.focus.assignment.assignmentUrl,
      estimatedHours: payload.focus.estimatedHours,
      pointsPossible: payload.focus.assignment.points,
      difficulty: payload.focus.difficulty,
      priorityLabel: payload.focus.priorityLabel,
      planProvider: payload.focus.planProvider,
      badgeLabel: payload.focus.badgeLabel,
      steps: payload.focus.steps,
      progress: payload.focus.progress,
    },
    ...payload.upcoming,
  ];
}

function getQueueAssignmentIds(payload: ExtensionOverviewPayload, queue: PlannerQueueView) {
  if (queue === "work_ahead") {
    return payload.workAhead.map((assignment) => assignment.id);
  }

  if (queue === "overdue") {
    return payload.overdue.map((assignment) => assignment.id);
  }

  return getWeeklyAssignments(payload).map((assignment) => assignment.id);
}

function getSuggestedFocusBlocks(estimatedHours: number) {
  return Math.max(1, Math.ceil((estimatedHours * 60) / WORK_MINUTES));
}

function readStoredTimerStates() {
  try {
    const storedValue = window.localStorage.getItem(TIMER_STORAGE_KEY);
    return storedValue ? (JSON.parse(storedValue) as StoredTimerStateMap) : {};
  } catch {
    return {} satisfies StoredTimerStateMap;
  }
}

function getStoredStateForAssignment(
  storedState: StoredTimerState | null,
  assignmentId: string,
  defaultTargetFocusBlocks: number,
): (StoredTimerState & { statusMessage: string | null }) | null {
  if (!storedState || storedState.assignmentId !== assignmentId) {
    return null;
  }

  const normalizedState = {
    ...storedState,
    targetFocusBlocks: Math.max(storedState.targetFocusBlocks ?? defaultTargetFocusBlocks, 1),
  };

  if (!normalizedState.isTimerRunning || normalizedState.endsAt === null) {
    return {
      ...normalizedState,
      secondsRemaining: Math.max(0, normalizedState.secondsRemaining),
      statusMessage: null,
    };
  }

  const nextSecondsRemaining = Math.ceil((normalizedState.endsAt - Date.now()) / 1000);

  if (nextSecondsRemaining > 0) {
    return {
      ...normalizedState,
      secondsRemaining: nextSecondsRemaining,
      statusMessage: null,
    };
  }

  if (normalizedState.phase === "work") {
    const nextCompletedFocusBlocks = normalizedState.completedFocusBlocks + 1;
    const nextPhase = nextCompletedFocusBlocks % WORK_SESSIONS_UNTIL_LONG_BREAK === 0 ? "long_break" : "short_break";

    return {
      assignmentId,
      phase: nextPhase,
      secondsRemaining: getPhaseDurationSeconds(nextPhase),
      isTimerRunning: false,
      completedFocusBlocks: nextCompletedFocusBlocks,
      targetFocusBlocks: Math.max(normalizedState.targetFocusBlocks, nextCompletedFocusBlocks),
      endsAt: null,
      statusMessage:
        nextPhase === "long_break"
          ? "Your focus block finished while you were away. Take a longer break."
          : "Your focus block finished while you were away. Take a short break.",
    };
  }

  return {
    assignmentId,
    phase: "work",
    secondsRemaining: getPhaseDurationSeconds("work"),
    isTimerRunning: false,
    completedFocusBlocks: normalizedState.completedFocusBlocks,
    targetFocusBlocks: normalizedState.targetFocusBlocks,
    endsAt: null,
    statusMessage: "Your break finished while you were away. Start your next focus block when you're ready.",
  };
}

function getDuePillClassName(dateText: string) {
  const lowered = dateText.toLowerCase();

  if (lowered.includes("available until") || lowered.includes("closed") || lowered.includes("today")) {
    return "border-[#f4c2c2] bg-[#fff3f3] text-[#c63d3d]";
  }

  return "border-[#cfe0ff] bg-[#f4f8ff] text-[#2f64d8]";
}

function getQueueBadge(assignment: ExtensionOverviewAssignment) {
  if (assignment.badgeLabel === "Work Ahead") {
    return {
      label: "Work Ahead",
      className: "border-[#bfe9ce] bg-[#effbf4] text-[#248b52]",
    };
  }

  if (assignment.dateLabel === "Available until" || assignment.dateLabel === "Closed") {
    return {
      label: "Overdue",
      className: "border-[#f4c2c2] bg-[#fff3f3] text-[#c63d3d]",
    };
  }

  return null;
}

function getCardTheme(assignment: ExtensionOverviewAssignment, priorityNumber: number) {
  const isPrimary = priorityNumber === 1;

  if (assignment.badgeLabel === "Work Ahead") {
    return isPrimary
      ? {
          bannerClass: "bg-[linear-gradient(135deg,#29a468,#40b97e)] text-white",
          cardClass: "border-[#d8efe2]",
          countClass: "bg-[#f6fff9] text-[#1f7449]",
        }
      : {
          bannerClass: "bg-[linear-gradient(135deg,#c9efd9,#e1f7e9)] text-[#218654]",
          cardClass: "border-[#d8efe2]",
          countClass: "bg-[#effbf4] text-[#248b52]",
        };
  }

  if (assignment.dateLabel === "Available until" || assignment.dateLabel === "Closed") {
    return isPrimary
      ? {
          bannerClass: "bg-[linear-gradient(135deg,#df7b2e,#ee9754)] text-white",
          cardClass: "border-[#f2ddcc]",
          countClass: "bg-[#fff7f1] text-[#9d4f16]",
        }
      : {
          bannerClass: "bg-[linear-gradient(135deg,#f9d5b6,#fde6d3)] text-[#b46123]",
          cardClass: "border-[#f2ddcc]",
          countClass: "bg-[#fff7f1] text-[#9d4f16]",
        };
  }

  return isPrimary
    ? {
        bannerClass: "bg-[linear-gradient(135deg,#336bdb,#4278df)] text-white",
        cardClass: "border-[#dce8ff]",
        countClass: "bg-white/20 text-white",
      }
    : {
        bannerClass: "bg-[linear-gradient(135deg,#c9dcfb,#dce8ff)] text-[#3665da]",
        cardClass: "border-[#dce8ff]",
        countClass: "bg-[#eef6ff] text-[#2758aa]",
      };
}

function getWelcomeName(name: string | undefined) {
  if (!name) {
    return "Student";
  }

  const trimmedName = name.trim();
  return trimmedName.length > 0 ? trimmedName : "Student";
}

function InlineAssignmentFocus({
  assignment,
  onCompleteAssignment,
  isCompletingAssignment,
}: {
  assignment: ExtensionOverviewAssignment;
  onCompleteAssignment: () => void;
  isCompletingAssignment: boolean;
}) {
  const defaultTargetFocusBlocks = useMemo(() => getSuggestedFocusBlocks(assignment.estimatedHours), [assignment.estimatedHours]);
  const [phase, setPhase] = useState<TimerPhase>("work");
  const [secondsRemaining, setSecondsRemaining] = useState(() => getPhaseDurationSeconds("work"));
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedFocusBlocks, setCompletedFocusBlocks] = useState(0);
  const [targetFocusBlocks, setTargetFocusBlocks] = useState(defaultTargetFocusBlocks);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasLoadedStoredState, setHasLoadedStoredState] = useState(false);

  const completionPercent = useMemo(
    () => Math.min(100, Math.round((Math.min(completedFocusBlocks, targetFocusBlocks) / targetFocusBlocks) * 100)),
    [completedFocusBlocks, targetFocusBlocks],
  );

  useEffect(() => {
    setHasLoadedStoredState(false);

    const storedStates = readStoredTimerStates();
    const nextState = getStoredStateForAssignment(storedStates[assignment.id] ?? null, assignment.id, defaultTargetFocusBlocks);

    if (!nextState) {
      setPhase("work");
      setSecondsRemaining(getPhaseDurationSeconds("work"));
      setIsTimerRunning(false);
      setCompletedFocusBlocks(0);
      setTargetFocusBlocks(defaultTargetFocusBlocks);
      setStatusMessage(null);
      setHasLoadedStoredState(true);
      return;
    }

    setPhase(nextState.phase);
    setSecondsRemaining(nextState.secondsRemaining);
    setIsTimerRunning(nextState.isTimerRunning);
    setCompletedFocusBlocks(nextState.completedFocusBlocks);
    setTargetFocusBlocks(nextState.targetFocusBlocks);
    setStatusMessage(nextState.statusMessage);
    setHasLoadedStoredState(true);
  }, [assignment.id, defaultTargetFocusBlocks]);

  useEffect(() => {
    if (!hasLoadedStoredState) {
      return;
    }

    const storedStates = readStoredTimerStates();

    window.localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        ...storedStates,
        [assignment.id]: {
          assignmentId: assignment.id,
          phase,
          secondsRemaining,
          isTimerRunning,
          completedFocusBlocks,
          targetFocusBlocks,
          endsAt: isTimerRunning ? Date.now() + secondsRemaining * 1000 : null,
        } satisfies StoredTimerState,
      } satisfies StoredTimerStateMap),
    );
  }, [assignment.id, completedFocusBlocks, hasLoadedStoredState, isTimerRunning, phase, secondsRemaining, targetFocusBlocks]);

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsRemaining((currentSecondsRemaining) => {
        if (currentSecondsRemaining > 1) {
          return currentSecondsRemaining - 1;
        }

        window.clearInterval(intervalId);
        setIsTimerRunning(false);

        if (phase === "work") {
          const nextCompletedFocusBlocks = completedFocusBlocks + 1;
          const nextPhase = nextCompletedFocusBlocks % WORK_SESSIONS_UNTIL_LONG_BREAK === 0 ? "long_break" : "short_break";

          setCompletedFocusBlocks(nextCompletedFocusBlocks);
          setTargetFocusBlocks((currentTargetFocusBlocks) => Math.max(currentTargetFocusBlocks, nextCompletedFocusBlocks));
          setPhase(nextPhase);
          setSecondsRemaining(getPhaseDurationSeconds(nextPhase));
          setStatusMessage(nextPhase === "long_break" ? "Focus block done. Take a longer break." : "Focus block done. Take a short break.");
          return 0;
        }

        setPhase("work");
        setSecondsRemaining(getPhaseDurationSeconds("work"));
        setStatusMessage("Break finished. Start your next focus block when you're ready.");
        return 0;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [completedFocusBlocks, isTimerRunning, phase]);

  function resetTimer(nextPhase: TimerPhase = "work") {
    setIsTimerRunning(false);
    setPhase(nextPhase);
    setSecondsRemaining(getPhaseDurationSeconds(nextPhase));
    setStatusMessage(null);
  }

  function skipToNextPhase() {
    if (phase === "work") {
      const nextPhase = (completedFocusBlocks + 1) % WORK_SESSIONS_UNTIL_LONG_BREAK === 0 ? "long_break" : "short_break";
      const nextCompletedFocusBlocks = completedFocusBlocks + 1;

      setCompletedFocusBlocks(nextCompletedFocusBlocks);
      setTargetFocusBlocks((currentTargetFocusBlocks) => Math.max(currentTargetFocusBlocks, nextCompletedFocusBlocks));
      resetTimer(nextPhase);
      setStatusMessage(nextPhase === "long_break" ? "Focus block done. Take a longer break." : "Focus block done. Take a short break.");
      return;
    }

    resetTimer("work");
    setStatusMessage("Back to a focus block.");
  }

  return (
    <div className="space-y-4 border-t border-[#edf2fb] px-4 pb-4 pt-3 sm:px-5">
      <div className="flex items-center justify-between gap-3 text-sm text-[#7b8496]">
        <p>{`${completedFocusBlocks} of ${targetFocusBlocks} focus ${targetFocusBlocks === 1 ? "session" : "sessions"} completed`}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dfe7f5] bg-white text-[#2d6cdf]"
            onClick={() => setTargetFocusBlocks((currentValue) => Math.max(Math.max(completedFocusBlocks, 1), currentValue - 1))}
            disabled={targetFocusBlocks <= Math.max(completedFocusBlocks, 1)}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dfe7f5] bg-white text-[#2d6cdf]"
            onClick={() => setTargetFocusBlocks((currentValue) => currentValue + 1)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <strong className="text-[#4d5568]">{`${completionPercent}%`}</strong>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#edf2f8]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#336bdb,#42c6a3)]" style={{ width: `${completionPercent}%` }} />
      </div>

      <div className="space-y-4 rounded-3xl bg-[linear-gradient(180deg,#eef5ff_0%,#f8fbff_100%)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6f85b0]">{getPhaseLabel(phase)}</p>
          <div className="flex gap-2" role="tablist" aria-label="Focus timer phases">
            {([
              { key: "work", label: "Pomodoro" },
              { key: "short_break", label: "Short break" },
              { key: "long_break", label: "Long break" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${phase === tab.key ? "bg-[#2d6cdf] text-white" : "bg-white text-[#5f7592]"}`}
                onClick={() => resetTimer(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] bg-white px-4 py-5 text-center shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)]">
          <p className="text-[3rem] font-semibold tracking-[-0.06em] text-[#15295c] sm:text-[3.8rem]">{formatTimer(secondsRemaining)}</p>
          <p className="mt-2 text-sm text-[#6f7f99]">{getPhasePrompt(phase)}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="dueable-button-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white"
            onClick={() => {
              setIsTimerRunning((currentIsTimerRunning) => !currentIsTimerRunning);
              setStatusMessage(null);
            }}
          >
            {isTimerRunning ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            <span>{isTimerRunning ? "Pause" : phase === "work" ? "Start session" : "Start break"}</span>
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[#dfe7f5] bg-white px-5 py-3 text-sm font-semibold text-[#2d6cdf]"
            onClick={skipToNextPhase}
          >
            <SkipForward className="h-4 w-4" />
            <span>{phase === "work" ? "Next" : "Back to work"}</span>
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[#dfe7f5] bg-white px-5 py-3 text-sm font-semibold text-[#5f7592]"
            onClick={() => resetTimer(phase)}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>

        <button
          type="button"
          className="dueable-button-primary inline-flex min-h-11 w-full items-center justify-center px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isCompletingAssignment}
          onClick={onCompleteAssignment}
        >
          {isCompletingAssignment ? "Completing..." : "Mark assignment complete"}
        </button>

        {statusMessage ? <p className="text-sm text-[#5f7f73]">{statusMessage}</p> : null}
      </div>

      <Link href={`/assignments/${assignment.id}`} className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#dfe7f5] bg-white px-5 py-3 text-sm font-semibold text-[#2d6cdf]">
        Open full assignment page
      </Link>
    </div>
  );
}

function AssignmentCard({
  assignment,
  priorityNumber,
  isSelected,
  isExpanded,
  onSelect,
  onOpenAssignment,
  onStartAssignment,
  onCompleteAssignment,
  isCompletingAssignment,
}: {
  assignment: ExtensionOverviewAssignment;
  priorityNumber: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onOpenAssignment: () => void;
  onStartAssignment: () => void;
  onCompleteAssignment: () => void;
  isCompletingAssignment: boolean;
}) {
  const courseDisplay = useMemo(() => splitCourseDisplayLabel(assignment.courseTitle), [assignment.courseTitle]);
  const courseCodePillStyle = useMemo(() => buildCourseCodePillStyle(assignment.courseColor), [assignment.courseColor]);
  const queueBadge = getQueueBadge(assignment);
  const theme = getCardTheme(assignment, priorityNumber);
  const summaryPercent = assignment.progress.totalSteps > 0 ? Math.round((assignment.progress.completedSteps / assignment.progress.totalSteps) * 100) : 0;
  const metaBadges = [formatPoints(assignment.pointsPossible), formatEstimatedDuration(assignment.estimatedHours)].filter(
    (value): value is string => Boolean(value),
  );
  const bannerCourseStyle =
    priorityNumber === 1
      ? {
          ...courseCodePillStyle,
          borderColor: "rgba(255, 255, 255, 0.34)",
          backgroundColor: "rgba(255, 255, 255, 0.12)",
          color: "#ffffff",
        }
      : courseCodePillStyle;

  return (
    <article
      className={`overflow-hidden rounded-[28px] border bg-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.24)] transition ${theme.cardClass} ${isSelected ? "ring-2 ring-[#d7e5ff]" : ""}`}
    >
      <div className="cursor-pointer" onClick={onSelect} role="button" tabIndex={0} onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}>
        <div className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5 ${theme.bannerClass}`}>
          <span className="text-sm font-extrabold tracking-[-0.03em]">{assignment.priorityLabel}</span>
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold" style={bannerCourseStyle}>
            <NotebookText className="h-4 w-4 shrink-0" />
            <span className="truncate">{courseDisplay.courseCode ?? courseDisplay.courseName}</span>
          </span>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          <button
            type="button"
            className="w-full text-left"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
              onOpenAssignment();
            }}
          >
            <span className="inline-flex items-start gap-2 text-[1.45rem] font-semibold leading-[1.14] tracking-[-0.04em] text-[#15295c] transition hover:text-[#2d6cdf] sm:text-[1.7rem]">
              <span>{assignment.title}</span>
              {assignment.assignmentUrl ? <ExternalLink className="mt-1 h-4 w-4 shrink-0" /> : null}
            </span>
          </button>

          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${getDuePillClassName(`${assignment.dateLabel} ${formatDueDate(assignment.dueDate)}`)}`}>
              <Clock3 className="h-3.5 w-3.5" />
              <span>{`${assignment.dateLabel} ${formatDueDate(assignment.dueDate)}`}</span>
            </span>
            {queueBadge ? <span className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold ${queueBadge.className}`}>{queueBadge.label}</span> : null}
            {metaBadges.map((badge) => (
              <span key={badge} className="inline-flex items-center rounded-full border border-[#cfe0ff] bg-[#f4f8ff] px-3 py-2 text-xs font-semibold text-[#2f64d8]">
                {badge}
              </span>
            ))}
          </div>

          {!isExpanded ? (
            <>
              <div className="flex items-center justify-between gap-3 text-sm text-[#7b8496]">
                <p>{`${assignment.progress.completedSteps} of ${assignment.progress.totalSteps} tasks completed`}</p>
                <strong className={`${theme.countClass} rounded-full px-2.5 py-1 text-xs font-extrabold`}>{`${summaryPercent}%`}</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#edf2f8]">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#336bdb,#42c6a3)]" style={{ width: `${summaryPercent}%` }} />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {!isExpanded ? (
        <div className="px-4 pb-4 sm:px-5">
          <button
            type="button"
            className="dueable-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
            onClick={onStartAssignment}
          >
            <PlayCircle className="h-5 w-5" />
            <span>Start this assignment</span>
          </button>
        </div>
      ) : null}

      {isExpanded ? (
        <InlineAssignmentFocus
          assignment={assignment}
          onCompleteAssignment={onCompleteAssignment}
          isCompletingAssignment={isCompletingAssignment}
        />
      ) : null}
    </article>
  );
}

export function SimpleExtensionDashboardShell({
  initialOverview,
  userName,
  activated = false,
}: {
  initialOverview: ExtensionOverviewPayload;
  userName: string;
  activated?: boolean;
}) {
  const topRef = useRef<HTMLElement | null>(null);
  const selectedAssignmentIdRef = useRef<string | null>(null);
  const expandedAssignmentIdRef = useRef<string | null>(null);
  const revealedQueueRef = useRef<PlannerQueueView>(null);
  const [overview, setOverview] = useState<ExtensionOverviewPayload>({
    ...initialOverview,
    userName: initialOverview.userName ?? userName,
  });
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [revealedQueue, setRevealedQueue] = useState<PlannerQueueView>(null);
  const [showClosedOverdueAssignments, setShowClosedOverdueAssignments] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(
    activated ? "Your semester is ready. Dueable will keep reordering this plan as you move through the week." : null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompletingAssignment, setIsCompletingAssignment] = useState(false);
  const [completionState, setCompletionState] = useState<CompletionState | null>(null);

  useEffect(() => {
    selectedAssignmentIdRef.current = selectedAssignmentId;
  }, [selectedAssignmentId]);

  useEffect(() => {
    expandedAssignmentIdRef.current = expandedAssignmentId;
  }, [expandedAssignmentId]);

  useEffect(() => {
    revealedQueueRef.current = revealedQueue;
  }, [revealedQueue]);

  const refreshOverview = useCallback(async (options?: { silently?: boolean }) => {
    const silently = options?.silently === true;

    try {
      const response = await fetch("/api/extension/overview", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = (await response.json()) as ExtensionOverviewPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load your weekly plan right now.");
      }

      const nextOverview = {
        ...payload,
        userName: payload.userName ?? overview.userName ?? userName,
      } satisfies ExtensionOverviewPayload;

      setOverview(nextOverview);
      setErrorMessage(null);

      if (!silently) {
        setSelectedAssignmentId((currentAssignmentId) => {
          if (!currentAssignmentId) {
            return null;
          }

          const activeQueueAssignmentIds = new Set(getQueueAssignmentIds(nextOverview, revealedQueueRef.current));
          return activeQueueAssignmentIds.has(currentAssignmentId) ? currentAssignmentId : null;
        });

        setExpandedAssignmentId((currentAssignmentId) => {
          if (!currentAssignmentId) {
            return null;
          }

          const activeQueueAssignmentIds = new Set(getQueueAssignmentIds(nextOverview, revealedQueueRef.current));
          return activeQueueAssignmentIds.has(currentAssignmentId) ? currentAssignmentId : null;
        });

        setRevealedQueue((currentQueue) => {
          if (currentQueue === "work_ahead") {
            return nextOverview.workAhead.length > 0 ? currentQueue : nextOverview.focus ? null : currentQueue;
          }

          if (currentQueue === "overdue") {
            return nextOverview.overdue.length > 0 || nextOverview.closedOverdue.length > 0 ? currentQueue : nextOverview.focus ? null : currentQueue;
          }

          if (nextOverview.focus) {
            return null;
          }

          if (nextOverview.workAhead.length > 0) {
            return "work_ahead";
          }

          if (nextOverview.overdue.length > 0 || nextOverview.closedOverdue.length > 0) {
            return "overdue";
          }

          return currentQueue;
        });

        return;
      }

      const currentQueue = revealedQueueRef.current;
      const nextQueue =
        currentQueue === "work_ahead" && nextOverview.workAhead.length === 0 && nextOverview.focus
          ? null
          : currentQueue === "overdue" && nextOverview.overdue.length === 0 && nextOverview.closedOverdue.length === 0 && nextOverview.focus
            ? null
            : currentQueue;

      setRevealedQueue(nextQueue);

      const activeQueueAssignmentIds = new Set(getQueueAssignmentIds(nextOverview, nextQueue));

      setSelectedAssignmentId(activeQueueAssignmentIds.has(selectedAssignmentIdRef.current ?? "") ? selectedAssignmentIdRef.current : null);
      setExpandedAssignmentId(activeQueueAssignmentIds.has(expandedAssignmentIdRef.current ?? "") ? expandedAssignmentIdRef.current : null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load your weekly plan right now.");
    }
  }, [overview.userName, userName]);

  useEffect(() => {
    function handleWindowFocus() {
      void refreshOverview({ silently: true });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshOverview({ silently: true });
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshOverview]);

  useEffect(() => {
    if (completionState === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCompletionState(null);
    }, ASSIGNMENT_COMPLETED_AUTO_ADVANCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completionState]);

  const weeklyAssignments = useMemo(() => getWeeklyAssignments(overview), [overview]);
  const visibleAssignments = useMemo(() => {
    if (revealedQueue === "work_ahead") {
      return overview.workAhead;
    }

    if (revealedQueue === "overdue") {
      return overview.overdue;
    }

    return weeklyAssignments;
  }, [overview.overdue, overview.workAhead, revealedQueue, weeklyAssignments]);

  const displayedAssignment = useMemo(
    () => visibleAssignments.find((assignment) => assignment.id === selectedAssignmentId) ?? visibleAssignments[0] ?? null,
    [selectedAssignmentId, visibleAssignments],
  );
  const activeQueueTab: PlannerQueueTab = revealedQueue ?? "this_week";
  const availableQueueCounts = useMemo(
    () => ({
      thisWeek: weeklyAssignments.length,
      overdue: overview.overdue.length + overview.closedOverdue.length,
      workAhead: overview.workAhead.length,
    }),
    [overview.closedOverdue.length, overview.overdue.length, overview.workAhead.length, weeklyAssignments.length],
  );
  const showQueueTabs = availableQueueCounts.thisWeek > 0 || availableQueueCounts.overdue > 0 || availableQueueCounts.workAhead > 0;
  const showCaughtUpState = weeklyAssignments.length === 0 && revealedQueue === null;
  const showOverdueEmptyState = activeQueueTab === "overdue" && visibleAssignments.length === 0;
  const showWorkAheadEmptyState = activeQueueTab === "work_ahead" && visibleAssignments.length === 0;
  const welcomeName = getWelcomeName(overview.userName ?? userName);

  function handleSelectQueue(queue: PlannerQueueTab) {
    setSelectedAssignmentId(null);
    setExpandedAssignmentId(null);
    setShowClosedOverdueAssignments(false);

    if (queue === "this_week") {
      setRevealedQueue(null);
      return;
    }

    setRevealedQueue(queue);
  }

  function openAssignment(url: string | null) {
    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleMarkAssignmentComplete(assignment: ExtensionOverviewAssignment) {
    setIsCompletingAssignment(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch("/api/extension/complete-assignment", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId: assignment.id }),
      });

      const payload = (await response.json()) as CompleteAssignmentResponse;

      if (!response.ok || !payload.success || !payload.overview) {
        throw new Error(payload.error ?? "We couldn't update this assignment right now.");
      }

      const nextOverview = {
        ...payload.overview,
        userName: payload.overview.userName ?? overview.userName ?? userName,
      } satisfies ExtensionOverviewPayload;

      setOverview(nextOverview);
      setSelectedAssignmentId(null);
      setExpandedAssignmentId(null);
      setShowClosedOverdueAssignments(false);
      setFeedbackMessage("Assignment completed. Dueable moved to the next priority.");

      setRevealedQueue((currentQueue) => {
        if (currentQueue === "work_ahead" && nextOverview.workAhead.length === 0 && nextOverview.focus) {
          return null;
        }

        if (currentQueue === "overdue" && nextOverview.overdue.length === 0 && nextOverview.focus) {
          return null;
        }

        return currentQueue;
      });

      setCompletionState({
        assignmentTitle: assignment.title,
        nextTitle: nextOverview.focus?.assignment.title ?? null,
      });
      scrollToTop();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn't update this assignment right now.");
    } finally {
      setIsCompletingAssignment(false);
    }
  }

  return (
    <main ref={topRef} className="space-y-5">
      <header className="rounded-[30px] border border-[#dfe8f6] bg-white px-5 py-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.16)] sm:px-6">
        <div className="space-y-1">
          <h1 className="dueable-display text-[2.6rem] leading-[0.96] tracking-tighter text-[#15295c] sm:text-[3.35rem]">Welcome back {welcomeName}</h1>
          <p className="dueable-display text-[1rem] text-[#637087] sm:text-[1.2rem]">Let&apos;s get things done</p>
        </div>
      </header>

      {feedbackMessage ? (
        <section className="rounded-[22px] border border-[#d7e5f8] bg-white px-5 py-4 text-sm font-medium text-[#47617f] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.18)]">
          {feedbackMessage}
        </section>
      ) : null}

      {errorMessage ? (
        <section className="rounded-[22px] border border-[#f5d4ce] bg-[#fff7f5] px-5 py-4 text-sm font-medium text-[#b85a4a] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)]">
          {errorMessage}
        </section>
      ) : null}

      {completionState ? (
        <section className="rounded-[26px] border border-[#d9e4f7] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-5 py-5 shadow-[0_26px_50px_-38px_rgba(53,88,154,0.24)]">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#e8fbf4] text-[#19805f]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8d99af]">Assignment completed</p>
              <h2 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-[#15295c]">{completionState.assignmentTitle}</h2>
              <p className="text-sm leading-7 text-[#6f7f99]">
                {completionState.nextTitle ? `Dueable moved you to ${completionState.nextTitle}.` : "Nice work. You cleared that assignment."}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {showQueueTabs ? (
        <section className="rounded-[26px] border border-[#e2ebf7] bg-white px-4 py-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)] sm:px-5">
          <div className="space-y-4">
            <div className="space-y-1">
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {([
                { key: "this_week", label: "This Week", count: availableQueueCounts.thisWeek, activeClass: "bg-[#dce8ff] text-[#2758aa] shadow-[0_12px_24px_-18px_rgba(39,88,170,0.42)]", idleClass: "bg-[#f5f8ff] text-[#59708d]" },
                { key: "overdue", label: "Overdue", count: availableQueueCounts.overdue, activeClass: "bg-[#fde6d3] text-[#9d4f16] shadow-[0_12px_24px_-18px_rgba(180,97,35,0.35)]", idleClass: "bg-[#fff7f0] text-[#a46636]" },
                { key: "work_ahead", label: "Work Ahead", count: availableQueueCounts.workAhead, activeClass: "bg-[#e1f7e9] text-[#1f7449] shadow-[0_12px_24px_-18px_rgba(33,134,84,0.34)]", idleClass: "bg-[#f3fbf6] text-[#4b8d67]" },
              ] as const).map((tab) => {
                const isActive = activeQueueTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-semibold transition ${isActive ? tab.activeClass : tab.idleClass}`}
                    onClick={() => handleSelectQueue(tab.key)}
                    disabled={tab.key !== "this_week" && tab.count === 0}
                  >
                    <span className="leading-tight">{tab.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${isActive ? "bg-white/80" : "bg-white text-[#2d6cdf]"}`}>{tab.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {showCaughtUpState ? (
        <section className="rounded-[28px] border border-[#d9e4f7] bg-[linear-gradient(180deg,#f7faff_0%,#ffffff_100%)] p-6 shadow-[0_24px_48px_-36px_rgba(53,88,154,0.2)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8d99af]">Caught up</p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-[#15295c]">You cleared this week.</h2>
          <p className="mt-3 max-w-2xl text-[1rem] leading-8 text-[#6f7f99]">When nothing is urgent, use this same simple view to work ahead or review overdue work.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="dueable-button-primary inline-flex min-h-12 items-center justify-center px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={overview.workAhead.length === 0} onClick={() => setRevealedQueue("work_ahead")}>
              See Work Ahead
            </button>
            <button type="button" className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-[#dfe7f5] bg-white px-5 py-3 text-sm font-semibold text-[#2d6cdf] disabled:opacity-50" disabled={availableQueueCounts.overdue === 0} onClick={() => setRevealedQueue("overdue")}>
              Review Overdue Work
            </button>
          </div>
        </section>
      ) : null}

      {visibleAssignments.length > 0 ? (
        <section className="space-y-4">
          {visibleAssignments.map((assignment, index) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              priorityNumber={index + 1}
              isSelected={(selectedAssignmentId ?? displayedAssignment?.id) === assignment.id}
              isExpanded={expandedAssignmentId === assignment.id}
              onSelect={() => {
                setSelectedAssignmentId(assignment.id);
              }}
              onOpenAssignment={() => openAssignment(assignment.assignmentUrl)}
              onStartAssignment={() => {
                setSelectedAssignmentId(assignment.id);
                setExpandedAssignmentId(assignment.id);
              }}
              onCompleteAssignment={() => {
                void handleMarkAssignmentComplete(assignment);
              }}
              isCompletingAssignment={isCompletingAssignment}
            />
          ))}
        </section>
      ) : null}

      {showOverdueEmptyState ? (
        <section className="rounded-[26px] border border-[#d9e4f7] bg-white px-6 py-6 text-[#4f5f79] shadow-[0_24px_48px_-36px_rgba(53,88,154,0.2)]">
          <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-[#15295c]">No overdue assignments are still available</h2>
          <p className="mt-3 text-[1rem] leading-8 text-[#6f7f99]">Anything past due without an active Canvas availability window is hidden from this queue.</p>
        </section>
      ) : null}

      {showWorkAheadEmptyState ? (
        <section className="rounded-[26px] border border-[#d9e4f7] bg-white px-6 py-6 text-[#4f5f79] shadow-[0_24px_48px_-36px_rgba(53,88,154,0.2)]">
          <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-[#15295c]">No work-ahead assignments are ready right now</h2>
          <p className="mt-3 text-[1rem] leading-8 text-[#6f7f99]">Dueable only moves larger future assignments into this queue when they are worth starting early.</p>
        </section>
      ) : null}

      {activeQueueTab === "overdue" && overview.closedOverdue.length > 0 ? (
        <section className="rounded-[26px] border border-[#d9e4f7] bg-white px-6 py-6 shadow-[0_24px_48px_-36px_rgba(53,88,154,0.2)]">
          <button
            type="button"
            className="text-left text-sm font-semibold text-[#2d6cdf]"
            onClick={() => setShowClosedOverdueAssignments((currentValue) => !currentValue)}
          >
            {showClosedOverdueAssignments
              ? `Hide ${overview.closedOverdue.length} overdue assignment${overview.closedOverdue.length === 1 ? "" : "s"} that are no longer available`
              : `View ${overview.closedOverdue.length} overdue assignment${overview.closedOverdue.length === 1 ? "" : "s"} that are no longer available`}
          </button>

          {showClosedOverdueAssignments ? (
            <div className="mt-4 space-y-3">
              {overview.closedOverdue.map((assignment) => (
                <div key={assignment.id} className="rounded-[20px] border border-[#e7ecf4] bg-[#fafcff] px-4 py-4">
                  <h3 className="text-[1rem] font-semibold text-[#15295c]">{assignment.title}</h3>
                  <p className="mt-2 text-sm text-[#8a96aa]">{`${assignment.dateLabel} ${formatDueDate(assignment.dueDate)}`}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}