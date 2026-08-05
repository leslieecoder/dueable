import type { Assignment } from "@dueable/types";
import { getOptionalEnv } from "@/lib/env";
import { GeminiProvider } from "@/services/planner/providers/GeminiProvider";
import type { AIProvider } from "@/services/planner/providers/AIProvider";
import { RuleBasedProvider } from "@/services/planner/providers/RuleBasedProvider";
import type { PlannerGenerationResult } from "@/services/planner/types";

export interface PlannerService {
  generatePlan(assignment: Assignment): Promise<PlannerGenerationResult>;
}

class DefaultPlannerService implements PlannerService {
  constructor(
    private readonly primaryProvider: AIProvider,
    private readonly fallbackProvider: AIProvider,
  ) {}

  async generatePlan(assignment: Assignment): Promise<PlannerGenerationResult> {
    try {
      const plan = await this.primaryProvider.generatePlan(assignment);

      return {
        plan,
        provider: this.primaryProvider.name,
        fallbackUsed: false,
        primaryProvider: this.primaryProvider.name,
        primaryError: null,
      };
    } catch (error) {
      const primaryError = error instanceof Error ? error.message : "Primary planner provider failed.";
      const plan = await this.fallbackProvider.generatePlan(assignment);

      return {
        plan,
        provider: this.fallbackProvider.name,
        fallbackUsed: true,
        primaryProvider: this.primaryProvider.name,
        primaryError,
      };
    }
  }
}

function createPrimaryProvider() {
  const configuredProvider = getOptionalEnv("DUEABLE_PLANNER_PROVIDER") ?? "gemini";

  if (configuredProvider === "rule_based") {
    return new RuleBasedProvider();
  }

  return new GeminiProvider();
}

export function createPlannerService(): PlannerService {
  const primaryProvider = createPrimaryProvider();
  const fallbackProvider = new RuleBasedProvider();

  return new DefaultPlannerService(primaryProvider, fallbackProvider);
}