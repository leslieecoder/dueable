export interface CanvasSelectorStrategy {
  name: string;
  assignmentTitle: string[];
  assignmentDescription: string[];
  dueDate: string[];
  courseTitle: string[];
}

export const canvasSelectorStrategies: CanvasSelectorStrategy[] = [
  {
    name: "default-assignment-page",
    assignmentTitle: [".assignment-title", "[data-testid='assignment-title']", "h1.title"],
    assignmentDescription: [".assignment-description", ".description.user_content", "#assignment_show .description"],
    dueDate: [
      ".student-assignment-overview .date_text",
      ".student-assignment-overview .display_date",
      ".details .due_at",
      ".assignment-date-due",
      "time[data-testid='assignment-due-date']",
    ],
    courseTitle: [
      "#breadcrumbs li:nth-child(2) .ellipsible",
      "nav[aria-label='breadcrumbs'] li:nth-child(2) .ellipsible",
      ".course-title",
      ".ic-app-nav-toggle-and-crumbs .ellipsible",
    ],
  },
  {
    name: "cards-theme-fallback",
    assignmentTitle: ["main h1", "header h1"],
    assignmentDescription: ["main .user_content", "main article", "[role='main'] .description"],
    dueDate: [
      "main .student-assignment-overview .date_text",
      "main time",
      "[role='main'] .due-date",
      "aside time",
    ],
    courseTitle: [
      "#breadcrumbs li:nth-child(2) .ellipsible",
      "header .course-header__name",
      "[data-course-name]",
      "nav[aria-label='breadcrumb'] a",
    ],
  },
];