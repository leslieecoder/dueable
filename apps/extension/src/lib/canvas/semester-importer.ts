import { getCanvasBaseUrl, getCanvasCourses } from "./api";
import { getCanvasAssignments } from "./assignments";

export interface CanvasSemesterAssignment {
  id: number;
  courseId: number;
  courseName: string;
  name: string;
  description?: string;
  dueAt?: string;
  pointsPossible?: number;
  htmlUrl?: string;
}

export interface CanvasSemesterImportResult {
  canvasBaseUrl: string;
  coursesImported: number;
  assignmentsImported: number;
  assignments: CanvasSemesterAssignment[];
}

export async function importSemester(tabId: number, tabUrl: string, courseIds: number[]): Promise<CanvasSemesterImportResult> {
  console.log("[Dueable][Import] Starting semester import");

  const canvasBaseUrl = getCanvasBaseUrl(tabUrl);
  const selectedCourseIds = new Set(courseIds);
  const courses = (await getCanvasCourses(tabId, canvasBaseUrl)).filter((course) => selectedCourseIds.has(course.id));
  const assignments: CanvasSemesterAssignment[] = [];
  let coursesImported = 0;

  for (const course of courses) {
    console.log("[Dueable][Import] Importing course:", course.name);

    try {
      const courseAssignments = await getCanvasAssignments(tabId, canvasBaseUrl, course.id);

      assignments.push(
        ...courseAssignments.map((assignment) => ({
          id: assignment.id,
          courseId: assignment.courseId,
          courseName: course.name,
          name: assignment.name,
          description: assignment.description,
          dueAt: assignment.dueAt,
          pointsPossible: assignment.pointsPossible,
          htmlUrl: assignment.htmlUrl,
        })),
      );

      coursesImported += 1;
      console.log(`[Dueable][Import] Imported ${courseAssignments.length} assignments`);
    } catch (error) {
      console.error("[Dueable][Import] Failed to import course:", course.name, error);
    }
  }

  const result = {
    canvasBaseUrl,
    coursesImported,
    assignmentsImported: assignments.length,
    assignments,
  } satisfies CanvasSemesterImportResult;

  console.log("[Dueable][Import] Semester import complete", result);

  return result;
}