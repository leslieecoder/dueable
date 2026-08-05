import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleDashed } from "lucide-react";
import { AllAssignmentsCompleted } from "./components/AllAssignmentsCompleted";
import { AssignmentCompleted } from "./components/AssignmentCompleted";
import { getCanvasBaseUrl, getCanvasCourses, isLikelyCanvasUrl, type CanvasCourse } from "./lib/canvas/api";
import { filterCurrentSemesterCourses } from "./lib/canvas/course-filter";
import { getDueableUrl } from "./lib/dueable-app";
import { importSemester, type CanvasSemesterImportProgress } from "./lib/canvas/semester-importer";
import { ExtensionMessage } from "./lib/messages";
import { AssignmentSteps } from "./components/AssignmentSteps";
import { CanvasOnboarding } from "./components/CanvasOnboarding";
import { UpcomingAssignments } from "./components/UpcomingAssignments";
import type { ExtensionOverviewResponse } from "./components/extension-types";
import "./App.css";

interface CanvasTabDetectionResult {
  isCanvas: boolean;
}

interface ImportSemesterResponse {
  success?: boolean;
  coursesImported?: number;
  assignmentsImported?: number;
  assignmentIds?: string[];
  error?: string;
}

interface GenerateMissingPlansResponse {
  success?: boolean;
  generatedCount?: number;
  replacedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  fallbackCount?: number;
  primaryProvider?: string | null;
  primaryError?: string | null;
  error?: string;
}

function getPlanGenerationFeedback(payload: GenerateMissingPlansResponse) {
  const generatedCount = payload.generatedCount ?? 0;
  const replacedCount = payload.replacedCount ?? 0;
  const skippedCount = payload.skippedCount ?? 0;
  const failedCount = payload.failedCount ?? 0;
  const fallbackCount = payload.fallbackCount ?? 0;
  const primaryProvider = payload.primaryProvider ?? "Gemini";
  const primaryError = payload.primaryError ?? null;

  if (fallbackCount > 0) {
    const providerLabel = primaryProvider.replace(/^gemini:/, "Gemini ");

    if (primaryError?.toLowerCase().includes("permission_denied") || primaryError?.toLowerCase().includes("unregistered callers")) {
      return `Dueable generated steps with the fallback planner because ${providerLabel} rejected the configured API key.`;
    }

    return `Dueable generated steps with the fallback planner because ${providerLabel} failed.`;
  }

  if (replacedCount > 0 && failedCount === 0) {
    return `Replaced ${replacedCount} assignment plan${replacedCount === 1 ? "" : "s"} with Gemini-generated steps.`;
  }

  if (replacedCount > 0 && failedCount > 0) {
    return `Replaced ${replacedCount} assignment plan${replacedCount === 1 ? "" : "s"}, but ${failedCount} assignment${failedCount === 1 ? "" : "s"} still need Gemini steps.`;
  }

  if (generatedCount > 0 && failedCount === 0) {
    return `Generated ${generatedCount} assignment plan${generatedCount === 1 ? "" : "s"}.`;
  }

  if (generatedCount > 0 && failedCount > 0) {
    return `Generated ${generatedCount} plan${generatedCount === 1 ? "" : "s"}, but ${failedCount} assignment${failedCount === 1 ? "" : "s"} still need steps.`;
  }

  if (failedCount > 0) {
    return `Your assignments imported, but ${failedCount} assignment${failedCount === 1 ? "" : "s"} could not get steps yet.`;
  }

  if (skippedCount > 0) {
    return "Your assignment steps were already available.";
  }

  return null;
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

type ImportStage = "idle" | "syncing" | "done";
type PlannerQueueView = "work_ahead" | "overdue" | null;
type PlannerQueueTab = "this_week" | "work_ahead" | "overdue";

interface CompletionState {
  assignmentTitle: string;
  nextTitle: string | null;
}

interface ClosedOverdueAssignmentSummary {
  id: string;
  title: string;
  courseTitle: string;
  dateLabel: string;
  formattedDueText: string;
}

interface ErrorDisplayState {
  title: string;
  message: string;
}

interface ImportProgressState {
  percent: number;
  label: string;
  detail: string;
}

function getWeeklyAssignmentIds(payload: ExtensionOverviewResponse) {
  if (!payload.focus) {
    return [] as string[];
  }

  return [payload.focus.assignment.id, ...payload.upcoming.map((assignment) => assignment.id)];
}

function getQueueAssignmentIds(payload: ExtensionOverviewResponse, queue: PlannerQueueView) {
  if (queue === "work_ahead") {
    return payload.workAhead.map((assignment) => assignment.id);
  }

  if (queue === "overdue") {
    return payload.overdue.map((assignment) => assignment.id);
  }

  return getWeeklyAssignmentIds(payload);
}

const FIRST_LOGIN_REDIRECT_KEY = "dueableHasOpenedLoginFromPanel";
const ASSIGNMENT_COMPLETED_AUTO_ADVANCE_MS = 1400;

function buildImportProgressState(progress: CanvasSemesterImportProgress | { stage: "generating_steps"; importedAssignments: number }): ImportProgressState {
  switch (progress.stage) {
    case "loading_courses":
      return {
        percent: 8,
        label: "Loading your Canvas courses",
        detail: "Checking which courses are active before the import starts.",
      };
    case "importing_courses": {
      const totalCourses = Math.max(progress.totalCourses, 1);
      const courseRatio = progress.completedCourses / totalCourses;

      return {
        percent: 12 + courseRatio * 48,
        label: `Imported ${progress.completedCourses} of ${progress.totalCourses} courses`,
        detail:
          progress.currentCourseName !== null
            ? `Pulling assignments from ${progress.currentCourseName}.`
            : `Imported ${progress.importedAssignments} assignments from Canvas so far.`,
      };
    }
    case "saving_assignments":
      return {
        percent: 76,
        label: "Saving assignments to Dueable",
        detail: `Imported ${progress.importedAssignments} assignments. Saving them now.`,
      };
    case "generating_steps":
      return {
        percent: 92,
        label: "Generating your study steps",
        detail: "Turning imported assignments into actionable steps.",
      };
    case "done":
      return {
        percent: 100,
        label: "Import complete",
        detail: "Everything is ready.",
      };
  }
}

async function getStoredFlag(key: string) {
  const stored = await chrome.storage.local.get(key);
  return stored[key] === true;
}

async function setStoredFlag(key: string, value: boolean) {
  await chrome.storage.local.set({ [key]: value });
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

function getDefaultCanvasPrompt(): ErrorDisplayState {
  return {
    title: "Open Canvas to get started",
    message: "Go to your Canvas dashboard or course page, then reopen Dueable.",
  };
}

function getLoadErrorDisplay(detail?: string): ErrorDisplayState {
  if (!detail) {
    return {
      title: "We found Canvas, but couldn't load Dueable",
      message: "Try refreshing the Canvas page, then reopen the panel.",
    };
  }

  return {
    title: "We found Canvas, but couldn't load Dueable",
    message: detail,
  };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (tab?.id && tab.url) {
    return {
      id: tab.id,
      url: tab.url,
    };
  }

  const fallbackTabs = await chrome.tabs.query({ active: true });
  const fallbackTab = fallbackTabs.find((candidate) => candidate.id && candidate.url);

  if (!fallbackTab?.id || !fallbackTab.url) {
    throw new Error("No active browser tab is available.");
  }

  return {
    id: fallbackTab.id,
    url: fallbackTab.url,
  };
}

function isCanvasUrl(url: string) {
  return isLikelyCanvasUrl(url);
}

async function detectCanvasTab(tabId: number, url: string) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: ExtensionMessage.PingCanvas }) as CanvasTabDetectionResult | undefined;

    if (response?.isCanvas === true) {
      return true;
    }
  } catch {
    // Fall back to direct page inspection when the content script is unavailable.
  }

  if (isCanvasUrl(url)) {
    return true;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const locationHref = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();
        const bodyText = document.body?.textContent?.slice(0, 2000).toLowerCase() ?? "";

        const hasCanvasShell = Boolean(
          document.querySelector("#application") ||
            document.querySelector("#dashboard") ||
            document.querySelector(".ic-app") ||
            document.querySelector(".instructure_shell") ||
            document.querySelector("a[href*='/courses/']") ||
            document.querySelector("a[href*='/calendar']")
        );

        const hasCanvasGlobals = typeof (window as Window & { ENV?: unknown }).ENV !== "undefined";
        const mentionsCanvas = locationHref.includes("canvas") || title.includes("canvas") || bodyText.includes("canvas");

        return {
          isCanvas: hasCanvasShell || hasCanvasGlobals || mentionsCanvas,
        } satisfies CanvasTabDetectionResult;
      },
    });

    return results[0]?.result?.isCanvas === true;
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

function isGeminiProvider(provider: string | null | undefined) {
  return typeof provider === "string" && provider.toLowerCase().startsWith("gemini");
}

function App() {
  const popupShellRef = useRef<HTMLElement | null>(null);
  const [viewState, setViewState] = useState<PopupViewState>("loading");
  const [overview, setOverview] = useState<ExtensionOverviewResponse | null>(null);
  const [currentCanvasCourses, setCurrentCanvasCourses] = useState<CanvasCourse[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isCompletingAssignment, setIsCompletingAssignment] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [completionState, setCompletionState] = useState<CompletionState | null>(null);
  const [importStage, setImportStage] = useState<ImportStage>("idle");
  const [importSummary, setImportSummary] = useState<{ coursesImported: number; assignmentsImported: number } | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);
  const [errorDisplay, setErrorDisplay] = useState<ErrorDisplayState>(getDefaultCanvasPrompt);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [showClosedOverdueAssignments, setShowClosedOverdueAssignments] = useState(false);
  const [revealedQueue, setRevealedQueue] = useState<PlannerQueueView>(null);
  const attemptedPlanRecoveryIdsRef = useRef<Set<string>>(new Set());
  const attemptedGeminiUpgradeIdsRef = useRef<Set<string>>(new Set());

  const handleOpenLogin = useCallback(async (options?: { markFirstVisit?: boolean }) => {
    if (options?.markFirstVisit) {
      await setStoredFlag(FIRST_LOGIN_REDIRECT_KEY, true);
    }

    await chrome.tabs.create({ url: getDueableUrl("/login?next=%2Fdashboard") });
  }, []);

  async function handleOpenSignup() {
    await chrome.tabs.create({ url: getDueableUrl("/signup") });
  }

  const loadExtensionState = useCallback(async (options?: { silently?: boolean }) => {
    const silently = options?.silently === true;

    try {
      if (!silently) {
        setViewState("loading");
        setFeedbackMessage(null);
        setCompletionState(null);
        setImportStage("idle");
        setImportSummary(null);
        setImportProgress(null);
        setErrorDisplay(getDefaultCanvasPrompt());
        setRevealedQueue(null);
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
        setSelectedAssignmentId(null);
        setRevealedQueue(null);
        setViewState("unauthenticated");

        const hasOpenedLoginBefore = await getStoredFlag(FIRST_LOGIN_REDIRECT_KEY);

        if (!hasOpenedLoginBefore) {
          await handleOpenLogin({ markFirstVisit: true });
          setFeedbackMessage("Finish logging in on the Dueable website, then return to this side panel.");
        }

        return;
      }

      if (!overviewResponse.ok) {
        throw new Error(getFriendlyExtensionMessage("overview", payload.error));
      }

      setOverview(payload);
      setShowClosedOverdueAssignments(false);

      if (!silently) {
        setSelectedAssignmentId(null);

        if (payload.focus) {
          setRevealedQueue(null);
        }
      } else {
        setRevealedQueue((currentQueue) => {
          if (currentQueue === "work_ahead" && payload.workAhead.length === 0) {
            return payload.focus ? null : currentQueue;
          }

          if (currentQueue === "overdue" && payload.overdue.length === 0) {
            return payload.focus ? null : currentQueue;
          }

          return currentQueue;
        });

        setSelectedAssignmentId((currentAssignmentId) => {
          if (!currentAssignmentId) {
            return null;
          }

          const activeQueueAssignmentIds = new Set(getQueueAssignmentIds(payload, revealedQueue));

          return activeQueueAssignmentIds.has(currentAssignmentId) ? currentAssignmentId : null;
        });
      }

      if (payload.synced) {
        const focusAssignmentId = payload.focus?.assignment.id ?? null;
        const focusHasNoSteps = payload.focus !== null && payload.focus.progress.totalSteps === 0;
        const primaryAssignments = payload.focus ? [payload.focus, ...payload.upcoming] : payload.workAhead;
        const visibleAssignments = primaryAssignments.filter((assignment): assignment is NonNullable<typeof assignment> => assignment !== null);
        const visibleAssignmentIds = primaryAssignments.map((assignment) => ("assignment" in assignment ? assignment.assignment.id : assignment.id)).filter(
          (assignmentId): assignmentId is string => typeof assignmentId === "string" && assignmentId.length > 0,
        );
        const geminiUpgradeCandidateIds = visibleAssignments
          .filter((assignment) => assignment.progress.completedSteps === 0)
          .filter((assignment) => !isGeminiProvider(assignment.planProvider))
          .map((assignment) => ("assignment" in assignment ? assignment.assignment.id : assignment.id))
          .filter((assignmentId) => !attemptedGeminiUpgradeIdsRef.current.has(assignmentId));

        if (focusAssignmentId && !focusHasNoSteps) {
          attemptedPlanRecoveryIdsRef.current.delete(focusAssignmentId);
        }

        for (const assignment of visibleAssignments) {
          const assignmentId = "assignment" in assignment ? assignment.assignment.id : assignment.id;

          if (isGeminiProvider(assignment.planProvider) || assignment.progress.completedSteps > 0) {
            attemptedGeminiUpgradeIdsRef.current.delete(assignmentId);
          }
        }

        if (focusAssignmentId && focusHasNoSteps && !attemptedPlanRecoveryIdsRef.current.has(focusAssignmentId)) {
          attemptedPlanRecoveryIdsRef.current.add(focusAssignmentId);

          const planResponse = await fetch(getDueableUrl("/api/extension/generate-missing-plans"), {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ assignmentIds: visibleAssignmentIds }),
          });

          const planPayload = (await planResponse.json()) as GenerateMissingPlansResponse;

          if (planResponse.ok && planPayload.success && (planPayload.generatedCount ?? 0) > 0) {
            const refreshedOverviewResponse = await fetch(getDueableUrl("/api/extension/overview"), {
              method: "GET",
              credentials: "include",
              headers: {
                Accept: "application/json",
              },
            });

            const refreshedPayload = (await refreshedOverviewResponse.json()) as ExtensionOverviewResponse;

            if (refreshedOverviewResponse.ok) {
              setOverview(refreshedPayload);
              setFeedbackMessage(`Generated ${(planPayload.generatedCount ?? 0)} assignment plan${(planPayload.generatedCount ?? 0) === 1 ? "" : "s"}.`);
            } else {
              setFeedbackMessage(getFriendlyExtensionMessage("overview", refreshedPayload.error));
            }
          } else if ((planPayload.failedCount ?? 0) > 0) {
            setFeedbackMessage(`Dueable found this assignment, but its study steps could not be generated yet.`);
          }
        }

        if (geminiUpgradeCandidateIds.length > 0) {
          for (const assignmentId of geminiUpgradeCandidateIds) {
            attemptedGeminiUpgradeIdsRef.current.add(assignmentId);
          }

          const planResponse = await fetch(getDueableUrl("/api/extension/generate-missing-plans"), {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ assignmentIds: geminiUpgradeCandidateIds, replaceExisting: true }),
          });

          const planPayload = (await planResponse.json()) as GenerateMissingPlansResponse;

          if (planResponse.ok && planPayload.success && ((planPayload.replacedCount ?? 0) > 0 || (planPayload.generatedCount ?? 0) > 0)) {
            const refreshedOverviewResponse = await fetch(getDueableUrl("/api/extension/overview"), {
              method: "GET",
              credentials: "include",
              headers: {
                Accept: "application/json",
              },
            });

            const refreshedPayload = (await refreshedOverviewResponse.json()) as ExtensionOverviewResponse;

            if (refreshedOverviewResponse.ok) {
              setOverview(refreshedPayload);
              setFeedbackMessage(getPlanGenerationFeedback(planPayload));
            } else {
              setFeedbackMessage(getFriendlyExtensionMessage("overview", refreshedPayload.error));
            }
          } else if ((planPayload.failedCount ?? 0) > 0 || (planPayload.fallbackCount ?? 0) > 0) {
            setFeedbackMessage(getPlanGenerationFeedback(planPayload));
          }
        }

        setCurrentCanvasCourses([]);
        setViewState("ready");
        return;
      }

      const activeTab = await getActiveTab();
      const isCanvasTab = await detectCanvasTab(activeTab.id, activeTab.url);

      if (!isCanvasTab) {
        setOverview(null);
        setCurrentCanvasCourses([]);
        setErrorDisplay(getDefaultCanvasPrompt());
        setViewState("error");
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
      setSelectedAssignmentId(null);
      setRevealedQueue(null);
      setErrorDisplay(
        getLoadErrorDisplay(
          error instanceof Error ? error.message : "Try refreshing the Canvas page, then reopen the panel.",
        ),
      );
      setViewState("error");
    }
  }, [handleOpenLogin, revealedQueue]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadExtensionState();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadExtensionState]);

  useEffect(() => {
    function handleWindowFocus() {
      void loadExtensionState({ silently: true });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadExtensionState({ silently: true });
      }
    }

    function handleTabActivated() {
      void loadExtensionState({ silently: true });
    }

    function handleTabUpdated(_tabId: number, changeInfo: { status?: string }, tab: chrome.tabs.Tab) {
      if (changeInfo.status === "complete" && tab.active) {
        void loadExtensionState({ silently: true });
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [loadExtensionState]);

  async function handleOpenDashboard() {
    await chrome.tabs.create({ url: getDueableUrl("/dashboard") });
  }

  async function handleOpenCanvasAssignment(assignmentUrl: string | null) {
    if (!assignmentUrl) {
      return;
    }

    await chrome.tabs.create({ url: assignmentUrl });
  }

  function scrollToTopOfPanel() {
    popupShellRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleImportAssignments() {
    const activeTab = await getActiveTab();
    const isCanvasTab = await detectCanvasTab(activeTab.id, activeTab.url);

    if (!isCanvasTab) {
      setFeedbackMessage("Open your Canvas course in the current tab, then try again.");
      return;
    }

    const selectedCourseIds = currentCanvasCourses.map((course) => course.id);

    if (selectedCourseIds.length === 0) {
      setFeedbackMessage("Your Canvas classes are not synced yet.");
      return;
    }

    setIsImporting(true);
    setImportStage("syncing");
    setImportSummary(null);
    setImportProgress(
      buildImportProgressState({
        stage: "loading_courses",
        totalCourses: selectedCourseIds.length,
        completedCourses: 0,
        importedAssignments: 0,
        currentCourseName: null,
      }),
    );
    setFeedbackMessage(null);

    try {
      const result = await importSemester(activeTab.id, activeTab.url, selectedCourseIds, (progress) => {
        setImportProgress(buildImportProgressState(progress));
      });
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

      setImportProgress(
        buildImportProgressState({
          stage: "generating_steps",
          importedAssignments: payload.assignmentsImported ?? result.assignmentsImported,
        }),
      );

      const planResponse = await fetch(getDueableUrl("/api/extension/generate-missing-plans"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          Array.isArray(payload.assignmentIds) && payload.assignmentIds.length > 0
            ? { assignmentIds: payload.assignmentIds }
            : { limit: 25 },
        ),
      });

      const planPayload = (await planResponse.json()) as GenerateMissingPlansResponse;

      if (!planResponse.ok || !planPayload.success) {
        throw new Error(planPayload.error ?? "Your assignments imported, but we couldn't generate steps yet.");
      }

      setImportProgress({
        percent: 100,
        label: "Import complete",
        detail: "Everything is ready.",
      });
      setImportStage("done");
      setImportSummary({
        coursesImported: payload.coursesImported ?? result.coursesImported,
        assignmentsImported: payload.assignmentsImported ?? result.assignmentsImported,
      });
      setFeedbackMessage(getPlanGenerationFeedback(planPayload));
    } catch (error) {
      setImportStage("idle");
      setImportProgress(null);
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
      setSelectedAssignmentId(null);
      setFeedbackMessage("Assignment completed. Dueable moved to the next priority.");

      if (payload.overview.focus) {
        setCompletionState({ assignmentTitle, nextTitle: payload.overview.focus.assignment.title });
        setViewState("assignment-completed");
        scrollToTopOfPanel();
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
      setSelectedAssignmentId(null);
      setRevealedQueue(null);
      setViewState("unauthenticated");
      setFeedbackMessage("You have been logged out of Dueable.");
      setCompletionState(null);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "We couldn't log you out right now. Try again in a moment.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleContinueAfterCompletion() {
    setCompletionState(null);
    setViewState("ready");
  }

  useEffect(() => {
    if (viewState !== "assignment-completed" || completionState === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleContinueAfterCompletion();
    }, ASSIGNMENT_COMPLETED_AUTO_ADVANCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completionState, viewState]);

  async function handleContinueAfterImport() {
    await loadExtensionState();
  }

  function handleRevealWorkAhead() {
    if ((overview?.workAhead.length ?? 0) === 0) {
      void handleOpenDashboard();
      return;
    }

    setRevealedQueue("work_ahead");
    setSelectedAssignmentId(null);
    setShowClosedOverdueAssignments(false);
  }

  function handleRevealOverdue() {
    if ((overview?.overdue.length ?? 0) === 0) {
      void handleOpenDashboard();
      return;
    }

    setRevealedQueue("overdue");
    setSelectedAssignmentId(null);
    setShowClosedOverdueAssignments(false);
  }

  function handleSelectQueue(queue: PlannerQueueTab) {
    setSelectedAssignmentId(null);
    setShowClosedOverdueAssignments(false);

    if (queue === "this_week") {
      setRevealedQueue(null);
      return;
    }

    setRevealedQueue(queue);
  }

  const weeklyAssignments = useMemo(() => {
    if (!overview?.focus) {
      return [];
    }

    return [
      {
        id: overview.focus.assignment.id,
        title: overview.focus.assignment.title,
        courseTitle: overview.focus.assignment.course,
        courseColor: overview.focus.assignment.courseColor,
        dueDate: overview.focus.assignment.dueDate,
        dateLabel: overview.focus.assignment.dateLabel,
        assignmentUrl: overview.focus.assignment.assignmentUrl,
        estimatedHours: overview.focus.estimatedHours,
        pointsPossible: overview.focus.assignment.points,
        difficulty: overview.focus.difficulty,
        priorityLabel: overview.focus.priorityLabel,
        planProvider: overview.focus.planProvider,
        badgeLabel: overview.focus.badgeLabel,
        steps: overview.focus.steps,
        progress: overview.focus.progress,
      },
      ...overview.upcoming,
    ];
  }, [overview]);

  const visibleAssignments = useMemo(() => {
    if (revealedQueue === "work_ahead") {
      return overview?.workAhead ?? [];
    }

    if (revealedQueue === "overdue") {
      return overview?.overdue ?? [];
    }

    if (weeklyAssignments.length > 0) {
      return weeklyAssignments;
    }

    return [];
  }, [overview?.overdue, overview?.workAhead, revealedQueue, weeklyAssignments]);

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
  const hasWeeklyAssignments = weeklyAssignments.length > 0;
  const focusMetadata = useMemo(() => {
    if (!displayedAssignment) {
      return [] as string[];
    }

    return [
      formatPoints(displayedAssignment.pointsPossible),
      `${displayedAssignment.dateLabel} ${formatDueDate(displayedAssignment.dueDate)}`,
      displayedAssignment.difficulty,
      formatEstimatedHours(displayedAssignment.estimatedHours),
    ].filter((value): value is string => Boolean(value));
  }, [displayedAssignment]);

  const formattedUpcomingAssignments = useMemo(
    () =>
      upcomingAssignments.map((assignment) => ({
        ...assignment,
        formattedDueText: `${assignment.dateLabel} ${formatDueDate(assignment.dueDate)}`,
        formattedPoints: formatPoints(assignment.pointsPossible),
      })),
    [upcomingAssignments],
  );
  const closedOverdueAssignments = useMemo<ClosedOverdueAssignmentSummary[]>(
    () =>
      (overview?.closedOverdue ?? []).map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        courseTitle: assignment.courseTitle,
        dateLabel: assignment.dateLabel,
        formattedDueText: `${assignment.dateLabel} ${formatDueDate(assignment.dueDate)}`,
      })),
    [overview?.closedOverdue],
  );

  const showCaughtUpState = viewState === "ready" && !hasWeeklyAssignments && revealedQueue === null;
  const availableQueueCounts = useMemo(
    () => ({
      thisWeek: weeklyAssignments.length,
      overdue: overview?.overdue.length ?? 0,
      workAhead: overview?.workAhead.length ?? 0,
    }),
    [overview?.overdue.length, overview?.workAhead.length, weeklyAssignments.length],
  );
  const activeQueueTab: PlannerQueueTab = revealedQueue ?? "this_week";
  const showQueueTabs =
    viewState === "ready" &&
    (availableQueueCounts.thisWeek > 0 || availableQueueCounts.overdue > 0 || availableQueueCounts.workAhead > 0);
  const upcomingSectionTitle =
    activeQueueTab === "overdue" ? "Overdue" : activeQueueTab === "work_ahead" ? "Work Ahead" : "Current Week";
  const hasClosedOverdueAssignments = closedOverdueAssignments.length > 0;
  const showClosedOverdueToggle = viewState === "ready" && activeQueueTab === "overdue" && hasClosedOverdueAssignments;
  const showOverdueEmptyState = viewState === "ready" && activeQueueTab === "overdue" && !displayedAssignment;

  return (
    <main ref={popupShellRef} className="popup-shell">
      <section className="popup-header-card">
        <div className="popup-brand-row">
          <div className="popup-brand-lockup">
            <img src="./assets/complete-logo.png" alt="Dueable" className="popup-brand-logo" />
            <h1>What should I work on right now?</h1>
          </div>
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
          <div className="empty-card auth-card auth-card-centered">
            <div className="auth-mark">✓</div>
            <p className="panel-title">Connect dueable</p>
            <p className="panel-copy">See what assignment matters most without leaving Canvas.</p>
            <button type="button" className="primary-button" onClick={() => void handleOpenLogin()}>
              Login to Dueable
            </button>
            <button type="button" className="ghost-button" onClick={() => void handleOpenSignup()}>
              Create Account
            </button>
          </div>
        </section>
      ) : null}

      {viewState === "needs-import" ? (
        <CanvasOnboarding
          courseCount={currentCanvasCourses.length}
          importStage={importStage}
          importSummary={importSummary}
          importProgress={importProgress}
          isImporting={isImporting}
          feedbackMessage={feedbackMessage}
          onImport={() => void handleImportAssignments()}
          onContinue={() => void handleContinueAfterImport()}
        />
      ) : null}

      {viewState === "error" ? (
        <section className="popup-panel">
          <div className="empty-card canvas-empty-card">
            <div className="canvas-icon-mark" aria-hidden="true">
              <CircleDashed size={28} strokeWidth={2.2} />
            </div>
            <p className="panel-title">{errorDisplay.title}</p>
            <p className="panel-copy">{errorDisplay.message}</p>
          </div>
        </section>
      ) : null}

      {viewState === "assignment-completed" && completionState ? (
        <AssignmentCompleted
          assignmentTitle={completionState.assignmentTitle}
          nextTitle={completionState.nextTitle}
          autoAdvanceSeconds={Math.ceil(ASSIGNMENT_COMPLETED_AUTO_ADVANCE_MS / 1000)}
        />
      ) : null}

      {showQueueTabs ? (
        <section className="popup-panel popup-panel-compact">
          <div className="queue-tabs" role="tablist" aria-label="Assignment queues">
            <button
              type="button"
              role="tab"
              aria-selected={activeQueueTab === "this_week"}
              className={`queue-tab-button${activeQueueTab === "this_week" ? " queue-tab-button-active" : ""}`}
              onClick={() => handleSelectQueue("this_week")}
            >
              <span>This Week</span>
              <span className="queue-tab-count">{availableQueueCounts.thisWeek}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeQueueTab === "overdue"}
              className={`queue-tab-button${activeQueueTab === "overdue" ? " queue-tab-button-active" : ""}`}
              onClick={() => handleSelectQueue("overdue")}
              disabled={availableQueueCounts.overdue === 0}
            >
              <span>Overdue</span>
              <span className="queue-tab-count">{availableQueueCounts.overdue}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeQueueTab === "work_ahead"}
              className={`queue-tab-button${activeQueueTab === "work_ahead" ? " queue-tab-button-active" : ""}`}
              onClick={() => handleSelectQueue("work_ahead")}
              disabled={availableQueueCounts.workAhead === 0}
            >
              <span>Work Ahead</span>
              <span className="queue-tab-count">{availableQueueCounts.workAhead}</span>
            </button>
          </div>
        </section>
      ) : null}

      {viewState === "ready" && displayedAssignment ? (
        <>
          <AssignmentSteps
            focus={{
              assignment: {
                id: displayedAssignment.id,
                title: displayedAssignment.title,
                course: displayedAssignment.courseTitle,
                courseColor: displayedAssignment.courseColor,
                dueDate: displayedAssignment.dueDate,
                dateLabel: displayedAssignment.dateLabel,
                assignmentUrl: displayedAssignment.assignmentUrl,
                points: displayedAssignment.pointsPossible,
              },
              steps: displayedAssignment.steps,
              progress: displayedAssignment.progress,
              estimatedHours: displayedAssignment.estimatedHours,
              difficulty: displayedAssignment.difficulty,
              priorityLabel: displayedAssignment.priorityLabel,
              planProvider: displayedAssignment.planProvider,
              badgeLabel: displayedAssignment.badgeLabel,
            }}
            metadata={focusMetadata}
            steps={displayedAssignment.steps}
            initialProgress={displayedAssignment.progress}
            onOpenAssignment={() => void handleOpenCanvasAssignment(displayedAssignment.assignmentUrl)}
            onCompleteAssignment={() => void handleMarkAssignmentComplete(displayedAssignment.id, displayedAssignment.title)}
            isCompletingAssignment={isCompletingAssignment}
          />

          <div className="panel-header-row">
            <p className="section-label">{upcomingSectionTitle}</p>
          </div>

          {formattedUpcomingAssignments.length > 0 ? (
            <UpcomingAssignments
              assignments={formattedUpcomingAssignments}
              selectedAssignmentId={displayedAssignment.id}
              onSelect={(assignmentId) => {
                setSelectedAssignmentId(assignmentId);
                scrollToTopOfPanel();
              }}
              onOpenAssignment={(assignmentUrl) => {
                void handleOpenCanvasAssignment(assignmentUrl);
              }}
            />
          ) : null}
        </>
      ) : null}

      {showOverdueEmptyState ? (
        <section className="popup-panel">
          <div className="empty-card canvas-empty-card">
            <p className="panel-title">No overdue assignments are still available</p>
            <p className="panel-copy">Anything past due without an active Canvas availability window is hidden from this queue.</p>
          </div>
        </section>
      ) : null}

      {showClosedOverdueToggle ? (
        <section className="popup-panel">
          <div className="closed-overdue-card">
            <button
              type="button"
              className="dashboard-button closed-overdue-toggle"
              onClick={() => {
                setShowClosedOverdueAssignments((currentValue) => !currentValue);
              }}
            >
              {showClosedOverdueAssignments
                ? `Hide ${closedOverdueAssignments.length} overdue assignment${closedOverdueAssignments.length === 1 ? "" : "s"} that are no longer available`
                : `View ${closedOverdueAssignments.length} overdue assignment${closedOverdueAssignments.length === 1 ? "" : "s"} that are no longer available`}
            </button>

            {showClosedOverdueAssignments ? (
              <div className="closed-overdue-list">
                {closedOverdueAssignments.map((assignment) => (
                  <div key={assignment.id} className="upcoming-card closed-overdue-item">
                    <h3>{assignment.title}</h3>
                    <p>{assignment.courseTitle}</p>
                    <div className="upcoming-meta-row">
                      <span>{assignment.formattedDueText}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {showCaughtUpState ? (
        <AllAssignmentsCompleted onSeeWorkAhead={handleRevealWorkAhead} onReviewOverdue={handleRevealOverdue} />
      ) : null}

      {feedbackMessage && (viewState === "ready" || viewState === "assignment-completed") ? <p className="popup-feedback-banner">{feedbackMessage}</p> : null}

      {viewState === "ready" && !showCaughtUpState ? (
        <div className="popup-footer-actions">
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
