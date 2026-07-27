"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, MonitorSmartphone, Zap } from "lucide-react";

const navigationItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/assignments", label: "Assignments", icon: FileText },
  { href: "/extension", label: "Extension", icon: MonitorSmartphone },
];

export function AppSidebar({
  weeklyAssignmentCount,
}: {
  weeklyAssignmentCount: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-72 shrink-0 flex-col bg-[#121b2f] px-8 py-7 text-white">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-3 text-[1.9rem] font-bold tracking-[-0.04em] text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#3f73e5] text-white">
            <Zap className="h-5 w-5" />
          </span>
          <span className="dueable-display text-[1.8rem]">dueable</span>
        </Link>
        <p className="mt-3 text-[0.72rem] text-[#77829a]">study companion</p>
      </div>

      <nav className="mt-10 flex flex-col gap-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive ? "bg-[#3f73e5] text-white" : "text-[#9ba4b6] hover:bg-white/6 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-white/6 px-4 py-4">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#7d879d]">This week</p>
        <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-white">{weeklyAssignmentCount}</p>
        <p className="text-sm text-[#b8c0d0]">assignments</p>
      </div>
    </aside>
  );
}