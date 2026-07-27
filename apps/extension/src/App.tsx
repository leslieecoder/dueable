import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Settings, Sparkles } from "lucide-react";
import { AllAssignmentsCompleted } from "./components/AllAssignmentsCompleted";
import { AssignmentCompleted } from "./components/AssignmentCompleted";
import { getCanvasBaseUrl, getCanvasCourses, type CanvasCourse } from "./lib/canvas/api";
import { filterCurrentSemesterCourses } from "./lib/canvas/course-filter";
import { getDueableUrl } from "./lib/dueable-app";
import { importSemester } from "./lib/canvas/semester-importer";
import { AssignmentCompleteButton } from "./components/AssignmentCompleteButton";
import { AssignmentSteps } from "./components/AssignmentSteps";
import { CanvasOnboarding } from "./components/CanvasOnboarding";
import { UpcomingAssignments } from "./components/UpcomingAssignments";
import { WorkOnNextCard } from "./components/WorkOnNextCard";
import type { ExtensionOverviewResponse } from "./components/extension-types";
import "./App.css";

interface ImportSemesterResponse {
  success?: boolean;
  coursesImported?: number;
  assignmentsImported?: number;
  error?: string;
}

interface CompleteAssignmentResponse {
  success?: boolean;
  overview?: ExtensionOverviewResponse;
  error?: string;
}

interface LogoutResponse {
  success?: boolean;
  error?: string;
}

type PopupViewState = "loading" | "unauthenticated" | "needs-import" | "ready" | "assignment-completed" | "error";

interface CompletionState {
  assignmentTitle: string;
}

function getFriendlyExtensionMessage(
  kind: "overview" | "import" | "complete-assignment",
  detail?: string,
) {
  const lowered = detail?.toLowerCase() ?? "";

  if (lowered.includes("signed in") || lowered.includes("401") || lowered.includes("unauthorized")) {
    return "Connect your Dueable account to see your assignments.";
  }

  if (kind === "import") {
    return "We couldn't sync your Canvas classes right now. Try again in a moment.";
  }

  if (kind === "complete-assignment") {
    return "We couldn't update this assignment right now. Try again in a moment.";
  }

  return "We couldn't load your Dueable plan right now. Try reopening the extension.";
}

function getFriendlyCanvasMessage(detail?: string) {
  const lowered = detail?.toLowerCase() ?? "";

  if (lowered.includes("401") || lowered.includes("unauthenticated") || lowered.includes("authorization required")) {
    return "Canvas needs you to be signed in on the open Canvas tab before Dueable can sync classes.";
  }

  return detail ?? "We couldn't read your Canvas classes right now. Try refreshing Canvas and reopening the extension.";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url) {
    throw new Error("No active browser tab is available.");
  }

  return {
    id: tab.id,
    url: tab.url,
  };
}

function isCanvasUrl(url: string) {
  try {
    const parsed = new URL(url);

    return parsed.hostname.includes("canvas") || parsed.hostname.endsWith(".instructure.com") || /\/courses\/\d+/.test(parsed.pathname);
  } catch {
    return false;
  }
}

function formatDueDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Due date unavailable";
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

function App() {
  const [viewState, setViewState] = useState<PopupViewState>("loading");
  const [statusMessage, setStatusMessage] = useState("Finding your next step...");
  const [overview, setOverview] = useState<ExtensionOverviewResponse | null>(null);
  const [currentCanvasCourses, setCurrentCanvasCourses] = useState<CanvasCourse[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isCompletingAssignment, setIsCompletingAssignment] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [completionState, setCompletionState] = useState<CompletionState | null>(null);

  async function loadExtensionState() {
    try {
      setViewState("loading");
      setStatusMessage("Finding your next step...");
      setFeedbackMessage(null);
      setCompletionState(null);

      const activeTab = await getActiveTab();

      if (!isCanvasUrl(activeTab.url)) {
        setOverview(null);
        setCurrentCanvasCourses([]);
        setViewState("error");
        setStatusMessage("Open Canvas to see your assignments and next step.");
        return;
      }

      const overviewResponse = await fetch(getDueableUrl("/api/extension/overview"), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = (await overviewResponse.json()) as ExtensionOverviewResponse;

      if (overviewResponse.status === 401) {
        setOverview(null);
        setCurrentCanvasCourses([]);
        setViewState("unauthenticated");
        setStatusMessage("Connect your Dueable account to see your assignments.");
        return;
      }

      if (!overviewResponse.ok) {
        throw new Error(getFriendlyExtensionMessage("overview", payload.error));
      }

      setOverview(payload);
      setStatusMessage(payload.synced ? "Canvas synced" : "Canvas not connected yet");

      if (payload.synced) {
        setCurrentCanvasCourses([]);
        setViewState("ready");
        return;
      }

      const canvasBaseUrl = getCanvasBaseUrl(activeTab.url);
      const courses = await getCanvasCourses(activeTab.id, canvasBaseUrl);
      const { currentCourses } = filterCurrentSemesterCourses(courses);

      setCurrentCanvasCourses(currentCourses);
      setViewState("needs-import");
    } catch (error) {
      setOverview(null);
      setCurrentCanvasCourses([]);
      setViewState("error");
      setStatusMessage(error instanceof Error ? getFriendlyCanvasMessage(error.message) : getFriendlyCanvasMessage());
    }
  }

  useEffect(() => {
    void loadExtensionState();
  }, []);

  async function handleOpenLogin() {
    await chrome.tabs.create({ url: getDueableUrl("/login?next=%2Fdashboard") });
  }

  async function handleOpenSettings() {
    await chrome.tabs.create({ url: getDueableUrl("/settings") });
  }

  async function handleOpenDashboard() {
    await chrome.tabs.create({ url: getDueableUrl("/dashboard") });
  }

  async function handleImportAssignments() {
    const activeTab = await getActiveTab();

    if (!isCanvasUrl(activeTab.url)) {
      setFeedbackMessage("Open your Canvas course in the current tab, then try again.");
      return;
    }

    const selectedCourseIds = currentCanvasCourses.map((course) => course.id);

    if (selectedCourseIds.length === 0) {
      setFeedbackMessage("Your Canvas classes are not synced yet.");
      return;
    }

    setIsImporting(true);
    setFeedbackMessage(null);

    try {
      const result = await importSemester(activeTab.id, activeTab.url, selectedCourseIds);
      const response = await fetch(getDueableUrl("/api/extension/import-semester"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });

      const payload = (await response.json()) as ImportSemesterResponse;

      if (!response.ok || !payload.success) {
        throw new Error(getFriendlyExtensionMessage("import", payload.error));
      }

      setFeedbackMessage(`Imported ${payload.assignmentsImported ?? result.assignmentsImported} assignments from Canvas.`);
      await loadExtensionState();
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? getFriendlyCanvasMessage(error.message) : getFriendlyCanvasMessage());
    } finally {
      setIsImporting(false);
    }
  }

  async function handleMarkAssignmentComplete(assignmentId: string, assignmentTitle: string) {
    setIsCompletingAssignment(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch(getDueableUrl("/api/extension/complete-assignment"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId }),
      });

      const payload = (await response.json()) as CompleteAssignmentResponse;

      if (!response.ok || !payload.success || !payload.overview) {
        throw new Error(getFriendlyExtensionMessage("complete-assignment", payload.error));
      }

      setOverview(payload.overview);
      setStatusMessage(payload.overview.synced ? "Canvas synced" : "Canvas not connected yet");
      setFeedbackMessage("Assignment completed. Dueable moved to the next priority.");

      if (payload.overview.focus) {
        setCompletionState({ assignmentTitle });
        setViewState("assignment-completed");
      } else {
        setCompletionState(null);
        setViewState("ready");
      }
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : getFriendlyExtensionMessage("complete-assignment"));
    } finally {
      setIsCompletingAssignment(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch(getDueableUrl("/api/extension/logout"), {
        method: "POST",
        credentials: "include",
      });

      const payload = (await response.json()) as LogoutResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "We couldn't log you out right now. Try again in a moment.");
      }

      setOverview(null);
      setCurrentCanvasCourses([]);
      setViewState("unauthenticated");
      setStatusMessage("Connect your Dueable account to see your assignments.");
      setFeedbackMessage("You have been logged out of Dueable.");
      setCompletionState(null);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "We couldn't log you out right now. Try again in a moment.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleRefreshAfterAllStepsComplete(assignmentTitle: string) {
    try {
      const overviewResponse = await fetch(getDueableUrl("/api/extension/overview"), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = (await overviewResponse.json()) as ExtensionOverviewResponse;

      if (!overviewResponse.ok) {
        throw new Error(getFriendlyExtensionMessage("overview", payload.error));
      }

      setOverview(payload);
      setStatusMessage(payload.synced ? "Canvas synced" : "Canvas not connected yet");
      setFeedbackMessage("Nice work. Dueable updated your next priority.");
      setCompletionState({ assignmentTitle });
      setViewState(payload.focus || payload.upcoming.length > 0 ? "assignment-completed" : "ready");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : getFriendlyExtensionMessage("overview"));
      await loadExtensionState();
    }
  }

  function handleContinueAfterCompletion() {
    setCompletionState(null);
    setViewState("ready");
  }

  const activeFocus = overview?.focus ?? null;
  const upcomingAssignments = overview?.upcoming ?? [];
  const hasAssignments = Boolean(activeFocus) || upcomingAssignments.length > 0;
  const focusMetadata = useMemo(() => {
    if (!activeFocus) {
      return [] as string[];
    }

    return [
      formatPoints(activeFocus.assignment.points),
      `Due ${formatDueDate(activeFocus.assignment.dueDate)}`,
      activeFocus.difficulty,
      formatEstimatedHours(activeFocus.estimatedHours),
    ].filter((value): value is string => Boolean(value));
  }, [activeFocus]);

  const formattedUpcomingAssignments = useMemo(
    () =>
      upcomingAssignments.map((assignment) => ({
        ...assignment,
        formattedDueDate: formatDueDate(assignment.dueDate),
        formattedPoints: formatPoints(assignment.pointsPossible),
      })),
    [upcomingAssignments],
  );

  const showCaughtUpState = viewState === "ready" && !hasAssignments;

  return (
    <main className="popup-shell">
      <section className="popup-header-card">
        <div className="popup-brand-row">
          <div className="popup-brand-lockup">
            <div className="popup-brand-mark">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="popup-brand-label">Dueable</p>
              <h1>What should I work on right now?</h1>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={() => void handleOpenSettings()} aria-label="Open settings">
            <Settings size={16} />
          </button>
        </div>

        <div className="popup-status-row">
          <span className={`sync-pill sync-${viewState === "error" ? "error" : viewState === "loading" ? "loading" : "ready"}`}>
            {viewState === "ready" || viewState === "needs-import" ? <CheckCircle2 size={14} /> : null}
            {statusMessage}
          </span>
        </div>
      </section>

      {viewState === "loading" ? (
        <section className="popup-panel">
          <div className="loading-card">
            <p className="section-label">Finding your next step...</p>
            <div className="loading-shimmer loading-title" aria-hidden="true" />
            <div className="loading-shimmer loading-line" aria-hidden="true" />
            <div className="loading-shimmer loading-line short" aria-hidden="true" />
          </div>
        </section>
      ) : null}

      {viewState === "unauthenticated" ? (
        <section className="popup-panel">
          <div className="empty-card auth-card">
            <p className="panel-title">Connect your Dueable account</p>
            <p className="panel-copy">See what assignment matters most without leaving Canvas.</p>
            <button type="button" className="primary-button" onClick={() => void handleOpenLogin()}>
              Login to Dueable
            </button>
          </div>
        </section>
      ) : null}

      {viewState === "needs-import" ? (
        <CanvasOnboarding
          courseCount={currentCanvasCourses.length}
          isImporting={isImporting}
          feedbackMessage={feedbackMessage}
          onImport={() => void handleImportAssignments()}
        />
      ) : null}

      {viewState === "error" ? (
        <section className="popup-panel">
          <div className="empty-card">
            <p className="panel-title">Open Canvas to get started.</p>
            <p className="panel-copy">{statusMessage}</p>
          </div>
        </section>
      ) : null}

      {viewState === "assignment-completed" && completionState ? (
        <AssignmentCompleted
          assignmentTitle={completionState.assignmentTitle}
          nextTitle={activeFocus?.assignment.title ?? null}
          onContinue={handleContinueAfterCompletion}
        />
      ) : null}

      {viewState === "ready" && activeFocus ? (
        <>
          <WorkOnNextCard focus={activeFocus} metadata={focusMetadata} />

          <AssignmentSteps
            steps={activeFocus.steps}
            initialProgress={activeFocus.progress}
            onAllStepsComplete={() => handleRefreshAfterAllStepsComplete(activeFocus.assignment.title)}
            onCompleteAssignment={() => void handleMarkAssignmentComplete(activeFocus.assignment.id, activeFocus.assignment.title)}
            isCompletingAssignment={isCompletingAssignment}
          />

          <section className="popup-panel popup-assignment-action" id="assignment-steps">
            <AssignmentCompleteButton
              isPending={isCompletingAssignment}
              onClick={() => void handleMarkAssignmentComplete(activeFocus.assignment.id, activeFocus.assignment.title)}
            />
          </section>

          {formattedUpcomingAssignments.length > 0 ? (
            <UpcomingAssignments assignments={formattedUpcomingAssignments.slice(0, 3)} />
          ) : null}
        </>
      ) : null}

      {showCaughtUpState ? (
        <AllAssignmentsCompleted onOpenDashboard={() => void handleOpenDashboard()} />
      ) : null}

      {feedbackMessage && (viewState === "ready" || viewState === "assignment-completed") ? <p className="popup-feedback-banner">{feedbackMessage}</p> : null}

      {(viewState === "ready" || viewState === "needs-import") ? (
        <div className="popup-footer-actions">
          <button type="button" className="dashboard-button" onClick={() => void handleOpenDashboard()}>
            See full semester plan <ArrowRight size={15} />
          </button>

          <button type="button" className="text-button" onClick={() => void handleLogout()} disabled={isLoggingOut}>
            {isLoggingOut ? "Logging out..." : "Log out of Dueable"}
          </button>
        </div>
      ) : null}

      {feedbackMessage && viewState === "unauthenticated" ? <p className="popup-feedback-banner">{feedbackMessage}</p> : null}
    </main>
  );
}

export default App;
