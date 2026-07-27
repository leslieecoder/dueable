import { cookies } from "next/headers";

export const MOCK_SESSION_COOKIE = "dueable-mock-session";

export interface MockSessionUser {
  id: string;
  name: string;
  email: string;
}

function encodeSession(user: MockSessionUser) {
  return encodeURIComponent(JSON.stringify(user));
}

function decodeSession(value: string): MockSessionUser | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<MockSessionUser>;

    if (!parsed.id || !parsed.name || !parsed.email) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export function parseMockSessionCookie(value: string | undefined) {
  if (!value) {
    return null;
  }

  return decodeSession(value);
}

export async function getMockSessionUser() {
  const cookieStore = await cookies();
  return parseMockSessionCookie(cookieStore.get(MOCK_SESSION_COOKIE)?.value);
}

export async function setMockSessionUser(user: MockSessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearMockSessionUser() {
  const cookieStore = await cookies();
  cookieStore.delete(MOCK_SESSION_COOKIE);
}