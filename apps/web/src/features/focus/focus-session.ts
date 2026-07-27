import type { FocusSession } from "@/stores/app-store";

export function formatFocusElapsedLabel(startedAt: number) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));

  if (elapsedMinutes === 0) {
    return "Just started";
  }

  if (elapsedMinutes === 1) {
    return "1 minute in";
  }

  return `${elapsedMinutes} minutes in`;
}

export function formatFocusDurationLabel(duration: number) {
  if (duration <= 0) {
    return "Short focus";
  }

  if (duration === 1) {
    return "1-minute focus";
  }

  return `${duration}-minute focus`;
}

export function isFocusSessionActiveForAssignment(session: FocusSession | null, assignmentId: string) {
  return session?.assignmentId === assignmentId;
}