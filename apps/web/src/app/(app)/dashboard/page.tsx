import { redirect } from "next/navigation";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { getDashboardOverview } from "@/features/assignments/data";
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
  const overview = await getDashboardOverview(user.name);

  return <DashboardShell user={user} overview={overview} activated={activated === "1"} />;
}