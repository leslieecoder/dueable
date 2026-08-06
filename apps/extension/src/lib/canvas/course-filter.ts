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

function hasActiveEnrollment(course: CanvasCourse) {
  if (!course.enrollments || course.enrollments.length === 0) {
    return false;
  }

  return course.enrollments.some((enrollment) => enrollment.enrollment_state === "active");
}

function hasCourseDates(course: CanvasCourse) {
  return Boolean(parseDate(course.start_at) || parseDate(course.end_at));
}

function isWithinCourseDates(course: CanvasCourse, referenceDate: Date) {
  const startDate = parseDate(course.start_at);
  const endDate = parseDate(course.end_at);

  if (!startDate || !endDate) {
    return false;
  }

  return startDate.getTime() <= referenceDate.getTime() && referenceDate.getTime() <= endDate.getTime();
}

function isCompletedCourse(course: CanvasCourse, referenceDate: Date) {
  if (course.workflow_state && course.workflow_state !== "available") {
    return true;
  }

  if (course.access_restricted_by_date === true) {
    return true;
  }

  const endDate = parseDate(course.end_at);

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
    const withinDates = isWithinCourseDates(course, now);
    const completed = isCompletedCourse(course, now);
    const courseHasDates = hasCourseDates(course);

    if (!completed && activeEnrollment && (withinDates || !courseHasDates)) {
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