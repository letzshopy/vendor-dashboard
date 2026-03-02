// src/app/products/add/page.tsx
import { redirect } from "next/navigation";

// Tell Next: do NOT try to statically prerender this page
export const dynamic = "force-dynamic";

export default function AddProductRedirect() {
  // Canonical Add Product page lives at /products/new
  redirect("/products/new");
}
