import { Minus, Pause, Play, Plus, RotateCcw, StepForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AssignmentCompleteButton } from "./AssignmentCompleteButton";
import type { ExtensionOverviewFocus, ExtensionOverviewStep } from "./extension-types";

type TimerPhase = "work" | "short_break" | "long_break";

const WORK_MINUTES = 20;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const WORK_SESSIONS_UNTIL_LONG_BREAK = 4;
const TIMER_STORAGE_KEY = "dueablePomodoroTimer";

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

function buildDefaultTargetFocusBlocks(estimatedHours: number) {
  return Math.max(1, Math.ceil((estimatedHours * 60) / (WORK_MINUTES * 60)));
}

function getStoredStateForAssignment(
  storedState: StoredTimerState | null,
  assignmentId: string,
  defaultTargetFocusBlocks: number,
): (StoredTimerState & { statusMessage: string | null }) | null {
  if (!storedState || storedState.assignmentId !== assignmentId) {
    return null;
  }

  const normalizedTargetFocusBlocks = Math.max(
    storedState.completedFocusBlocks,
    storedState.targetFocusBlocks || defaultTargetFocusBlocks,
    1,
  );

  if (!storedState.isTimerRunning || storedState.endsAt === null) {
    return {
      ...storedState,
      targetFocusBlocks: normalizedTargetFocusBlocks,
      secondsRemaining: Math.max(0, storedState.secondsRemaining),
      statusMessage: null,
    };
  }

  const nextSecondsRemaining = Math.ceil((storedState.endsAt - Date.now()) / 1000);

  if (nextSecondsRemaining > 0) {
    return {
      ...storedState,
      targetFocusBlocks: normalizedTargetFocusBlocks,
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
      targetFocusBlocks: Math.max(normalizedTargetFocusBlocks, nextCompletedFocusBlocks),
      endsAt: null,
      statusMessage:
        nextPhase === "long_break"
          ? "Focus block done. Take a longer break before you come back."
          : "Focus block done. Take a short break, then restart when you're ready.",
    };
  }

  return {
    assignmentId,
    phase: "work",
    secondsRemaining: getPhaseDurationSeconds("work"),
    isTimerRunning: false,
    completedFocusBlocks: storedState.completedFocusBlocks,
    targetFocusBlocks: normalizedTargetFocusBlocks,
    endsAt: null,
    statusMessage: "Break finished. Start your next focus block when you're ready.",
  };
}

export function AssignmentSteps({
  focus,
  steps: _initialSteps,
  initialProgress: _initialProgress,
  onCompleteAssignment,
  isCompletingAssignment,
}: {
  focus: ExtensionOverviewFocus;
  steps: ExtensionOverviewStep[];
  initialProgress: ExtensionOverviewFocus["progress"];
  onCompleteAssignment?: () => void;
  isCompletingAssignment?: boolean;
}) {
  const defaultTargetFocusBlocks = useMemo(() => buildDefaultTargetFocusBlocks(focus.estimatedHours), [focus.estimatedHours]);
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
    let cancelled = false;

    setHasLoadedStoredState(false);

    void (async () => {
      const stored = await chrome.storage.local.get(TIMER_STORAGE_KEY);
      const storedStates = (stored[TIMER_STORAGE_KEY] as StoredTimerStateMap | undefined) ?? {};
      const nextState = getStoredStateForAssignment(
        storedStates[focus.assignment.id] ?? null,
        focus.assignment.id,
        defaultTargetFocusBlocks,
      );

      if (cancelled) {
        return;
      }

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
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultTargetFocusBlocks, focus.assignment.id]);

  useEffect(() => {
    if (!hasLoadedStoredState) {
      return;
    }

    const endsAt = isTimerRunning ? Date.now() + secondsRemaining * 1000 : null;

    void (async () => {
      const stored = await chrome.storage.local.get(TIMER_STORAGE_KEY);
      const storedStates = (stored[TIMER_STORAGE_KEY] as StoredTimerStateMap | undefined) ?? {};

      await chrome.storage.local.set({
        [TIMER_STORAGE_KEY]: {
          ...storedStates,
          [focus.assignment.id]: {
            assignmentId: focus.assignment.id,
            phase,
            secondsRemaining,
            isTimerRunning,
            completedFocusBlocks,
            targetFocusBlocks,
            endsAt,
          } satisfies StoredTimerState,
        } satisfies StoredTimerStateMap,
      });
    })();
  }, [completedFocusBlocks, focus.assignment.id, hasLoadedStoredState, isTimerRunning, phase, secondsRemaining, targetFocusBlocks]);

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
              setTargetFocusBlocks((currentTargetFocusBlocks) => Math.max(currentTargetFocusBlocks, nextCompletedFocusBlocks));
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
    <div className="priority-card-expanded-flow">
      <div className="priority-progress-copy-row priority-detail-progress-row">
        <p>{`${completedFocusBlocks} of ${targetFocusBlocks} focus ${targetFocusBlocks === 1 ? "session" : "sessions"} completed`}</p>
        <div className="pomodoro-session-counter" aria-label="Adjust target focus sessions">
          <button
            type="button"
            className="pomodoro-counter-button"
            onClick={() => setTargetFocusBlocks((currentValue) => Math.max(Math.max(completedFocusBlocks, 1), currentValue - 1))}
            disabled={targetFocusBlocks <= Math.max(completedFocusBlocks, 1)}
          >
            <Minus size={16} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="pomodoro-counter-button"
            onClick={() => setTargetFocusBlocks((currentValue) => currentValue + 1)}
          >
            <Plus size={16} strokeWidth={2.4} />
          </button>
        </div>
        <strong>{`${completionPercent}%`}</strong>
      </div>
      <div className="priority-progress-track" aria-hidden="true">
        <div className="priority-progress-fill" style={{ width: `${completionPercent}%` }} />
      </div>

      <div className="focus-steps-shell checklist-shell priority-card-expanded-shell">
        <div className="pomodoro-shell">
        <div className="pomodoro-shell-header">
          <p className="steps-heading pomodoro-shell-label">{getPhaseLabel(phase)}</p>
        </div>

        <div className="pomodoro-phase-tabs" role="tablist" aria-label="Focus timer phases">
          <button type="button" className={`pomodoro-phase-tab${phase === "work" ? " pomodoro-phase-tab-active" : ""}`} onClick={() => resetTimer("work")}>
            Pomodoro
          </button>
          <button type="button" className={`pomodoro-phase-tab${phase === "short_break" ? " pomodoro-phase-tab-active" : ""}`} onClick={() => resetTimer("short_break")}>
            Short break
          </button>
          <button type="button" className={`pomodoro-phase-tab${phase === "long_break" ? " pomodoro-phase-tab-active" : ""}`} onClick={() => resetTimer("long_break")}>
            Long break
          </button>
        </div>

        <div className="pomodoro-timer-card">
          <p className="pomodoro-timer-display">{formatTimer(secondsRemaining)}</p>
          <p className="pomodoro-timer-copy">{getPhasePrompt(phase)}</p>
        </div>

        <div className="pomodoro-actions-row">
          <button
            type="button"
            className="primary-button pomodoro-action-button"
            onClick={() => {
              setIsTimerRunning((currentIsTimerRunning) => !currentIsTimerRunning);
              setStatusMessage(null);
            }}
          >
            {isTimerRunning ? <Pause size={18} strokeWidth={2.2} /> : <Play size={18} strokeWidth={2.2} />}
            <span>{isTimerRunning ? "Pause" : phase === "work" ? "Start" : "Start break"}</span>
          </button>
          <button type="button" className="pomodoro-icon-button" onClick={skipToNextPhase} aria-label={phase === "work" ? "Skip to break" : "Back to work"}>
            <StepForward size={24} strokeWidth={2.1} />
          </button>
          <button type="button" className="pomodoro-icon-button" onClick={() => resetTimer(phase)} aria-label={`Reset ${getPhaseLabel(phase).toLowerCase()}`}>
            <RotateCcw size={22} strokeWidth={2.1} />
          </button>
        </div>

        {onCompleteAssignment ? (
          <div className="focus-complete-action">
            <AssignmentCompleteButton
              isPending={Boolean(isCompletingAssignment)}
              disabled={false}
              onClick={onCompleteAssignment}
            />
            <p className="focus-complete-hint">Mark the assignment complete when you are actually done with the work.</p>
          </div>
        ) : null}
        </div>
      </div>

      {statusMessage ? <p className="panel-copy pomodoro-status-copy">{statusMessage}</p> : null}
    </div>
  );
}
