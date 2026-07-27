import type { AssignmentPlan, AssignmentPlanTask, PlannerDifficulty } from "@dueable/types";
import { buildPlannerPrompt, plannerResponseSchema } from "@/prompts/plannerPrompt";
import { getOptionalEnv } from "@/lib/env";
import type { AIProvider } from "@/services/planner/providers/AIProvider";
import type { PlannerAssignment } from "@/services/planner/types";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function sanitizeDifficulty(value: unknown): PlannerDifficulty {
  if (value === "Low" || value === "Medium" || value === "High") {
    return value;
  }

  return "Medium";
}

function sanitizeTasks(tasks: unknown): AssignmentPlanTask[] {
  if (!Array.isArray(tasks)) {
    throw new Error("Gemini response did not include a tasks array.");
  }

  return tasks
    .map((task, index) => {
      const entry = task as Record<string, unknown>;
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      const description = typeof entry.description === "string" ? entry.description.trim() : "";
      const estimatedMinutes = typeof entry.estimatedMinutes === "number" ? Math.round(entry.estimatedMinutes) : 30;
      const order = typeof entry.order === "number" ? Math.round(entry.order) : index + 1;

      if (!title) {
        return null;
      }

      return {
        title,
        description: description || "Complete this step as part of the assignment plan.",
        estimatedMinutes: estimatedMinutes > 0 ? estimatedMinutes : 30,
        order: order > 0 ? order : index + 1,
      } satisfies AssignmentPlanTask;
    })
    .filter((task): task is AssignmentPlanTask => task !== null)
    .sort((left, right) => left.order - right.order)
    .slice(0, 10);
}

function sanitizePlan(raw: unknown, assignment: PlannerAssignment): AssignmentPlan {
  const parsed = raw as Record<string, unknown>;
  const tasks = sanitizeTasks(parsed.tasks);

  if (tasks.length === 0) {
    throw new Error("Gemini returned no valid tasks.");
  }

  const estimatedHours = typeof parsed.estimatedHours === "number" && parsed.estimatedHours >= 0 ? Math.round(parsed.estimatedHours) : assignment.estimatedHours;
  const estimatedDays = typeof parsed.estimatedDays === "number" && parsed.estimatedDays >= 0 ? Math.round(parsed.estimatedDays) : Math.max(1, Math.ceil(estimatedHours / 2));

  return {
    type: typeof parsed.type === "string" && parsed.type.trim() ? parsed.type.trim() : assignment.title,
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : assignment.title,
    estimatedHours,
    estimatedDays,
    difficulty: sanitizeDifficulty(parsed.difficulty),
    tasks,
  };
}

async function waitBeforeRetry(attempt: number) {
  await new Promise((resolve) => setTimeout(resolve, attempt * 250));
}

export class GeminiProvider implements AIProvider {
  readonly name: string;
  private readonly apiKey: string | null;
  private readonly model: string;

  constructor() {
    this.apiKey = getOptionalEnv("GEMINI_API_KEY");
    this.model = getOptionalEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";
    this.name = `gemini:${this.model}`;
  }

  async generatePlan(assignment: PlannerAssignment): Promise<AssignmentPlan> {
    if (!this.apiKey) {
      throw new Error("Missing required environment variable: GEMINI_API_KEY");
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: buildPlannerPrompt(assignment) }],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: "application/json",
              responseSchema: plannerResponseSchema,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini planner request failed: ${response.status} ${errorText}`);
        }

        const data = (await response.json()) as GeminiResponse;
        const payload = data.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;

        if (!payload) {
          throw new Error("Gemini response did not include structured JSON text.");
        }

        return sanitizePlan(JSON.parse(payload), assignment);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Gemini planner request failed.");

        if (attempt < 2) {
          await waitBeforeRetry(attempt);
        }
      }
    }

    throw lastError ?? new Error("Gemini planner request failed.");
  }
}