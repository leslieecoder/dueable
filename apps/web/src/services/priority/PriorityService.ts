import type { Assignment, AssignmentStatus } from "@dueable/types";

export type PriorityLevel = "high" | "medium" | "low";

export interface PriorityResult {
  score: number;
  priorityLevel: PriorityLevel;
  reasons: string[];
}

export interface PriorityAssignmentInput extends Assignment {
  pointsPossible?: number | null;
}

export interface PriorityService {
  calculatePriority(assignment: PriorityAssignmentInput): PriorityResult;
}

class DefaultPriorityService implements PriorityService {
  calculatePriority(assignment: PriorityAssignmentInput): PriorityResult {
    const reasons: string[] = [];
    const dueDateScore = scoreDueDate(assignment.dueDate, reasons);
    const pointsScore = scorePointsPossible(assignment.pointsPossible, reasons);
    const workloadScore = scoreEstimatedHours(assignment.estimatedHours, reasons);
    const statusScore = scoreCompletionStatus(assignment.status, reasons);

    const score = clampScore(dueDateScore + pointsScore + workloadScore + statusScore);

    return {
      score,
      priorityLevel: resolvePriorityLevel(score),
      reasons,
    };
  }
}

function scoreDueDate(dueDate: string, reasons: string[]) {
  const dueTime = new Date(dueDate).getTime();

  if (Number.isNaN(dueTime)) {
    return 0;
  }

  const hoursUntilDue = (dueTime - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilDue < -24 * 14) {
    reasons.push("Past due for more than two weeks");
    return 0;
  }

  if (hoursUntilDue < -24 * 7) {
    reasons.push("Past due");
    return 5;
  }

  if (hoursUntilDue < 0) {
    reasons.push("Recently past due");
    return 18;
  }

  if (hoursUntilDue <= 24) {
    reasons.push("Due within 24 hours");
    return 45;
  }

  if (hoursUntilDue <= 72) {
    reasons.push("Due within 3 days");
    return 35;
  }

  if (hoursUntilDue <= 168) {
    reasons.push("Due within 7 days");
    return 25;
  }

  if (hoursUntilDue <= 336) {
    reasons.push("Due within 14 days");
    return 15;
  }

  return 5;
}

function scorePointsPossible(pointsPossible: number | null | undefined, reasons: string[]) {
  if (!Number.isFinite(pointsPossible) || pointsPossible === undefined || pointsPossible === null) {
    return 0;
  }

  if (pointsPossible >= 100) {
    reasons.push("High point value");
    return 20;
  }

  if (pointsPossible >= 50) {
    reasons.push("Moderate point value");
    return 12;
  }

  if (pointsPossible > 0) {
    reasons.push("Low point value");
    return 6;
  }

  return 0;
}

function scoreEstimatedHours(estimatedHours: number, reasons: string[]) {
  if (estimatedHours >= 8) {
    reasons.push("Large estimated workload");
    return 20;
  }

  if (estimatedHours >= 4) {
    reasons.push("Moderate estimated workload");
    return 12;
  }

  if (estimatedHours > 0) {
    reasons.push("Small estimated workload");
    return 6;
  }

  return 0;
}

function scoreCompletionStatus(status: AssignmentStatus, reasons: string[]) {
  if (status === "completed") {
    reasons.push("Already completed");
    return -40;
  }

  if (status === "in_progress") {
    reasons.push("Already started");
    return 5;
  }

  reasons.push("Not started yet");
  return 15;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function resolvePriorityLevel(score: number): PriorityLevel {
  if (score >= 70) {
    return "high";
  }

  if (score >= 40) {
    return "medium";
  }

  return "low";
}

export function createPriorityService(): PriorityService {
  return new DefaultPriorityService();
}