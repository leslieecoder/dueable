export interface CanvasSelectorStrategy {
  name: string;
  assignmentTitle: string[];
  assignmentDescription: string[];
  dueDate: string[];
  availableUntil: string[];
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
    availableUntil: [
      ".student-assignment-overview .available_until",
      ".student-assignment-overview .lock_at",
      ".details .available_until",
      ".details .lock_at",
      ".student-assignment-overview",
      ".details",
      "aside",
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
    availableUntil: [
      "main .student-assignment-overview .available_until",
      "main .student-assignment-overview .lock_at",
      "[role='main'] .details .available_until",
      "[role='main'] .details .lock_at",
      "main .student-assignment-overview",
      "[role='main'] .details",
      "aside",
    ],
    courseTitle: [
      "#breadcrumbs li:nth-child(2) .ellipsible",
      "header .course-header__name",
      "[data-course-name]",
      "nav[aria-label='breadcrumb'] a",
    ],
  },
];