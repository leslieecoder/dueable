import { redirect } from "next/navigation";
import { getExtensionOverview } from "@/app/api/extension/shared";
import { ExtensionDashboardShell } from "@/features/dashboard/extension-dashboard-shell";
import { hasImportedAssignments, requireUser } from "@/lib/auth/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ activated?: string }>;
}) {
  const user = await requireUser();
  const importedAssignments = await hasImportedAssignments(user.id);

  if (!importedAssignments) {
    redirect("/onboarding");
  }

  const { activated } = await searchParams;
  const overview = await getExtensionOverview();

  return <ExtensionDashboardShell initialOverview={overview} activated={activated === "1"} />;
}