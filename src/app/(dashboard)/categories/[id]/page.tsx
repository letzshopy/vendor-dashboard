import { notFound } from "next/navigation";

import { getWooClient } from "@/lib/woo";
import CategoryDetailClient, {
  type CategoryDetail,
  type CategoryProduct,
} from "./CategoryDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function categoryDetail(value: unknown): CategoryDetail | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const image = isRecord(value.image) ? value.image : null;
  const imageId = Number(image?.id || 0);
  const imageUrl = typeof image?.src === "string" ? image.src : "";

  return {
    id,
    name: typeof value.name === "string" ? value.name : "",
    slug: typeof value.slug === "string" ? value.slug : "",
    description: typeof value.description === "string" ? value.description : "",
    count: Math.max(0, Number(value.count) || 0),
    image:
      Number.isSafeInteger(imageId) && imageId > 0 && imageUrl
        ? { id: imageId, src: imageUrl }
        : null,
  };
}

function productSummary(value: unknown): CategoryProduct | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const images = Array.isArray(value.images) ? value.images : [];
  const firstImage = images.find(isRecord);

  return {
    id,
    name: typeof value.name === "string" ? value.name : "",
    sku: typeof value.sku === "string" ? value.sku : "",
    status: typeof value.status === "string" ? value.status : "",
    stockStatus: typeof value.stock_status === "string" ? value.stock_status : "",
    image:
      firstImage && typeof firstImage.src === "string" ? firstImage.src : "",
  };
}

async function loadProducts(categoryId: number): Promise<CategoryProduct[]> {
  const woo = await getWooClient();
  const products: CategoryProduct[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const response = await woo.get("/products", {
      params: {
        category: categoryId,
        page,
        per_page: 100,
        status: "any",
        orderby: "title",
        order: "asc",
        _fields: "id,name,sku,status,stock_status,images",
      },
    });
    const rows = Array.isArray(response.data) ? response.data : [];

    products.push(
      ...rows.flatMap((value) => {
        const product = productSummary(value);
        return product ? [product] : [];
      }),
    );

    if (rows.length < 100) break;
  }

  return products;
}

export const dynamic = "force-dynamic";

export default async function CategoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const categoryId = Number(id);

  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) notFound();

  try {
    const woo = await getWooClient();
    const [categoryResponse, products] = await Promise.all([
      woo.get(`/products/categories/${categoryId}`),
      loadProducts(categoryId),
    ]);
    const category = categoryDetail(categoryResponse.data);

    if (!category) notFound();

    return (
      <CategoryDetailClient category={category} initialProducts={products} />
    );
  } catch {
    notFound();
  }
}
