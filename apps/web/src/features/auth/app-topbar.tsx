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
    <header className="dueable-soft-panel flex flex-col gap-4 rounded-[24px] p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-12 w-12 rounded-full border border-slate-200 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#1dc9b2,_#2d6cdf)] text-sm font-semibold text-white">
            {getInitials(user.name)}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2d6cdf]">Profile</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{user.name}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      <SignOutButton />
    </header>
  );
}