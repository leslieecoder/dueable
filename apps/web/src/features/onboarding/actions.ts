"use server";

import { redirect } from "next/navigation";
import { hasImportedAssignments, requireUser } from "@/lib/auth/session";

export async function completeOnboardingImportCheck() {
  const user = await requireUser();
  const importedAssignments = await hasImportedAssignments(user.id);

  if (importedAssignments) {
    redirect("/dashboard?activated=1");
  }

  redirect("/onboarding?import=missing");
}