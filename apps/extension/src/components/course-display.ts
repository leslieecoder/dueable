function normalizeCourseCode(rawCourseCode: string) {
  const normalizedCourseCode = rawCourseCode.replace(/\s+/g, " ").trim();
  const compactMatch = normalizedCourseCode.match(/^([A-Z]{2,})\s*(\d{3})/i);

  if (!compactMatch) {
    return normalizedCourseCode;
  }

  return `${compactMatch[1].toUpperCase()} ${compactMatch[2]}`;
}

export function splitCourseDisplayLabel(courseLabel: string) {
  const normalizedCourseLabel = courseLabel.replace(/\s+/g, " ").trim();

  if (!normalizedCourseLabel) {
    return {
      courseCode: null,
      courseName: "",
    };
  }

  const dashedMatch = normalizedCourseLabel.split(" - ");

  if (dashedMatch.length > 1) {
    const [courseCode, ...courseNameParts] = dashedMatch;
    const courseName = courseNameParts.join(" - ").trim();

    if (courseCode && courseName) {
      return {
        courseCode: normalizeCourseCode(courseCode),
        courseName,
      };
    }
  }

  const compactMatch = normalizedCourseLabel.match(/^([A-Z]{2,}\s*\d[\w.-]*(?:\s+\([^)]*\))?)\s+(.+)$/);

  if (compactMatch) {
    return {
      courseCode: normalizeCourseCode(compactMatch[1]),
      courseName: compactMatch[2].trim(),
    };
  }

  return {
    courseCode: null,
    courseName: normalizedCourseLabel,
  };
}