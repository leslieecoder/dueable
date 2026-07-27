"use client";

import { create } from "zustand";
import type { AuthenticatedUser } from "@/lib/auth/user";

interface AuthStoreState {
  user: AuthenticatedUser | null;
  hydrated: boolean;
  setUser: (user: AuthenticatedUser | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) =>
    set({
      user,
      hydrated: true,
    }),
  clearUser: () =>
    set({
      user: null,
      hydrated: true,
    }),
}));