import type { Assignment } from "@dueable/types";

export const plannerResponseSchema = {
  type: "OBJECT",
  required: ["type", "title", "estimatedHours", "estimatedDays", "difficulty", "tasks"],
  properties: {
    type: { type: "STRING" },
    title: { type: "STRING" },
    estimatedHours: { type: "NUMBER" },
    estimatedDays: { type: "NUMBER" },
    difficulty: { type: "STRING", enum: ["Low", "Medium", "High"] },
    tasks: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 10,
      items: {
        type: "OBJECT",
        required: ["title", "description", "estimatedMinutes", "order"],
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          estimatedMinutes: { type: "NUMBER" },
          order: { type: "NUMBER" },
        },
      },
    },
  },
} as const;

export function buildPlannerPrompt(assignment: Assignment) {
  return [
    "You are an Academic Planning Assistant.",
    "You never answer homework.",
    "You never write essays.",
    "You never solve assignments.",
    "You ONLY help students plan their work.",
    "Return structured JSON only.",
    "Do not use markdown.",
    "Do not include explanations outside the JSON payload.",
    "Estimate realistic study time and break the work into concrete, ordered tasks.",
    "Each task must be action-oriented and must not complete the assignment for the student.",
    `Assignment title: ${assignment.title}`,
    `Assignment description: ${assignment.description || "No description provided."}`,
    `Estimated hours from the app: ${assignment.estimatedHours}`,
    `Due date: ${assignment.dueDate}`,
    "Return JSON in this shape:",
    '{"type":"Research Paper","title":"Research Paper","estimatedHours":8,"estimatedDays":6,"difficulty":"Medium","tasks":[{"title":"Choose Topic","description":"Select a focused research topic.","estimatedMinutes":30,"order":1}]}',
  ].join("\n");
}