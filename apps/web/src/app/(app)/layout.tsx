import { getAssignmentList } from "@/features/assignments/data";
import { AppTopbar } from "@/features/auth/app-topbar";
import { AppSidebar } from "@/features/navigation/app-sidebar";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const assignments = await getAssignmentList();

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#0f172a]">
      <div className="flex min-h-screen">
        <AppSidebar weeklyAssignmentCount={assignments.length} />
        <div className="min-w-0 flex-1 px-8 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
            <AppTopbar user={user} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
