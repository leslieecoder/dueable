import { useEffect, useMemo, useState } from "react";
import { AssignmentCompleteButton } from "./AssignmentCompleteButton";
import { splitCourseDisplayLabel } from "./course-display";
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
  endsAt: number | null;
}

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

export function AssignmentSteps({
  focus,
  metadata,
  steps: _initialSteps,
  initialProgress: _initialProgress,
  onOpenAssignment,
  onCompleteAssignment,
  isCompletingAssignment,
}: {
  focus: ExtensionOverviewFocus;
  metadata: string[];
  steps: ExtensionOverviewStep[];
  initialProgress: ExtensionOverviewFocus["progress"];
  onOpenAssignment?: () => void;
  onCompleteAssignment?: () => void;
  isCompletingAssignment?: boolean;
}) {
  const isWorkAhead = focus.badgeLabel === "Work Ahead";
  const [phase, setPhase] = useState<TimerPhase>("work");
  const [secondsRemaining, setSecondsRemaining] = useState(() => getPhaseDurationSeconds("work"));
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedFocusBlocks, setCompletedFocusBlocks] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const courseDisplay = useMemo(() => splitCourseDisplayLabel(focus.assignment.course), [focus.assignment.course]);
  const courseCodePillStyle = useMemo(() => buildCourseCodePillStyle(focus.assignment.courseColor), [focus.assignment.courseColor]);
  const suggestedFocusBlocks = useMemo(
    () => Math.max(1, Math.ceil((focus.estimatedHours * 60) / (WORK_MINUTES * 60))),
    [focus.estimatedHours],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await chrome.storage.local.get(TIMER_STORAGE_KEY);
      const nextState = getStoredStateForAssignment((stored[TIMER_STORAGE_KEY] as StoredTimerState | undefined) ?? null, focus.assignment.id);

      if (cancelled) {
        return;
      }

      if (!nextState) {
        setPhase("work");
        setSecondsRemaining(getPhaseDurationSeconds("work"));
        setIsTimerRunning(false);
        setCompletedFocusBlocks(0);
        setStatusMessage(null);
        return;
      }

      setPhase(nextState.phase);
      setSecondsRemaining(nextState.secondsRemaining);
      setIsTimerRunning(nextState.isTimerRunning);
      setCompletedFocusBlocks(nextState.completedFocusBlocks);
      setStatusMessage(nextState.statusMessage);
    })();

    return () => {
      cancelled = true;
    };
  }, [focus.assignment.id]);

  useEffect(() => {
    const endsAt = isTimerRunning ? Date.now() + secondsRemaining * 1000 : null;

    void chrome.storage.local.set({
      [TIMER_STORAGE_KEY]: {
        assignmentId: focus.assignment.id,
        phase,
        secondsRemaining,
        isTimerRunning,
        completedFocusBlocks,
        endsAt,
      } satisfies StoredTimerState,
    });
  }, [completedFocusBlocks, focus.assignment.id, isTimerRunning, phase, secondsRemaining]);

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
    <section className="popup-panel focus-panel">
      <div className="focus-card focus-card-accent focus-card-with-steps">
        <div className="focus-top-tags">
          <span className="priority-pill">{focus.priorityLabel}</span>
          {courseDisplay.courseCode ? <span className="course-code-pill" style={courseCodePillStyle}>{courseDisplay.courseCode}</span> : null}
          {focus.badgeLabel ? <span className="work-ahead-pill">{focus.badgeLabel}</span> : null}
        </div>

        <div className="focus-card-header">
          <div>
            <button type="button" className="assignment-title-button assignment-title-button-large" onClick={onOpenAssignment} disabled={!onOpenAssignment}>
              <h2>{focus.assignment.title}</h2>
            </button>
            <p className="focus-course">{courseDisplay.courseName}</p>
          </div>
        </div>

        <div className="tag-row">
          {metadata.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>

        <div className="focus-steps-shell checklist-shell">
          <div className="pomodoro-shell">
            <div className="pomodoro-phase-row">
              <p className="steps-heading">{getPhaseLabel(phase)}</p>
              <span className="pomodoro-phase-chip">{phase === "work" ? `${WORK_MINUTES}/${SHORT_BREAK_MINUTES}` : phase === "short_break" ? `${SHORT_BREAK_MINUTES} min` : `${LONG_BREAK_MINUTES} min`}</span>
            </div>

            <div className="pomodoro-timer-card">
              <p className="pomodoro-timer-display">{formatTimer(secondsRemaining)}</p>
              <p className="pomodoro-timer-copy">{getPhasePrompt(phase)}</p>
            </div>

            <div className="pomodoro-stats-grid">
              <div className="pomodoro-stat-card">
                <span className="pomodoro-stat-label">Focus blocks</span>
                <strong>{completedFocusBlocks}</strong>
              </div>
              <div className="pomodoro-stat-card">
                <span className="pomodoro-stat-label">Suggested today</span>
                <strong>{suggestedFocusBlocks}</strong>
              </div>
            </div>

            <div className="pomodoro-preset-row">
              <span className="tag-pill">{`${WORK_MINUTES} min work`}</span>
              <span className="tag-pill">{`${SHORT_BREAK_MINUTES} min short break`}</span>
              <span className="tag-pill">{`${LONG_BREAK_MINUTES} min long break after ${WORK_SESSIONS_UNTIL_LONG_BREAK}`}</span>
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
                {isTimerRunning ? "Pause session" : phase === "work" ? "Start focus session" : "Start break"}
              </button>
              <button type="button" className="secondary-button pomodoro-secondary-button" onClick={() => resetTimer(phase)}>
                Reset
              </button>
              <button type="button" className="text-button pomodoro-text-button" onClick={skipToNextPhase}>
                {phase === "work" ? "Skip to break" : "Back to work"}
              </button>
            </div>
          </div>

          {statusMessage ? <p className="panel-copy pomodoro-status-copy">{statusMessage}</p> : null}

          {onCompleteAssignment && !isWorkAhead ? (
            <div className="focus-complete-action">
              <AssignmentCompleteButton
                isPending={Boolean(isCompletingAssignment)}
                disabled={false}
                onClick={onCompleteAssignment}
              />
              <p className="focus-complete-hint">Use this when you are actually finished with the assignment.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}