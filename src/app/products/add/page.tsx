import { redirect } from "next/navigation";

export default function AddProductRedirect() {
  // Canonical Add Product page lives at /products/new
  redirect("/products/new");
}
