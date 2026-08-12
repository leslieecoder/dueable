import { NextResponse, type NextRequest } from "next/server";
import {
  getAssignmentBundles,
  mapAssignmentBundleToDetail,
  mapAssignmentBundleToDomainAssignment,
  mapAssignmentBundleToListItem,
} from "@/features/assignments/data";
import { getOptionalEnv } from "@/lib/env";

type PlannerBucket = "overdue" | "closed_overdue" | "this_week" | "work_ahead" | "later";

function readNumberConfig(name: keyof NodeJS.ProcessEnv, fallback: number) {
  const value = getOptionalEnv(name);

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const WORK_AHEAD_HOURS_THRESHOLD = readNumberConfig("DUEABLE_WORK_AHEAD_HOURS_THRESHOLD", 4);
const WORK_AHEAD_POINTS_THRESHOLD = readNumberConfig("DUEABLE_WORK_AHEAD_POINTS_THRESHOLD", 50);
const WORK_AHEAD_STEP_THRESHOLD = readNumberConfig("DUEABLE_WORK_AHEAD_STEP_THRESHOLD", 5);
const WORK_AHEAD_MAX_VISIBLE_STEPS = readNumberConfig("DUEABLE_WORK_AHEAD_VISIBLE_STEPS", 2);

export interface ExtensionOverviewStep {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
  order: number;
}

export interface ExtensionOverviewFocus {
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
}

export interface ExtensionOverviewAssignment {
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

export interface ExtensionOverviewPayload {
  synced: boolean;
  focus: ExtensionOverviewFocus | null;
  upcoming: ExtensionOverviewAssignment[];
  workAhead: ExtensionOverviewAssignment[];
  overdue: ExtensionOverviewAssignment[];
  closedOverdue: ExtensionOverviewAssignment[];
}

export function buildCorsHeaders(request: NextRequest, methods: string) {
  const origin = request.headers.get("origin");

  if (origin?.startsWith("chrome-extension://")) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": methods,
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    } satisfies Record<string, string>;
  }

  return {} as Record<string, string>;
}

export function jsonWithCors(body: unknown, init: ResponseInit, request: NextRequest, methods: string) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...buildCorsHeaders(request, methods),
      ...(init.headers ?? {}),
    },
  });
}

export function formatDifficulty(estimatedHours: number) {
  if (estimatedHours >= 6) {
    return "Hard";
  }

  if (estimatedHours >= 3) {
    return "Medium";
  }

  return "Light";
}

function formatPriorityLabel(position: number) {
  return `#${position} Priority`;
}

function buildCanvasAssignmentUrl(canvasBaseUrl: string, canvasCourseId: string, canvasAssignmentId: string) {
  if (!canvasBaseUrl || !canvasCourseId || !canvasAssignmentId) {
    return null;
  }

  return `${canvasBaseUrl}/courses/${canvasCourseId}/assignments/${canvasAssignmentId}`;
}

function startOfAcademicWeek(reference: Date) {
  const date = new Date(reference);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfAcademicWeek(reference: Date) {
  const date = startOfAcademicWeek(reference);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
}

function resolvePlannerBucket(dueDate: string, now: Date) {
  const dueTime = new Date(dueDate).getTime();

  if (Number.isNaN(dueTime)) {
    return "later" satisfies PlannerBucket;
  }

  const endOfWeek = endOfAcademicWeek(now).getTime();

  if (dueTime < now.getTime()) {
    return "overdue" satisfies PlannerBucket;
  }

  if (dueTime <= endOfWeek) {
    return "this_week" satisfies PlannerBucket;
  }

  return "later" satisfies PlannerBucket;
}

function isFutureAvailability(value: string | null | undefined, now: Date) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time > now.getTime();
}

function isLargeFutureAssignment(
  assignment: ReturnType<typeof mapAssignmentBundleToDomainAssignment>,
  assignmentDetail: ReturnType<typeof mapAssignmentBundleToDetail>,
  now: Date,
) {
  const dueTime = new Date(assignment.dueDate).getTime();

  if (Number.isNaN(dueTime) || dueTime <= now.getTime()) {
    return false;
  }

  const daysUntilDue = (dueTime - now.getTime()) / (1000 * 60 * 60 * 24);
  const content = `${assignment.title} ${assignmentDetail.description}`.toLowerCase();
  const hasProjectKeyword = /(research|paper|essay|presentation|project|final|design|programming|portfolio|capstone)/i.test(content);
  const hasHeavyWorkload = assignment.estimatedHours >= WORK_AHEAD_HOURS_THRESHOLD || (assignmentDetail.latestPlan?.estimatedHours ?? 0) >= WORK_AHEAD_HOURS_THRESHOLD;
  const hasHighPoints = (assignment.pointsPossible ?? 0) >= WORK_AHEAD_POINTS_THRESHOLD;
  const hasManySteps = assignmentDetail.totalTasks >= WORK_AHEAD_STEP_THRESHOLD || (assignmentDetail.latestPlan?.tasks.length ?? 0) >= WORK_AHEAD_STEP_THRESHOLD;
  const hasLongInstructions = assignmentDetail.description.length >= 750;

  return daysUntilDue <= 21 && (hasProjectKeyword || hasHeavyWorkload || hasHighPoints || hasManySteps || hasLongInstructions);
}

function compareAssignments(left: ExtensionOverviewAssignment, right: ExtensionOverviewAssignment) {
  const dueDifference = new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();

  if (dueDifference !== 0) {
    return dueDifference;
  }

  if ((right.pointsPossible ?? 0) !== (left.pointsPossible ?? 0)) {
    return (right.pointsPossible ?? 0) - (left.pointsPossible ?? 0);
  }

  return right.estimatedHours - left.estimatedHours;
}

function applyPriorityLabels(assignments: Array<ExtensionOverviewAssignment & { plannerBucket: PlannerBucket }>) {
  return assignments.map((assignment, index) => ({
    ...assignment,
    priorityLabel: formatPriorityLabel(index + 1),
  }));
}

function buildDisplayedSteps(
  assignmentDetail: ReturnType<typeof mapAssignmentBundleToDetail>,
  plannerBucket: PlannerBucket,
) {
  const checklist = assignmentDetail.checklist.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    estimatedMinutes: task.estimatedMinutes,
    completed: task.completed,
    order: task.order,
  }));

  if (plannerBucket !== "work_ahead") {
    return {
      steps: checklist,
      progress: {
        completedSteps: assignmentDetail.completedTasks,
        totalSteps: assignmentDetail.totalTasks,
      },
    };
  }

  const suggestedSteps = checklist.slice(0, WORK_AHEAD_MAX_VISIBLE_STEPS);

  return {
    steps: suggestedSteps,
    progress: {
      completedSteps: suggestedSteps.filter((task) => task.completed).length,
      totalSteps: suggestedSteps.length,
    },
  };
}

export async function getExtensionOverview(): Promise<ExtensionOverviewPayload> {
  const bundles = await getAssignmentBundles();
  const assignments = bundles.map(mapAssignmentBundleToDomainAssignment);
  const assignmentList = bundles.map(mapAssignmentBundleToListItem);
  const activeAssignments = assignments.filter((assignment) => assignment.status !== "completed");
  const detailMap = new Map(bundles.map((bundle) => [bundle.assignment.id, mapAssignmentBundleToDetail(bundle)]));

  const now = new Date();

  const builtAssignments = activeAssignments
    .map((assignment) => {
      const assignmentDetail = detailMap.get(assignment.id);

      if (!assignmentDetail) {
        return null;
      }

      const dueBucket = resolvePlannerBucket(assignment.dueDate, now);
      let plannerBucket: PlannerBucket;

      if (dueBucket === "overdue") {
        plannerBucket = isFutureAvailability(assignment.availableUntil, now) ? "overdue" : "closed_overdue";
      } else if (dueBucket === "later" && isLargeFutureAssignment(assignment, assignmentDetail, now)) {
        plannerBucket = "work_ahead";
      } else {
        plannerBucket = dueBucket;
      }

      const displayedTasks = buildDisplayedSteps(assignmentDetail, plannerBucket);
      const displayDate = plannerBucket === "overdue" ? assignment.availableUntil ?? assignment.dueDate : assignment.dueDate;
      const dateLabel = plannerBucket === "overdue" ? "Available until" : plannerBucket === "closed_overdue" ? "Closed" : "Due";
      const assignmentUrl = buildCanvasAssignmentUrl(
        assignmentDetail.canvasBaseUrl,
        assignmentDetail.canvasCourseId,
        assignment.canvasAssignmentId,
      );

      return {
        id: assignment.id,
        title: assignment.title,
        courseTitle: assignmentDetail.courseTitle,
        courseColor: assignmentDetail.courseColor,
        dueDate: displayDate,
        dateLabel,
        assignmentUrl,
        estimatedHours: assignment.estimatedHours,
        pointsPossible: assignment.pointsPossible ?? null,
        difficulty: formatDifficulty(assignment.estimatedHours),
        priorityLabel: "",
        planProvider: assignmentDetail.latestPlan?.providerUsed ?? null,
        badgeLabel: plannerBucket === "work_ahead" ? "Work Ahead" : null,
        steps: displayedTasks.steps,
        progress: displayedTasks.progress,
        plannerBucket,
      } satisfies ExtensionOverviewAssignment & { plannerBucket: PlannerBucket };
    })
    .filter((assignment): assignment is ExtensionOverviewAssignment & { plannerBucket: PlannerBucket } => assignment !== null);

  const weeklyAssignments = applyPriorityLabels(
    builtAssignments
    .filter((assignment) => assignment.plannerBucket === "this_week")
    .sort(compareAssignments),
  );
  const workAheadAssignments = applyPriorityLabels(
    builtAssignments
    .filter((assignment) => assignment.plannerBucket === "work_ahead")
    .sort(compareAssignments),
  );
  const overdueAssignments = applyPriorityLabels(
    builtAssignments
    .filter((assignment) => assignment.plannerBucket === "overdue")
    .sort(compareAssignments),
  );
  const closedOverdueAssignments = builtAssignments
    .filter((assignment) => assignment.plannerBucket === "closed_overdue")
    .sort(compareAssignments);
  const laterAssignments = builtAssignments
    .filter((assignment) => assignment.plannerBucket === "later")
    .sort(compareAssignments);

  const fallbackWorkAheadAssignments =
    weeklyAssignments.length === 0 &&
    workAheadAssignments.length === 0 &&
    overdueAssignments.length === 0 &&
    closedOverdueAssignments.length === 0
      ? applyPriorityLabels(laterAssignments)
      : workAheadAssignments;

  const [topAssignment, ...upcoming] = weeklyAssignments;

  return {
    synced: assignmentList.length > 0,
    focus:
      topAssignment !== undefined
        ? {
            assignment: {
              id: topAssignment.id,
              title: topAssignment.title,
              course: topAssignment.courseTitle,
              courseColor: topAssignment.courseColor,
              dueDate: topAssignment.dueDate,
              dateLabel: topAssignment.dateLabel,
              assignmentUrl: topAssignment.assignmentUrl,
              points: topAssignment.pointsPossible,
            },
            steps: topAssignment.steps,
            progress: topAssignment.progress,
            estimatedHours: topAssignment.estimatedHours,
            difficulty: topAssignment.difficulty,
            priorityLabel: topAssignment.priorityLabel,
            planProvider: topAssignment.planProvider,
            badgeLabel: topAssignment.badgeLabel,
          }
        : null,
    upcoming,
    workAhead: fallbackWorkAheadAssignments,
    overdue: overdueAssignments,
    closedOverdue: closedOverdueAssignments,
  };
}