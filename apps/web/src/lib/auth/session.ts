import { redirect } from "next/navigation";
import { cache } from "react";
import type { AuthenticatedUser } from "@/lib/auth/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readAuthName(authUser: { email?: string; user_metadata: Record<string, unknown> }) {
  const fullName = authUser.user_metadata.full_name;
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  const displayName = authUser.user_metadata.name;
  if (typeof displayName === "string" && displayName.trim().length > 0) {
    return displayName.trim();
  }

  return authUser.email?.split("@")[0] ?? "Student";
}

function readAuthAvatar(authUser: { user_metadata: Record<string, unknown> }) {
  const avatarUrl = authUser.user_metadata.avatar_url;
  if (typeof avatarUrl === "string" && avatarUrl.trim().length > 0) {
    return avatarUrl.trim();
  }

  const picture = authUser.user_metadata.picture;
  if (typeof picture === "string" && picture.trim().length > 0) {
    return picture.trim();
  }

  return null;
}

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return null;
  }

  const authName = readAuthName(authUser);
  const avatarUrl = readAuthAvatar(authUser);

  const profileResult = await supabase.from("users").select("id, name, email").eq("id", authUser.id).maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (profileResult.data) {
    return {
      ...profileResult.data,
      name: profileResult.data.name || authName,
      avatarUrl,
    } satisfies AuthenticatedUser;
  }

  const createdProfile = await supabase
    .from("users")
    .insert({
      id: authUser.id,
      email: authUser.email,
      name: authName,
    })
    .select("id, name, email")
    .single();

  if (createdProfile.error) {
    throw new Error(createdProfile.error.message);
  }

  return {
    ...createdProfile.data,
    avatarUrl,
  } satisfies AuthenticatedUser;
});

export async function hasImportedAssignments(userId: string) {
  const supabase = await createSupabaseServerClient();

  const courseResult = await supabase.from("courses").select("id").eq("user_id", userId);

  if (courseResult.error) {
    throw new Error(courseResult.error.message);
  }

  const courseIds = (courseResult.data ?? []).map((course) => course.id);

  if (courseIds.length === 0) {
    return false;
  }

  const assignmentResult = await supabase.from("assignments").select("id").in("course_id", courseIds).limit(1);

  if (assignmentResult.error) {
    throw new Error(assignmentResult.error.message);
  }

  return (assignmentResult.data?.length ?? 0) > 0;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}