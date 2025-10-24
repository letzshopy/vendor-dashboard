// src/app/products/[id]/page.tsx
import { redirect } from "next/navigation";

export default function ProductDetailRedirect({ params }: { params: { id: string } }) {
  // send through a flag so Edit can optionally show a "Back to Products" link etc.
  redirect(`/products/${params.id}/edit?mode=detail`);
}
