"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthActionState } from "@/features/auth/auth-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeAuthErrorMessage(message: string | undefined, mode: "login" | "signup") {
  if (!message) {
    return mode === "login"
      ? "We couldn't sign you in. Check your email and password and try again."
      : "We couldn't create your account right now. Try again in a moment.";
  }

  const lowered = message.toLowerCase();

  if (lowered.includes("invalid login") || lowered.includes("invalid credentials")) {
    return "That email or password did not match your Dueable account.";
  }

  if (lowered.includes("email not confirmed")) {
    return "Check your email to confirm your account, then come back and log in.";
  }

  if (lowered.includes("already registered") || lowered.includes("already been registered")) {
    return "That email is already connected to a Dueable account. Try logging in instead.";
  }

  if (lowered.includes("password")) {
    return mode === "login"
      ? "We couldn't sign you in. Check your password and try again."
      : "Choose a stronger password and try again.";
  }

  return mode === "login"
    ? "We couldn't sign you in right now. Try again in a moment."
    : "We couldn't create your account right now. Try again in a moment.";
}

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "student";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ") || "Student";
}

async function ensureProfile(name: string, email: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("users").upsert(
    {
      id: userId,
      name,
      email,
    },
    { onConflict: "id" },
  );

  if (result.error) {
    throw new Error(result.error.message);
  }
}

async function getAppOrigin() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");

  if (host) {
    return `${forwardedProto ?? "http"}://${host}`;
  }

  return "http://localhost:3000";
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readField(formData, "email");
  const password = readField(formData, "password");
  const next = readField(formData, "next") || "/onboarding";

  if (!email || !password) {
    return {
      status: "error",
      message: "Email and password are required.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (error || !data.user?.email) {
    return {
      status: "error",
      message: normalizeAuthErrorMessage(error?.message, "login"),
    };
  }

  await ensureProfile(
    typeof data.user.user_metadata.name === "string" && data.user.user_metadata.name.trim().length > 0
      ? data.user.user_metadata.name.trim()
      : deriveNameFromEmail(data.user.email),
    data.user.email,
    data.user.id,
  );

  redirect(next.startsWith("/") ? next : "/onboarding");
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = readField(formData, "name");
  const email = readField(formData, "email");
  const password = readField(formData, "password");

  if (!name || !email || !password) {
    return {
      status: "error",
      message: "Name, email, and password are required.",
    };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "Password must be at least 8 characters.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const normalizedEmail = email.toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    return {
      status: "error",
      message: normalizeAuthErrorMessage(error.message, "signup"),
    };
  }

  if (data.session && data.user?.id) {
    await ensureProfile(name, normalizedEmail, data.user.id);
  }

  if (!data.session) {
    return {
      status: "success",
      message: "Check your email to confirm your account, then log in.",
    };
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = readField(formData, "next") || "/onboarding";
  const supabase = await createSupabaseServerClient();
  const origin = await getAppOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next.startsWith("/") ? next : "/onboarding")}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    throw new Error(error?.message ?? "Unable to start Google sign-in.");
  }

  redirect(data.url);
}