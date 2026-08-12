import { getCanvasBaseUrl, getCanvasCourses } from "./api";
import { getCanvasAssignments } from "./assignments";

export interface CanvasSemesterAssignment {
  id: number;
  courseId: number;
  courseName: string;
  courseColor?: string | null;
  name: string;
  description?: string;
  dueAt?: string;
  availableUntil?: string;
  pointsPossible?: number;
  htmlUrl?: string;
  submitted: boolean;
}

export interface CanvasSemesterImportResult {
  canvasBaseUrl: string;
  coursesImported: number;
  assignmentsImported: number;
  assignments: CanvasSemesterAssignment[];
}

export interface CanvasSemesterImportProgress {
  stage: "loading_courses" | "importing_courses" | "saving_assignments" | "done";
  totalCourses: number;
  completedCourses: number;
  importedAssignments: number;
  currentCourseName: string | null;
}

export async function importSemester(
  tabId: number,
  tabUrl: string,
  courseIds: number[],
  onProgress?: (progress: CanvasSemesterImportProgress) => void,
): Promise<CanvasSemesterImportResult> {
  console.log("[Dueable][Import] Starting semester import");

  const canvasBaseUrl = getCanvasBaseUrl(tabUrl);
  const selectedCourseIds = new Set(courseIds);
  onProgress?.({
    stage: "loading_courses",
    totalCourses: courseIds.length,
    completedCourses: 0,
    importedAssignments: 0,
    currentCourseName: null,
  });

  const courses = (await getCanvasCourses(tabId, canvasBaseUrl)).filter((course) => selectedCourseIds.has(course.id));
  const assignments: CanvasSemesterAssignment[] = [];
  let coursesImported = 0;

  onProgress?.({
    stage: "importing_courses",
    totalCourses: courses.length,
    completedCourses: 0,
    importedAssignments: 0,
    currentCourseName: courses[0]?.name ?? null,
  });

  for (const course of courses) {
    console.log("[Dueable][Import] Importing course:", course.name);

    onProgress?.({
      stage: "importing_courses",
      totalCourses: courses.length,
      completedCourses: coursesImported,
      importedAssignments: assignments.length,
      currentCourseName: course.name,
    });

    try {
      const courseAssignments = await getCanvasAssignments(tabId, canvasBaseUrl, course.id);

      assignments.push(
        ...courseAssignments.map((assignment) => ({
          id: assignment.id,
          courseId: assignment.courseId,
          courseName: course.name,
          courseColor: course.color ?? null,
          name: assignment.name,
          description: assignment.description,
          dueAt: assignment.dueAt,
          availableUntil: assignment.availableUntil,
          pointsPossible: assignment.pointsPossible,
          htmlUrl: assignment.htmlUrl,
          submitted: assignment.submitted,
        })),
      );

      coursesImported += 1;
      console.log(`[Dueable][Import] Imported ${courseAssignments.length} assignments`);
      onProgress?.({
        stage: "importing_courses",
        totalCourses: courses.length,
        completedCourses: coursesImported,
        importedAssignments: assignments.length,
        currentCourseName: course.name,
      });
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

  onProgress?.({
    stage: "saving_assignments",
    totalCourses: courses.length,
    completedCourses: coursesImported,
    importedAssignments: assignments.length,
    currentCourseName: null,
  });

  return result;
}