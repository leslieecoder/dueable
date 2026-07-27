import { NextResponse, type NextRequest } from "next/server";
import { getAssignmentDetail, getAssignmentList } from "@/features/assignments/data";
import { getStudentFocus } from "@/services/focus/StudentFocusService";
import { getPrioritizedAssignments } from "@/services/priority/PrioritizedAssignmentsService";

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
    dueDate: string;
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
}

export interface ExtensionOverviewAssignment {
  id: string;
  title: string;
  courseTitle: string;
  dueDate: string;
  estimatedHours: number;
  pointsPossible: number | null;
  difficulty: string;
}

export interface ExtensionOverviewPayload {
  synced: boolean;
  focus: ExtensionOverviewFocus | null;
  upcoming: ExtensionOverviewAssignment[];
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

export async function getExtensionOverview(): Promise<ExtensionOverviewPayload> {
  const [focus, prioritizedAssignments, assignmentList] = await Promise.all([
    getStudentFocus(),
    getPrioritizedAssignments(),
    getAssignmentList(),
  ]);

  const focusDetail = focus ? await getAssignmentDetail(focus.assignment.id) : null;

  const assignmentListMap = new Map(assignmentList.map((assignment) => [assignment.id, assignment]));
  const focusAssignmentId = focus?.assignment.id ?? null;
  const upcoming = prioritizedAssignments
    .filter((entry) => entry.assignment.status !== "completed" && entry.assignment.id !== focusAssignmentId)
    .slice(0, 3)
    .map((entry) => {
      const assignmentMeta = assignmentListMap.get(entry.assignment.id);

      return {
        id: entry.assignment.id,
        title: entry.assignment.title,
        courseTitle: assignmentMeta?.courseTitle ?? "Unknown course",
        dueDate: entry.assignment.dueDate,
        estimatedHours: entry.assignment.estimatedHours,
        pointsPossible: entry.assignment.pointsPossible ?? null,
        difficulty: formatDifficulty(entry.assignment.estimatedHours),
      };
    });

  return {
    synced: assignmentList.length > 0,
    focus:
      focus !== null && focusDetail !== null
        ? {
            assignment: {
              id: focus.assignment.id,
              title: focus.assignment.title,
              course: focus.assignment.courseTitle,
              dueDate: focus.assignment.dueDate,
              points: focus.assignment.pointsPossible,
            },
            steps: focusDetail.checklist.map((task) => ({
              id: task.id,
              title: task.title,
              description: task.description,
              estimatedMinutes: task.estimatedMinutes,
              completed: task.completed,
              order: task.order,
            })),
            progress: {
              completedSteps: focusDetail.completedTasks,
              totalSteps: focusDetail.totalTasks,
            },
            estimatedHours: focus.assignment.estimatedHours,
            difficulty: formatDifficulty(focus.assignment.estimatedHours),
            priorityLabel: "#1 Priority",
          }
        : null,
    upcoming,
  };
}