export interface DashboardTask {
  id: string;
  title: string;
  course: string;
  assignment: string;
  dueLabel: string;
  duration: string;
  priority: "High" | "Medium" | "Low";
  completed?: boolean;
}

export interface DashboardAssignment {
  id: string;
  title: string;
  course: string;
  dueLabel: string;
  progress: number;
  estimatedHours: number;
}

export interface DashboardStats {
  tasksToday: number;
  plannedHours: string;
  completionRate: string;
  streak: string;
}

export interface MockDashboardData {
  stats: DashboardStats;
  todaysTasks: DashboardTask[];
  upcomingAssignments: DashboardAssignment[];
  completedToday: DashboardTask[];
}

export function getMockDashboardData(): MockDashboardData {
  return {
    stats: {
      tasksToday: 5,
      plannedHours: "4.5 hrs",
      completionRate: "78%",
      streak: "3 days",
    },
    todaysTasks: [
      {
        id: "task-1",
        title: "Outline body paragraphs",
        course: "English 204",
        assignment: "Research Paper Draft",
        dueLabel: "Due tomorrow, 11:59 PM",
        duration: "50 min",
        priority: "High",
      },
      {
        id: "task-2",
        title: "Review lecture notes and examples",
        course: "Calculus II",
        assignment: "Quiz 4 Prep",
        dueLabel: "Due tomorrow, 9:00 AM",
        duration: "35 min",
        priority: "High",
      },
      {
        id: "task-3",
        title: "Create slide structure",
        course: "Biology 110",
        assignment: "Cell Signaling Presentation",
        dueLabel: "Due Friday",
        duration: "45 min",
        priority: "Medium",
      },
      {
        id: "task-4",
        title: "Complete problem 1 to 5",
        course: "Economics 301",
        assignment: "Problem Set 3",
        dueLabel: "Due Friday",
        duration: "60 min",
        priority: "Medium",
      },
      {
        id: "task-5",
        title: "Proofread final reflection",
        course: "History 150",
        assignment: "Weekly Reflection",
        dueLabel: "Due Sunday",
        duration: "20 min",
        priority: "Low",
      },
    ],
    upcomingAssignments: [
      {
        id: "assignment-1",
        title: "Research Paper Draft",
        course: "English 204",
        dueLabel: "Tomorrow",
        progress: 62,
        estimatedHours: 6,
      },
      {
        id: "assignment-2",
        title: "Cell Signaling Presentation",
        course: "Biology 110",
        dueLabel: "Friday",
        progress: 38,
        estimatedHours: 4,
      },
      {
        id: "assignment-3",
        title: "Problem Set 3",
        course: "Economics 301",
        dueLabel: "Friday",
        progress: 45,
        estimatedHours: 3,
      },
    ],
    completedToday: [
      {
        id: "done-1",
        title: "Choose final paper topic",
        course: "English 204",
        assignment: "Research Paper Draft",
        dueLabel: "Completed this morning",
        duration: "25 min",
        priority: "Medium",
        completed: true,
      },
      {
        id: "done-2",
        title: "Review lab rubric",
        course: "Biology 110",
        assignment: "Cell Signaling Presentation",
        dueLabel: "Completed 1 hour ago",
        duration: "15 min",
        priority: "Low",
        completed: true,
      },
    ],
  };
}