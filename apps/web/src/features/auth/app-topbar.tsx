import type { AuthenticatedUser } from "@/lib/auth/user";
import { SignOutButton } from "@/features/auth/sign-out-button";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function AppTopbar({ user }: { user: AuthenticatedUser }) {
  return (
    <header className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-12 w-12 rounded-full border border-slate-200 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
            {getInitials(user.name)}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Profile</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{user.name}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      <SignOutButton />
    </header>
  );
}