import { cookies } from "next/headers";

const COOKIE = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

export function isAuthed() {
  const store = cookies();
  const token = store.get(COOKIE)?.value;
  return Boolean(token && token === "ok");
}
