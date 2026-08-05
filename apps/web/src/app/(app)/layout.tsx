import { AppSidebar } from "@/features/navigation/app-sidebar";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#f4f7ff_100%)] text-[#0f172a]">
      <div className="flex min-h-screen">
        <AppSidebar user={user} />
        <div className="min-w-0 flex-1 px-8 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
