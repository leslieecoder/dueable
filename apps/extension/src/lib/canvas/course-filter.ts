import type { CanvasCourse } from "./api";

export interface FilteredCanvasCourses {
  currentCourses: CanvasCourse[];
  otherCourses: CanvasCourse[];
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEffectiveWindow(course: CanvasCourse) {
  const termStartDate = parseDate(course.term?.start_at);
  const termEndDate = parseDate(course.term?.end_at);

  if (termStartDate || termEndDate) {
    return {
      startDate: termStartDate,
      endDate: termEndDate,
      source: "term" as const,
    };
  }

  return {
    startDate: parseDate(course.start_at),
    endDate: parseDate(course.end_at),
    source: "course" as const,
  };
}

function isWithinEffectiveWindow(course: CanvasCourse, referenceDate: Date) {
  const { startDate, endDate } = getEffectiveWindow(course);

  if (!startDate && !endDate) {
    return null;
  }

  if (startDate && endDate) {
    return startDate.getTime() <= referenceDate.getTime() && referenceDate.getTime() <= endDate.getTime();
  }

  if (startDate) {
    return startDate.getTime() <= referenceDate.getTime();
  }

  return referenceDate.getTime() <= (endDate?.getTime() ?? referenceDate.getTime());
}

function hasActiveEnrollment(course: CanvasCourse) {
  if (!course.enrollments || course.enrollments.length === 0) {
    return false;
  }

  return course.enrollments.some((enrollment) => enrollment.enrollment_state === "active");
}

function isCompletedCourse(course: CanvasCourse, referenceDate: Date) {
  if (course.workflow_state && course.workflow_state !== "available") {
    return true;
  }

  if (course.access_restricted_by_date === true) {
    return true;
  }

  const { endDate } = getEffectiveWindow(course);

  if (!endDate) {
    return false;
  }

  return endDate.getTime() < referenceDate.getTime();
}

export function filterCurrentSemesterCourses(courses: CanvasCourse[]): FilteredCanvasCourses {
  console.log("[Dueable][Courses] Filtering Canvas courses");

  const now = new Date();
  const currentCourses: CanvasCourse[] = [];
  const otherCourses: CanvasCourse[] = [];

  for (const course of courses) {
    const activeEnrollment = hasActiveEnrollment(course);
    const completed = isCompletedCourse(course, now);
    const withinWindow = isWithinEffectiveWindow(course, now);

    if (!completed && activeEnrollment && (withinWindow === null || withinWindow)) {
      currentCourses.push(course);
      continue;
    }

    otherCourses.push(course);
  }

  if (currentCourses.length === 0) {
    const fallbackCourses = otherCourses.filter(
      (course) => hasActiveEnrollment(course) && !isCompletedCourse(course, now),
    );

    if (fallbackCourses.length > 0) {
      console.log(`[Dueable][Courses] Falling back to ${fallbackCourses.length} non-completed available courses.`);

      return {
        currentCourses: fallbackCourses,
        otherCourses: [],
      };
    }
  }

  console.log(`[Dueable][Courses] Current courses found: ${currentCourses.length}`);
  console.log(`[Dueable][Courses] Other courses found: ${otherCourses.length}`);

  return {
    currentCourses,
    otherCourses,
  };
}