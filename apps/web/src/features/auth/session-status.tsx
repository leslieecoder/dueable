"use client";

import { useAuthStore } from "@/stores/auth-store";

export function SessionStatus() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Session</p>
      <p className="mt-3 text-lg font-semibold text-slate-900">
        {hydrated ? user?.email ?? "No active session" : "Loading session..."}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Zustand mirrors the current Supabase-authenticated user on the client so checklist progress, dashboard data, and extension imports all stay on one account.
      </p>
    </div>
  );
}