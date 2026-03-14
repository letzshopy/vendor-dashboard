import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

export default async function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Accept any non-empty signed auth token
  if (!token || token.length < 10) {
    redirect("/signin");
  }

  return <>{children}</>;
}