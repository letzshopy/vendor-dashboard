// src/lib/auth.ts
import { cookies } from "next/headers";

const COOKIE = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

export function isAuthed() {
  // In Next 15 the typings can show cookies() as Promise-like.
  // At runtime this behaves like a cookie store with .get(), so we cast.
  const store = cookies() as unknown as {
    get: (name: string) => { value?: string } | undefined;
  };

  const token = store.get(COOKIE)?.value;
  return Boolean(token && token === "ok");
}
