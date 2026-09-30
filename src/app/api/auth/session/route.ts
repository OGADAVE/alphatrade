import { NextRequest, NextResponse } from "next/server";
import { adminAuth, isAdminConfigured } from "@/lib/firebase-admin";

const SESSION_COOKIE_NAME = "session";
const EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Server is not yet configured with Firebase Admin credentials." },
      { status: 503 },
    );
  }

  const { idToken } = (await request.json()) as { idToken?: string };
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
  }

  try {
    // Verifying first gives a clear 401 on a bad/expired token instead of
    // createSessionCookie's less specific error.
    await adminAuth().verifyIdToken(idToken);
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: EXPIRES_IN_MS });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: EXPIRES_IN_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not create a session for this token." }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
