export type AssignmentStatus = "not_started" | "in_progress" | "completed";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface Course {
  id: string;
  userId: string;
  canvasCourseId: string;
  title: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  canvasAssignmentId: string;
  title: string;
  description: string;
  dueDate: string;
  estimatedHours: number;
  pointsPossible?: number | null;
  status: AssignmentStatus;
}

export interface Task {
  id: string;
  assignmentId: string;
  title: string;
  description?: string;
  completed: boolean;
  estimatedMinutes: number;
  order: number;
  completedAt?: string | null;
}

export type PlannerDifficulty = "Low" | "Medium" | "High";

export interface AssignmentPlanTask {
  title: string;
  description: string;
  estimatedMinutes: number;
  order: number;
}

export interface AssignmentPlan {
  type: string;
  title: string;
  estimatedHours: number;
  estimatedDays: number;
  difficulty: PlannerDifficulty;
  tasks: AssignmentPlanTask[];
}

export interface PlannerInput {
  title: string;
  description: string;
  estimatedHours: number;
}

export interface PlannerTaskBlueprint {
  title: string;
  estimatedMinutes: number;
}

export interface ScrapedAssignmentInput {
  courseTitle: string;
  assignmentTitle: string;
  assignmentDescription: string;
  dueDate: string | null;
  sourceUrl: string;
}

export interface DashboardTaskItem {
  id: string;
  assignmentId: string;
  title: string;
  assignmentTitle: string;
  courseTitle: string;
  dueDate: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface DashboardAssignmentItem {
  id: string;
  title: string;
  courseTitle: string;
  dueDate: string;
  status: AssignmentStatus;
  estimatedHours: number;
  progressPercent: number;
}

export interface DashboardProgress {
  completionPercent: number;
  completedTasks: number;
  totalTasks: number;
  activeAssignments: number;
  plannedMinutesToday: number;
}

export interface DashboardOverview {
  focusQuestion: string;
  todaysTasks: DashboardTaskItem[];
  upcomingAssignments: DashboardAssignmentItem[];
  recentAssignments: DashboardAssignmentItem[];
  completedToday: DashboardTaskItem[];
  progress: DashboardProgress;
}