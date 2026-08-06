import { redirect } from "next/navigation";
import { getExtensionOverview } from "@/app/api/extension/shared";
import { SimpleExtensionDashboardShell } from "@/features/dashboard/simple-extension-dashboard-shell";
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

  return <SimpleExtensionDashboardShell initialOverview={overview} userName={user.name} activated={activated === "1"} />;
}