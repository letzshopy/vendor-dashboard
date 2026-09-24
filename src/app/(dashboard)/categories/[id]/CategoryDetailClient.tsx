"use client";

import {
  ArrowLeft,
  Package,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useState,
} from "react";

import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  PageHeader,
} from "@/components/ui/page-header";
import {
  Section,
} from "@/components/ui/section";
import {
  StatusBadge,
} from "@/components/ui/status-badge";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

export type CategoryDetail = {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  image?: {
    id: number;
    src: string;
  } | null;
};

export type CategoryProduct = {
  id: number;
  name: string;
  sku: string;
  status: string;
  stockStatus: string;
  image: string;
};

type JsonRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );
}

function readableStatus(
  value: string
) {
  return value
    .replace(
      /[-_]+/g,
      " "
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

export default function CategoryDetailClient({
  category,
  initialProducts,
}: {
  category: CategoryDetail;
  initialProducts:
    CategoryProduct[];
}) {
  const [
    products,
    setProducts,
  ] =
    useState(
      initialProducts
    );

  const [
    removeTarget,
    setRemoveTarget,
  ] =
    useState<CategoryProduct | null>(
      null
    );

  const [
    removingId,
    setRemovingId,
  ] =
    useState<number | null>(
      null
    );

  async function removeProduct() {
    const product =
      removeTarget;

    if (
      !product ||
      removingId !== null
    ) {
      return;
    }

    const feedbackId =
      `category-product-remove-${product.id}`;

    setRemovingId(
      product.id
    );

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Removing product…",
      message:
        product.name,
    });

    try {
      const response =
        await fetch(
          `/api/categories/${category.id}/products/${product.id}`,
          {
            method:
              "DELETE",
          }
        );

      const payload: unknown =
        await response
          .json()
          .catch(
            () => null
          );

      if (
        !response.ok
      ) {
        const message =
          isRecord(
            payload
          ) &&
          typeof payload.error ===
            "string"
            ? payload.error
            : "Could not remove product from category.";

        throw new Error(
          message
        );
      }

      setProducts(
        (
          current
        ) =>
          current.filter(
            (item) =>
              item.id !==
              product.id
          )
      );

      setRemoveTarget(
        null
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Product removed",
        message:
          product.name,
        durationMs: 2200,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not remove product",
        message:
          error instanceof
            Error
            ? error.message
            : "Could not remove product.",
        durationMs: 4200,
      });
    } finally {
      setRemovingId(
        null
      );
    }
  }

  return (
    <main className="ls-page mx-auto max-w-[1440px] pb-28 md:pb-8">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Category"
          title={
            category.name
          }
          description="Category details and assigned products."
          actions={
            <Link
              href="/categories"
              className="ls-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Categories
            </Link>
          }
        />
      </div>

      <section className="md:mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 md:px-5">
          {category.image?.src ? (
            // Remote WordPress category media URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                category.image
                  .src
              }
              alt=""
              className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Package className="h-5 w-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold text-heading md:text-xl">
              {
                category.name
              }
            </h1>

            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {
                category.slug
              }
            </p>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-xl font-extrabold text-heading">
              {
                products.length
              }
            </div>

            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Products
            </div>
          </div>
        </div>

        {category.description ? (
          <div className="border-t border-border px-4 py-3 text-sm leading-6 text-muted-foreground md:px-5">
            {
              category.description
            }
          </div>
        ) : null}
      </section>

      <Section
        title="Products"
        description="Products assigned to this category."
        surface="card"
        className="mt-5 overflow-hidden !p-0"
        contentClassName="min-w-0"
        action={
          products.length >
          0 ? (
            <span className="text-xs font-semibold text-muted-foreground">
              {
                products.length
              }
            </span>
          ) : null
        }
      >
        {products.length ===
        0 ? (
          <EmptyState
            icon={Package}
            title="No products assigned"
            description="Products added to this category will appear here."
          />
        ) : (
          <div className="divide-y divide-border">
            {products.map(
              (
                product
              ) => (
                <div
                  key={
                    product.id
                  }
                  className="flex min-h-[76px] items-center gap-3 px-4 py-3 md:px-5"
                >
                  {product.image ? (
                    // Remote WooCommerce product image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        product.image
                      }
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-[10px] font-semibold text-muted-foreground">
                      No image
                    </div>
                  )}

                  <Link
                    href={
                      `/products/${product.id}/edit`
                    }
                    className="min-w-0 flex-1"
                  >
                    <span className="block truncate text-sm font-bold text-heading hover:text-primary">
                      {
                        product.name
                      }
                    </span>

                    <span className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {product.sku ||
                          "No SKU"}
                      </span>

                      <StatusBadge
                        status={
                          product.status
                        }
                        label={readableStatus(
                          product.status
                        )}
                      />

                      <StatusBadge
                        status={
                          product.stockStatus
                        }
                        label={readableStatus(
                          product.stockStatus
                        )}
                        tone={
                          product.stockStatus ===
                          "instock"
                            ? "success"
                            : product.stockStatus ===
                                "outofstock"
                              ? "danger"
                              : "warning"
                        }
                      />
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      setRemoveTarget(
                        product
                      )
                    }
                    disabled={
                      removingId ===
                      product.id
                    }
                    aria-label={
                      `Remove ${product.name} from category`
                    }
                    title="Remove from category"
                    className="ls-focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-rose-50 hover:text-destructive disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </Section>

      <ConfirmDialog
        open={
          removeTarget !==
          null
        }
        onOpenChange={(
          open
        ) => {
          if (
            !open &&
            removingId ===
              null
          ) {
            setRemoveTarget(
              null
            );
          }
        }}
        title="Remove product?"
        description={
          removeTarget
            ? `Remove “${removeTarget.name}” from this category? The product itself will not be deleted.`
            : undefined
        }
        confirmLabel="Remove product"
        loading={
          removingId !==
          null
        }
        loadingLabel="Removing…"
        destructive
        onConfirm={
          removeProduct
        }
      />
    </main>
  );
}
