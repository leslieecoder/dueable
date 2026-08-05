"use client";

import { SignOutButton } from "@/features/auth/sign-out-button";
import type { AuthenticatedUser } from "@/lib/auth/user";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { FileText, Home, MonitorSmartphone } from "lucide-react";

const navigationItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/assignments", label: "Assignments", icon: FileText },
  { href: "/extension", label: "Extension", icon: MonitorSmartphone },
];

export function AppSidebar({
  user,
}: {
  user: AuthenticatedUser;
}) {
  const pathname = usePathname();
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-white/70 bg-[linear-gradient(180deg,_#ffffff_0%,_#f6f9ff_100%)] px-8 py-7 text-[#173d4d] shadow-[0_24px_48px_-40px_rgba(53,88,154,0.28)]">
      <div>
        <Link href="/dashboard" className="inline-flex items-center text-[#173d4d]">
          <Image
            src="/assets/complete-logo.png"
            alt="Dueable"
            width={218}
            height={46}
            priority
            className="h-auto w-[170px]"
          />
        </Link>
        <p className="mt-3 text-[0.72rem] text-[#8b95a8]">study companion</p>
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
                isActive
                  ? "bg-[linear-gradient(135deg,_#2ec5a0,_#1fb78f)] text-white shadow-[0_18px_28px_-20px_rgba(31,183,143,0.48)]"
                  : "text-[#71809a] hover:bg-white hover:text-[#173d4d]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="dueable-soft-panel rounded-[24px] px-4 py-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#7d879d]">Profile</p>
          <div className="mt-3 flex items-center gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-11 w-11 rounded-full border border-slate-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#1dc9b2,_#2d6cdf)] text-sm font-semibold text-white">
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="mt-4">
            <SignOutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}