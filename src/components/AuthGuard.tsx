import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "ls_vendor_auth";

export default async function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies(); // ✅ Next 15 requires await
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token !== "ok") {
    redirect("/signin"); // keep your existing signin route
  }

  return <>{children}</>;
}
