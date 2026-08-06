"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlannerQueueView = "work_ahead" | "overdue" | null;
type PlannerQueueTab = "this_week" | "work_ahead" | "overdue";

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

const ASSIGNMENT_COMPLETED_AUTO_ADVANCE_MS = 1400;
const WORK_MINUTES = 20;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const WORK_SESSIONS_UNTIL_LONG_BREAK = 4;
const TIMER_STORAGE_KEY = "dueable-web-pomodoro-timer";

type TimerPhase = "work" | "short_break" | "long_break";

interface StoredTimerState {
  assignmentId: string;
  phase: TimerPhase;
  secondsRemaining: number;
  isTimerRunning: boolean;
  completedFocusBlocks: number;
  endsAt: number | null;
}

type StoredTimerStateMap = Record<string, StoredTimerState>;

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
    return "Focus session";
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
    return "Step away for a short reset, then come back.";
  }

  return "You earned a longer reset before your next round.";
}

function formatTimer(secondsRemaining: number) {
  const safeSeconds = Math.max(0, secondsRemaining);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getStoredStateForAssignment(
  storedState: StoredTimerState | null,
  assignmentId: string,
): (StoredTimerState & { statusMessage: string | null }) | null {
  if (!storedState || storedState.assignmentId !== assignmentId) {
    return null;
  }

  if (!storedState.isTimerRunning || storedState.endsAt === null) {
    return {
      ...storedState,
      secondsRemaining: Math.max(0, storedState.secondsRemaining),
      statusMessage: null,
    };
  }

  const nextSecondsRemaining = Math.ceil((storedState.endsAt - Date.now()) / 1000);

  if (nextSecondsRemaining > 0) {
    return {
      ...storedState,
      secondsRemaining: nextSecondsRemaining,
      statusMessage: null,
    };
  }

  if (storedState.phase === "work") {
    const nextCompletedFocusBlocks = storedState.completedFocusBlocks + 1;
    const nextPhase = nextCompletedFocusBlocks % WORK_SESSIONS_UNTIL_LONG_BREAK === 0 ? "long_break" : "short_break";

    return {
      assignmentId,
      phase: nextPhase,
      secondsRemaining: getPhaseDurationSeconds(nextPhase),
      isTimerRunning: false,
      completedFocusBlocks: nextCompletedFocusBlocks,
      endsAt: null,
      statusMessage:
        nextPhase === "long_break"
          ? "Your focus block finished while you were away. Take a longer break before you come back."
          : "Your focus block finished while you were away. Take a short break, then restart when you're ready.",
    };
  }

  return {
    assignmentId,
    phase: "work",
    secondsRemaining: getPhaseDurationSeconds("work"),
    isTimerRunning: false,
    completedFocusBlocks: storedState.completedFocusBlocks,
    endsAt: null,
    statusMessage: "Your break finished while you were away. Start your next focus block when you're ready.",
  };
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

function formatEstimatedHours(hours: number) {
  if (hours <= 1) {
    return "~1 hour";
  }

  if (Number.isInteger(hours)) {
    return `~${hours} hours`;
  }

  return `~${hours.toFixed(1)} hours`;
}

function formatPoints(pointsPossible: number | null) {
  if (!Number.isFinite(pointsPossible) || pointsPossible === null) {
    return null;
  }

  return `${Number.isInteger(pointsPossible) ? pointsPossible.toFixed(0) : pointsPossible.toFixed(1)} pts`;
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

function FocusAssignmentCard({
  assignment,
  onOpenAssignment,
  onCompleteAssignment,
  isCompletingAssignment,
}: {
  assignment: ExtensionOverviewAssignment;
  onOpenAssignment: () => void;
  onCompleteAssignment: () => void;
  isCompletingAssignment: boolean;
}) {
  const isWorkAhead = assignment.badgeLabel === "Work Ahead";
  const [phase, setPhase] = useState<TimerPhase>("work");
  const [secondsRemaining, setSecondsRemaining] = useState(() => getPhaseDurationSeconds("work"));
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedFocusBlocks, setCompletedFocusBlocks] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasLoadedStoredState, setHasLoadedStoredState] = useState(false);
  const courseDisplay = useMemo(() => splitCourseDisplayLabel(assignment.courseTitle), [assignment.courseTitle]);
  const courseCodePillStyle = useMemo(() => buildCourseCodePillStyle(assignment.courseColor), [assignment.courseColor]);
  const suggestedFocusBlocks = useMemo(() => Math.max(1, Math.ceil(assignment.estimatedHours * 3)), [assignment.estimatedHours]);

  useEffect(() => {
    setHasLoadedStoredState(false);

    const storedValue = window.localStorage.getItem(TIMER_STORAGE_KEY);
    const storedStates = storedValue ? (JSON.parse(storedValue) as StoredTimerStateMap) : {};
    const nextState = getStoredStateForAssignment(storedStates[assignment.id] ?? null, assignment.id);

    if (!nextState) {
      setPhase("work");
      setSecondsRemaining(getPhaseDurationSeconds("work"));
      setIsTimerRunning(false);
      setCompletedFocusBlocks(0);
      setStatusMessage(null);
      setHasLoadedStoredState(true);
      return;
    }

    setPhase(nextState.phase);
    setSecondsRemaining(nextState.secondsRemaining);
    setIsTimerRunning(nextState.isTimerRunning);
    setCompletedFocusBlocks(nextState.completedFocusBlocks);
    setStatusMessage(nextState.statusMessage);
    setHasLoadedStoredState(true);
  }, [assignment.id]);

  useEffect(() => {
    if (!hasLoadedStoredState) {
      return;
    }

    const storedValue = window.localStorage.getItem(TIMER_STORAGE_KEY);
    const storedStates = storedValue ? (JSON.parse(storedValue) as StoredTimerStateMap) : {};

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
          endsAt: isTimerRunning ? Date.now() + secondsRemaining * 1000 : null,
        } satisfies StoredTimerState,
      } satisfies StoredTimerStateMap),
    );
  }, [assignment.id, completedFocusBlocks, hasLoadedStoredState, isTimerRunning, phase, secondsRemaining]);

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
        setPhase((currentPhase) => {
          if (currentPhase === "work") {
            setCompletedFocusBlocks((currentCompletedFocusBlocks) => {
              const nextCompletedFocusBlocks = currentCompletedFocusBlocks + 1;
              const nextPhase = nextCompletedFocusBlocks % WORK_SESSIONS_UNTIL_LONG_BREAK === 0 ? "long_break" : "short_break";

              setSecondsRemaining(getPhaseDurationSeconds(nextPhase));
              setStatusMessage(
                nextPhase === "long_break"
                  ? "Focus block done. Take a longer break before you come back."
                  : "Focus block done. Take a short break, then restart when you're ready.",
              );

              return nextCompletedFocusBlocks;
            });

            return currentPhase;
          }

          setSecondsRemaining(getPhaseDurationSeconds("work"));
          setStatusMessage("Break finished. Start your next focus block when you're ready.");
          return "work";
        });

        return 0;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isTimerRunning]);

  const metadata = useMemo(
    () => [
      formatPoints(assignment.pointsPossible),
      `${assignment.dateLabel} ${formatDueDate(assignment.dueDate)}`,
      assignment.difficulty,
      formatEstimatedHours(assignment.estimatedHours),
    ].filter((value): value is string => Boolean(value)),
    [assignment.dateLabel, assignment.dueDate, assignment.difficulty, assignment.estimatedHours, assignment.pointsPossible],
  );

  function resetTimer(nextPhase: TimerPhase = "work") {
    setIsTimerRunning(false);
    setPhase(nextPhase);
    setSecondsRemaining(getPhaseDurationSeconds(nextPhase));
    setStatusMessage(null);
  }

  function skipToNextPhase() {
    if (phase === "work") {
      const nextPhase = (completedFocusBlocks + 1) % WORK_SESSIONS_UNTIL_LONG_BREAK === 0 ? "long_break" : "short_break";

      setCompletedFocusBlocks((currentCompletedFocusBlocks) => currentCompletedFocusBlocks + 1);
      resetTimer(nextPhase);
      setStatusMessage(nextPhase === "long_break" ? "Jumped into a long break." : "Jumped into a short break.");
      return;
    }

    resetTimer("work");
    setStatusMessage("Back to a focus block.");
  }

  return (
    <section className="space-y-5 rounded-4xl border border-[#d9e4f7] bg-[linear-gradient(180deg,#f7faff_0%,#ffffff_100%)] p-6 shadow-[0_32px_62px_-42px_rgba(53,88,154,0.28)] sm:p-8">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[#ff7a1a] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white">{assignment.priorityLabel}</span>
        {courseDisplay.courseCode ? (
          <span className="rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={courseCodePillStyle}>
            {courseDisplay.courseCode}
          </span>
        ) : null}
        {assignment.badgeLabel ? <span className="rounded-full bg-[#b9df6f] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#486229]">{assignment.badgeLabel}</span> : null}
      </div>

      <div className="space-y-3">
        <button type="button" className="group text-left" onClick={onOpenAssignment}>
          <span className="inline-flex items-center gap-2 text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-[#15295c] transition group-hover:text-[#2d6cdf] sm:text-[2.7rem]">
            {assignment.title}
            {assignment.assignmentUrl ? <ExternalLink className="h-5 w-5 shrink-0" /> : null}
          </span>
        </button>
        <p className="text-[1rem] text-[#6f7f99]">{courseDisplay.courseName}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm font-medium text-[#6f7f99]">
        {metadata.map((tag) => (
          <span key={tag} className="rounded-full border border-[#dfe7f5] bg-white px-4 py-2">
            {tag}
          </span>
        ))}
      </div>

      <div className="space-y-5 rounded-3xl border border-[#e8eef7] bg-white px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8ea0ba]">{getPhaseLabel(phase)}</p>
            <p className="mt-2 text-sm text-[#6f7f99]">{getPhasePrompt(phase)}</p>
          </div>
          <span className="rounded-full border border-[#dfe7f5] bg-[#f8fbff] px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#2d6cdf]">
            {phase === "work" ? `${WORK_MINUTES}/${SHORT_BREAK_MINUTES}` : phase === "short_break" ? `${SHORT_BREAK_MINUTES} min` : `${LONG_BREAK_MINUTES} min`}
          </span>
        </div>

        <div className="rounded-3xl bg-[linear-gradient(145deg,#f8fbff_0%,#ffffff_100%)] px-5 py-6 text-center shadow-[0_18px_40px_-34px_rgba(15,23,42,0.12)]">
          <p className="text-[3.2rem] font-semibold tracking-[-0.06em] text-[#15295c] sm:text-[4.2rem]">{formatTimer(secondsRemaining)}</p>
          <p className="mt-3 text-sm text-[#6f7f99]">{phase === "work" ? "Stay on this assignment until the block ends." : "Reset, then come back when you are ready."}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-[#e8eef7] bg-[#fbfcff] px-4 py-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8ea0ba]">Focus blocks</p>
            <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.04em] text-[#15295c]">{completedFocusBlocks}</p>
          </div>
          <div className="rounded-[20px] border border-[#e8eef7] bg-[#fbfcff] px-4 py-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8ea0ba]">Suggested today</p>
            <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.04em] text-[#15295c]">{suggestedFocusBlocks}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm font-medium text-[#6f7f99]">
          <span className="rounded-full border border-[#dfe7f5] bg-[#f8fbff] px-4 py-2">{`${WORK_MINUTES} min work`}</span>
          <span className="rounded-full border border-[#dfe7f5] bg-[#f8fbff] px-4 py-2">{`${SHORT_BREAK_MINUTES} min short break`}</span>
          <span className="rounded-full border border-[#dfe7f5] bg-[#f8fbff] px-4 py-2">{`${LONG_BREAK_MINUTES} min long break after ${WORK_SESSIONS_UNTIL_LONG_BREAK}`}</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="dueable-button-primary inline-flex min-h-12 items-center justify-center px-5 py-3 text-sm font-semibold text-white"
            onClick={() => {
              setIsTimerRunning((currentIsTimerRunning) => !currentIsTimerRunning);
              setStatusMessage(null);
            }}
          >
            {isTimerRunning ? "Pause session" : phase === "work" ? "Start focus session" : "Start break"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-[#dfe7f5] bg-white px-5 py-3 text-sm font-semibold text-[#2d6cdf]"
            onClick={() => resetTimer(phase)}
          >
            Reset
          </button>
          <button type="button" className="inline-flex min-h-12 items-center justify-center px-2 py-3 text-sm font-semibold text-[#5f7f73]" onClick={skipToNextPhase}>
            {phase === "work" ? "Skip to break" : "Back to work"}
          </button>
        </div>

        {statusMessage ? <p className="text-sm text-[#5f7f73]">{statusMessage}</p> : null}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        {!isWorkAhead ? (
          <button
            type="button"
            className="dueable-button-primary inline-flex min-h-12 items-center justify-center px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isCompletingAssignment}
            onClick={onCompleteAssignment}
          >
            {isCompletingAssignment ? "Completing..." : "Mark assignment complete"}
          </button>
        ) : null}
        <Link href={`/assignments/${assignment.id}`} className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-[#dfe7f5] bg-white px-5 py-3 text-sm font-semibold text-[#2d6cdf]">
          Open full assignment page
        </Link>
      </div>

      {!isWorkAhead ? <p className="text-sm text-[#6f7f99]">Use this when you are actually finished with the assignment.</p> : null}
    </section>
  );
}

export function ExtensionDashboardShell({
  initialOverview,
  activated = false,
}: {
  initialOverview: ExtensionOverviewPayload;
  activated?: boolean;
}) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const selectedAssignmentIdRef = useRef<string | null>(null);
  const revealedQueueRef = useRef<PlannerQueueView>(null);
  const [overview, setOverview] = useState(initialOverview);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
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

      setOverview(payload);
      setErrorMessage(null);

      if (!silently) {
        setSelectedAssignmentId((currentAssignmentId) => {
          if (!currentAssignmentId) {
            return null;
          }

          const activeQueueAssignmentIds = new Set(getQueueAssignmentIds(payload, revealedQueueRef.current));

          return activeQueueAssignmentIds.has(currentAssignmentId) ? currentAssignmentId : null;
        });

        setRevealedQueue((currentQueue) => {
          if (currentQueue === "work_ahead") {
            return payload.workAhead.length > 0 ? currentQueue : payload.focus ? null : currentQueue;
          }

          if (currentQueue === "overdue") {
            return payload.overdue.length > 0 || payload.closedOverdue.length > 0 ? currentQueue : payload.focus ? null : currentQueue;
          }

          if (payload.focus) {
            return null;
          }

          if (payload.workAhead.length > 0) {
            return "work_ahead";
          }

          if (payload.overdue.length > 0 || payload.closedOverdue.length > 0) {
            return "overdue";
          }

          return currentQueue;
        });

        return;
      }

      const currentQueue = revealedQueueRef.current;
      const nextQueue =
        currentQueue === "work_ahead" && payload.workAhead.length === 0 && payload.focus
          ? null
          : currentQueue === "overdue" && payload.overdue.length === 0 && payload.focus
            ? null
            : currentQueue;

      setRevealedQueue(nextQueue);

      const currentSelectedAssignmentId = selectedAssignmentIdRef.current;

      if (!currentSelectedAssignmentId) {
        return;
      }

      const activeQueueAssignmentIds = new Set(getQueueAssignmentIds(payload, nextQueue));
      setSelectedAssignmentId(activeQueueAssignmentIds.has(currentSelectedAssignmentId) ? currentSelectedAssignmentId : null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load your weekly plan right now.");
    }
  }, []);

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
  const displayedAssignment = useMemo(() => {
    if (visibleAssignments.length === 0) {
      return null;
    }

    return visibleAssignments.find((assignment) => assignment.id === selectedAssignmentId) ?? visibleAssignments[0];
  }, [selectedAssignmentId, visibleAssignments]);
  const upcomingAssignments = useMemo(
    () => visibleAssignments.filter((assignment) => assignment.id !== displayedAssignment?.id),
    [displayedAssignment?.id, visibleAssignments],
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
  const showOverdueEmptyState = activeQueueTab === "overdue" && !displayedAssignment;
  const showWorkAheadEmptyState = activeQueueTab === "work_ahead" && !displayedAssignment;
  const upcomingSectionTitle = activeQueueTab === "overdue" ? "Overdue" : activeQueueTab === "work_ahead" ? "Work Ahead" : "This Week";

  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openAssignment(url: string | null) {
    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleMarkAssignmentComplete() {
    if (!displayedAssignment) {
      return;
    }

    setIsCompletingAssignment(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch("/api/extension/complete-assignment", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId: displayedAssignment.id }),
      });

      const payload = (await response.json()) as CompleteAssignmentResponse;

      if (!response.ok || !payload.success || !payload.overview) {
        throw new Error(payload.error ?? "We couldn't update this assignment right now.");
      }

      const nextOverview = payload.overview;

      setOverview(nextOverview);
      setSelectedAssignmentId(null);
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
        assignmentTitle: displayedAssignment.title,
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
    <main ref={topRef} className="space-y-6">
      <header className="space-y-4">
        <div className="max-w-4xl space-y-3">
         
          <h1 className="dueable-display text-[3rem] leading-[0.94] tracking-[-0.06em] text-[#15295c] sm:text-[4rem]">
Welcome          </h1>
     
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
        <section className="rounded-[30px] border border-[#d9e4f7] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-6 py-7 shadow-[0_30px_60px_-40px_rgba(53,88,154,0.24)]">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e8fbf4] text-[#19805f]">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8d99af]">Assignment completed</p>
              <h2 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-[#15295c]">{completionState.assignmentTitle}</h2>
              <p className="text-[1rem] leading-7 text-[#6f7f99]">
                {completionState.nextTitle ? `Nice work. Dueable already moved you to ${completionState.nextTitle}.` : "Nice work. You cleared that assignment."}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {showQueueTabs ? (
        <section className="rounded-3xl border border-[#e2ebf7] bg-white px-3 py-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)]">
          <div className="flex flex-wrap gap-2">
            {([
              { key: "this_week", label: "This Week", count: availableQueueCounts.thisWeek },
              { key: "overdue", label: "Overdue", count: availableQueueCounts.overdue },
              { key: "work_ahead", label: "Work Ahead", count: availableQueueCounts.workAhead },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  activeQueueTab === tab.key ? "bg-[#15295c] text-white" : "bg-[#f5f8ff] text-[#59708d]"
                }`}
                onClick={() => {
                  setSelectedAssignmentId(null);
                  setShowClosedOverdueAssignments(false);
                  setRevealedQueue(tab.key === "this_week" ? null : tab.key);
                }}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${activeQueueTab === tab.key ? "bg-white/18 text-white" : "bg-white text-[#2d6cdf]"}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showCaughtUpState ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[30px] border border-[#d9e4f7] bg-[linear-gradient(180deg,#f7faff_0%,#ffffff_100%)] p-7 shadow-[0_30px_60px_-40px_rgba(53,88,154,0.24)]">
            <p className="dueable-eyebrow text-[#8d99af]">Caught up</p>
            <h2 className="mt-4 text-[2.4rem] font-semibold tracking-tighter text-[#15295c]">You cleared this week.</h2>
            <p className="mt-4 max-w-xl text-[1rem] leading-8 text-[#6f7f99]">When nothing is urgent, use the same dashboard to work ahead or review overdue work without leaving your main app.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="dueable-button-primary inline-flex min-h-12 items-center justify-center px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={overview.workAhead.length === 0} onClick={() => setRevealedQueue("work_ahead")}>
                See Work Ahead
              </button>
              <button type="button" className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-[#dfe7f5] bg-white px-5 py-3 text-sm font-semibold text-[#2d6cdf] disabled:opacity-50" disabled={overview.overdue.length === 0} onClick={() => setRevealedQueue("overdue")}>
                Review Overdue Work
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {displayedAssignment ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <FocusAssignmentCard
            assignment={displayedAssignment}
            onOpenAssignment={() => openAssignment(displayedAssignment.assignmentUrl)}
            onCompleteAssignment={() => {
              void handleMarkAssignmentComplete();
            }}
            isCompletingAssignment={isCompletingAssignment}
          />

          <aside className="dueable-soft-panel h-fit space-y-4 rounded-[30px] px-5 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8d99af]">Queue</p>
                <h3 className="mt-2 text-[1.7rem] tracking-[-0.04em] text-[#15295c]">{upcomingSectionTitle}</h3>
              </div>
              <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-sm font-semibold text-[#2d6cdf]">{upcomingAssignments.length}</span>
            </div>

            <div className="space-y-3">
              {upcomingAssignments.length > 0 ? (
                upcomingAssignments.map((assignment) => {
                  const courseDisplay = splitCourseDisplayLabel(assignment.courseTitle);
                  const courseCodePillStyle = buildCourseCodePillStyle(assignment.courseColor);

                  return (
                    <article key={assignment.id} className={`rounded-3xl border px-4 py-4 transition ${selectedAssignmentId === assignment.id ? "border-[#cedbfd] bg-[#f6f9ff]" : "border-[#e9eef6] bg-white/82"}`}>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#ff7a1a] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white">{assignment.priorityLabel}</span>
                        {courseDisplay.courseCode ? (
                          <span className="rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={courseCodePillStyle}>
                            {courseDisplay.courseCode}
                          </span>
                        ) : null}
                        {assignment.badgeLabel ? <span className="rounded-full bg-[#b9df6f] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#486229]">{assignment.badgeLabel}</span> : null}
                      </div>

                      <button
                        type="button"
                        className="mt-3 text-left"
                        onClick={() => {
                          setSelectedAssignmentId(assignment.id);
                          scrollToTop();
                          openAssignment(assignment.assignmentUrl);
                        }}
                      >
                        <span className="text-[1.05rem] font-semibold leading-6 tracking-[-0.03em] text-[#15295c] transition hover:text-[#2d6cdf]">{assignment.title}</span>
                      </button>

                      <button
                        type="button"
                        className="mt-3 block w-full text-left"
                        onClick={() => {
                          setSelectedAssignmentId(assignment.id);
                          scrollToTop();
                        }}
                      >
                        <p className="text-sm text-[#6f7f99]">{courseDisplay.courseName}</p>
                        <div className="mt-3 flex items-center justify-between text-sm text-[#6f7f99]">
                          <span>{`${assignment.dateLabel} ${formatDueDate(assignment.dueDate)}`}</span>
                          <span>{`${assignment.progress.completedSteps}/${assignment.progress.totalSteps}`}</span>
                        </div>
                      </button>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-[#dbe4f2] bg-[#fbfcff] px-4 py-5 text-sm leading-7 text-[#6f7f99]">
                  No other assignments are waiting in this queue.
                </div>
              )}
            </div>
          </aside>
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
                  <p className="mt-1 text-sm text-[#6f7f99]">{assignment.courseTitle}</p>
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