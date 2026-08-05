import type {
  Assignment,
  AssignmentPlan,
  AssignmentStatus,
  DashboardAssignmentItem,
  DashboardOverview,
  DashboardTaskItem,
  SupabaseTableRow,
} from "@dueable/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AssignmentRow = SupabaseTableRow<"assignments">;
type CourseRow = SupabaseTableRow<"courses">;
type TaskRow = SupabaseTableRow<"tasks">;
type AssignmentPlanRow = SupabaseTableRow<"assignment_plans">;

export interface AssignmentChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  estimatedMinutes: number;
  order: number;
  completedAt: string | null;
}

export interface AssignmentPlanSummary {
  providerUsed: string;
  estimatedHours: number;
  estimatedDays: number;
  difficulty: string;
  type: string;
  generatedAt: string;
  tasks: AssignmentPlan["tasks"];
}

export interface AssignmentListItem {
  id: string;
  title: string;
  courseTitle: string;
  dueDate: string;
  availableUntil: string | null;
  estimatedHours: number;
  pointsPossible: number | null;
}

export interface AssignmentDetailData {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  availableUntil: string | null;
  estimatedHours: number;
  pointsPossible: number | null;
  status: AssignmentStatus;
  courseTitle: string;
  courseColor: string | null;
  courseId: string;
  canvasBaseUrl: string;
  canvasCourseId: string;
  progressPercent: number;
  completedTasks: number;
  totalTasks: number;
  remainingTasks: number;
  latestPlan: AssignmentPlanSummary | null;
  checklist: AssignmentChecklistItem[];
}

interface AssignmentBundle {
  assignment: AssignmentRow;
  course: CourseRow;
  tasks: TaskRow[];
  latestPlan: AssignmentPlanRow | null;
  progressPercent: number;
  completedTasks: number;
}

function formatFallbackProgress(status: AssignmentStatus) {
  if (status === "completed") {
    return 100;
  }

  if (status === "in_progress") {
    return 50;
  }

  return 0;
}

function calculateProgress(tasks: TaskRow[], status: AssignmentStatus) {
  if (tasks.length === 0) {
    return {
      progressPercent: formatFallbackProgress(status),
      completedTasks: status === "completed" ? 1 : 0,
      totalTasks: status === "completed" ? 1 : 0,
    };
  }

  const completedTasks = tasks.filter((task) => task.completed).length;

  return {
    progressPercent: Math.round((completedTasks / tasks.length) * 100),
    completedTasks,
    totalTasks: tasks.length,
  };
}

function formatHoursLabel(totalMinutes: number) {
  const hours = totalMinutes / 60;

  if (hours === 0) {
    return "0 hrs";
  }

  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)} hrs`;
}

function parsePlanSummary(plan: AssignmentPlanRow | null): AssignmentPlanSummary | null {
  if (!plan) {
    return null;
  }

  const snapshot = plan.plan_snapshot as unknown as AssignmentPlan;

  return {
    providerUsed: plan.provider_used,
    estimatedHours: plan.estimated_hours,
    estimatedDays: plan.estimated_days,
    difficulty: plan.difficulty,
    type: plan.plan_type,
    generatedAt: plan.generated_at,
    tasks: Array.isArray(snapshot.tasks) ? snapshot.tasks : [],
  };
}

function rankPriority(dueDate: string) {
  const dueTime = new Date(dueDate).getTime();
  const now = Date.now();
  const diffHours = (dueTime - now) / (1000 * 60 * 60);

  if (diffHours <= 24) {
    return "High" as const;
  }

  if (diffHours <= 72) {
    return "Medium" as const;
  }

  return "Low" as const;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameLocalDay(value: string | null, reference: Date) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return date.toDateString() === reference.toDateString();
}

function mapAssignmentRowToDomain(assignment: AssignmentRow): Assignment {
  return {
    id: assignment.id,
    courseId: assignment.course_id,
    canvasAssignmentId: assignment.canvas_assignment_id,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.due_date,
    availableUntil: assignment.available_until,
    estimatedHours: assignment.estimated_hours,
    pointsPossible: assignment.points_possible,
    status: assignment.status,
  };
}

async function fetchAssignmentBundles() {
  const supabase = await createSupabaseServerClient();
  const assignmentResult = await supabase
    .from("assignments")
    .select("id, course_id, canvas_assignment_id, title, description, due_date, available_until, estimated_hours, points_possible, status, created_at, updated_at")
    .order("due_date", { ascending: true });

  if (assignmentResult.error) {
    throw new Error(assignmentResult.error.message);
  }

  const assignments = assignmentResult.data ?? [];
  const courseIds = Array.from(new Set(assignments.map((assignment) => assignment.course_id)));
  const assignmentIds = assignments.map((assignment) => assignment.id);

  const courseResult = courseIds.length
    ? await supabase.from("courses").select("id, user_id, canvas_base_url, canvas_course_id, title, course_color, created_at, updated_at").in("id", courseIds)
    : { data: [] as CourseRow[], error: null };

  if (courseResult.error) {
    throw new Error(courseResult.error.message);
  }

  const taskResult = assignmentIds.length
    ? await supabase
        .from("tasks")
        .select("id, assignment_id, title, description, completed, estimated_minutes, \"order\", source_plan_id, completed_at, created_at, updated_at")
        .in("assignment_id", assignmentIds)
        .order("order", { ascending: true })
    : { data: [] as TaskRow[], error: null };

  if (taskResult.error) {
    throw new Error(taskResult.error.message);
  }

  const planResult = assignmentIds.length
    ? await supabase
        .from("assignment_plans")
        .select("id, assignment_id, provider_used, plan_type, title, difficulty, estimated_hours, estimated_days, plan_snapshot, generated_at, created_at, updated_at")
        .in("assignment_id", assignmentIds)
        .order("generated_at", { ascending: false })
    : { data: [] as AssignmentPlanRow[], error: null };

  if (planResult.error) {
    throw new Error(planResult.error.message);
  }

  const courseMap = new Map((courseResult.data ?? []).map((course) => [course.id, course]));
  const tasksByAssignment = new Map<string, TaskRow[]>();
  const latestPlanByAssignment = new Map<string, AssignmentPlanRow>();

  for (const task of taskResult.data ?? []) {
    const existing = tasksByAssignment.get(task.assignment_id) ?? [];
    existing.push(task);
    tasksByAssignment.set(task.assignment_id, existing);
  }

  for (const plan of planResult.data ?? []) {
    if (!latestPlanByAssignment.has(plan.assignment_id)) {
      latestPlanByAssignment.set(plan.assignment_id, plan);
    }
  }

  return assignments
    .map((assignment) => {
      const course = courseMap.get(assignment.course_id);

      if (!course) {
        return null;
      }

      const tasks = tasksByAssignment.get(assignment.id) ?? [];
      const { progressPercent, completedTasks } = calculateProgress(tasks, assignment.status);

      return {
        assignment,
        course,
        tasks,
        latestPlan: latestPlanByAssignment.get(assignment.id) ?? null,
        progressPercent,
        completedTasks,
      } satisfies AssignmentBundle;
    })
    .filter((bundle): bundle is AssignmentBundle => bundle !== null);
}

export async function getDashboardOverview(userName: string): Promise<DashboardOverview> {
  const bundles = await fetchAssignmentBundles();
  const today = startOfToday();

  const todaysTasks: DashboardTaskItem[] = bundles
    .flatMap((bundle) =>
      bundle.tasks
        .filter((task) => !task.completed)
        .map((task) => ({
          id: task.id,
          assignmentId: bundle.assignment.id,
          title: task.title,
          assignmentTitle: bundle.assignment.title,
          courseTitle: bundle.course.title,
          dueDate: bundle.assignment.due_date,
          estimatedMinutes: task.estimated_minutes,
          completed: task.completed,
        })),
    )
    .sort((left, right) => {
      const dueDifference = new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
      return dueDifference === 0 ? left.estimatedMinutes - right.estimatedMinutes : dueDifference;
    })
    .slice(0, 5);

  const completedToday: DashboardTaskItem[] = bundles
    .flatMap((bundle) =>
      bundle.tasks
        .filter((task) => task.completed && isSameLocalDay(task.completed_at, today))
        .map((task) => ({
          id: task.id,
          assignmentId: bundle.assignment.id,
          title: task.title,
          assignmentTitle: bundle.assignment.title,
          courseTitle: bundle.course.title,
          dueDate: bundle.assignment.due_date,
          estimatedMinutes: task.estimated_minutes,
          completed: task.completed,
        })),
    )
    .slice(0, 5);

  const upcomingAssignments: DashboardAssignmentItem[] = bundles
    .map((bundle) => ({
      id: bundle.assignment.id,
      title: bundle.assignment.title,
      courseTitle: bundle.course.title,
      dueDate: bundle.assignment.due_date,
      status: bundle.assignment.status,
      estimatedHours: bundle.assignment.estimated_hours,
      progressPercent: bundle.progressPercent,
    }))
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
    .slice(0, 6);

  const totalTasks = bundles.reduce((sum, bundle) => sum + bundle.tasks.length, 0);
  const completedTasks = bundles.reduce((sum, bundle) => sum + bundle.completedTasks, 0);
  const completionPercent =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : bundles.length > 0
        ? Math.round((bundles.filter((bundle) => bundle.assignment.status === "completed").length / bundles.length) * 100)
        : 0;
  const plannedMinutesToday = todaysTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);

  return {
    focusQuestion: `What should you work on today, ${userName}?`,
    todaysTasks,
    upcomingAssignments,
    recentAssignments: [...upcomingAssignments].reverse().slice(0, 3),
    completedToday,
    progress: {
      completionPercent,
      completedTasks,
      totalTasks,
      activeAssignments: bundles.filter((bundle) => bundle.assignment.status !== "completed").length,
      plannedMinutesToday,
    },
  };
}

export async function getAssignmentDetail(assignmentId: string): Promise<AssignmentDetailData | null> {
  const bundles = await fetchAssignmentBundles();
  const bundle = bundles.find((entry) => entry.assignment.id === assignmentId);

  if (!bundle) {
    return null;
  }

  return {
    id: bundle.assignment.id,
    title: bundle.assignment.title,
    description: bundle.assignment.description,
    dueDate: bundle.assignment.due_date,
    availableUntil: bundle.assignment.available_until,
    estimatedHours: bundle.assignment.estimated_hours,
    pointsPossible: bundle.assignment.points_possible,
    status: bundle.assignment.status,
    courseTitle: bundle.course.title,
    courseColor: bundle.course.course_color,
    courseId: bundle.course.id,
    canvasBaseUrl: bundle.course.canvas_base_url,
    canvasCourseId: bundle.course.canvas_course_id,
    progressPercent: bundle.progressPercent,
    completedTasks: bundle.completedTasks,
    totalTasks: bundle.tasks.length,
    remainingTasks: bundle.tasks.length - bundle.completedTasks,
    latestPlan: parsePlanSummary(bundle.latestPlan),
    checklist: bundle.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      estimatedMinutes: task.estimated_minutes,
      order: task.order,
      completedAt: task.completed_at,
    })),
  };
}

export async function getAssignmentList(): Promise<AssignmentListItem[]> {
  const bundles = await fetchAssignmentBundles();

  return bundles.map((bundle) => ({
    id: bundle.assignment.id,
    title: bundle.assignment.title,
    courseTitle: bundle.course.title,
    dueDate: bundle.assignment.due_date,
    availableUntil: bundle.assignment.available_until,
    estimatedHours: bundle.assignment.estimated_hours,
    pointsPossible: bundle.assignment.points_possible,
  }));
}

export async function getAssignments(): Promise<Assignment[]> {
  const bundles = await fetchAssignmentBundles();

  return bundles.map((bundle) => mapAssignmentRowToDomain(bundle.assignment));
}

export function getPriorityLabel(dueDate: string) {
  return rankPriority(dueDate);
}

export function getPlannedHoursLabel(totalMinutes: number) {
  return formatHoursLabel(totalMinutes);
}