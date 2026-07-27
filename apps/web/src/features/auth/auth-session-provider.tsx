"use client";

import { useEffect } from "react";
import type { AuthenticatedUser } from "@/lib/auth/user";
import { useAuthStore } from "@/stores/auth-store";

export function AuthSessionProvider({
  initialUser,
  children,
}: {
  initialUser: AuthenticatedUser | null;
  children: React.ReactNode;
}) {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      return;
    }

    clearUser();
  }, [clearUser, initialUser, setUser]);

  return children;
}