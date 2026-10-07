import { notFound } from "next/navigation";

import ProductCreationWizard from "../../add/ProductCreationWizard";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  const productId = Number(id);

  if (
    !Number.isSafeInteger(productId) ||
    productId <= 0
  ) {
    notFound();
  }

  return (
    <ProductCreationWizard
      editProductId={productId}
    />
  );
}
