import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";
const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET;

export async function POST(req: Request) {
  if (!DASHBOARD_SECRET) {
    console.error("DASHBOARD_SECRET is not set");
    return NextResponse.json(
      { ok: false, error: "Server auth is not configured." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { email, password } = body as {
    email?: string;
    password?: string;
  };

  if (!password) {
    return NextResponse.json(
      { ok: false, error: "Password is required." },
      { status: 400 }
    );
  }

  // 🔐 For now we only validate the password against DASHBOARD_SECRET.
  // Later we can use `email` to route to the correct vendor store.
  if (password !== DASHBOARD_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const cookieStore = await cookies(); // ✅ Next 15 requires await

  cookieStore.set(COOKIE_NAME, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return NextResponse.json({ ok: true });
}