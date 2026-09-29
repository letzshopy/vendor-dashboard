"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import ImageUploader, {
  type MediaUploadResult,
} from "@/components/ImageUploader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { optimizeContentImageForUpload } from "@/lib/clientImageOptimizer";
import {
  LETZSHOPY_NATIVE_BACK_EVENT,
} from "@/lib/nativeNavigation";
import { productContentText } from "@/lib/productContentText";
import { actionFeedback } from "@/lib/actionFeedback";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  FolderTree,
  GripVertical,
  Hash,
  ImagePlus,
  IndianRupee,
  Layers3,
  Loader2,
  Package2,
  Palette,
  Plus,
  Ruler,
  Save,
  Search,
  Send,
  Tag,
  Trash2,
  Truck,
  UploadCloud,
  X,
} from "lucide-react";

type Category = {
  id: number;
  name: string;
  parent: number;
};

type ProductType =
  | "simple"
  | "variable-size"
  | "variable-colour";

type WizardScreen =
  | "category"
  | "type"
  | "identity"
  | "description"
  | "shared-images"
  | "simple-price-stock"
  | "size-variations"
  | "colour-variations"
  | "colour-images"
  | "shipping"
  | "publish";

type LocalPhoto = {
  id: string;
  name: string;
  url: string;
  file?: File;
  mediaId?: number;
  existing?: boolean;
};

type VariationRow = {
  id: string;
  variationId?: number;
  option: string;
  price: string;
  quantity: string;
  photos: LocalPhoto[];
};

type JsonRecord = Record<string, unknown>;

type UploadedColourGallery = {
  rowId: string;
  option: string;
  imageIds: number[];
};

type GuidedSection =
  | "type"
  | "info"
  | "variations"
  | "photos"
  | "pricing"
  | "description"
  | "extra"
  | "review";

type ProductSuccess = {
  kind: "created" | "updated";
  productId: number;
  productName: string;
  status: "draft" | "publish";
};

function guidedOrder(
  productType: ProductType | null
): GuidedSection[] {
  if (productType === "simple") {
    return [
      "type",
      "info",
      "photos",
      "pricing",
      "description",
      "extra",
      "review",
    ];
  }

  if (
    productType === "variable-size" ||
    productType === "variable-colour"
  ) {
    return [
      "type",
      "info",
      "variations",
      "photos",
      "description",
      "extra",
      "review",
    ];
  }

  return ["type", "info"];
}

const SIMPLE_FLOW: WizardScreen[] = [
  "category",
  "type",
  "identity",
  "description",
  "shared-images",
  "simple-price-stock",
  "shipping",
  "publish",
];

const SIZE_FLOW: WizardScreen[] = [
  "category",
  "type",
  "identity",
  "description",
  "size-variations",
  "shared-images",
  "shipping",
  "publish",
];

const COLOUR_FLOW: WizardScreen[] = [
  "category",
  "type",
  "identity",
  "description",
  "colour-variations",
  "colour-images",
  "shipping",
  "publish",
];

const productTypes: {
  id: ProductType;
  title: string;
  label: string;
  icon: typeof Package2;
  iconClass: string;
  selectedClass: string;
}[] = [
  {
    id: "simple",
    title: "Simple product",
    label: "One price and stock",
    icon: Package2,
    iconClass: "bg-[#DDE8FF] text-[#315DA8]",
    selectedClass: "border-[#5366B7] bg-[#F0F3FF]",
  },
  {
    id: "variable-size",
    title: "Size variations",
    label: "Size choices only",
    icon: Ruler,
    iconClass: "bg-[#E5DCF8] text-[#6949A5]",
    selectedClass: "border-[#7A62B7] bg-[#F5F1FF]",
  },
  {
    id: "variable-colour",
    title: "Colour variations",
    label: "Colour choices only",
    icon: Palette,
    iconClass: "bg-[#FFE0D9] text-[#B24737]",
    selectedClass: "border-[#18A6C9] bg-[#EAF8FC]",
  },
];

const commonSizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function parseCategories(value: unknown): Category[] {
  if (!isRecord(value) || !Array.isArray(value.categories)) {
    return [];
  }

  return value.categories.flatMap((item) => {
    if (!isRecord(item)) return [];

    const id = Number(item.id);
    const parent = Number(item.parent ?? 0);
    const name =
      typeof item.name === "string"
        ? item.name.trim()
        : "";

    if (!Number.isFinite(id) || !name) return [];

    return [
      {
        id,
        name,
        parent: Number.isFinite(parent) ? parent : 0,
      },
    ];
  });
}

function parseCreatedCategory(
  value: unknown
): Category | null {
  if (
    !isRecord(value) ||
    !isRecord(value.category)
  ) {
    return null;
  }

  const id = Number(value.category.id);
  const parent = Number(
    value.category.parent ?? 0
  );
  const name =
    typeof value.category.name === "string"
      ? value.category.name.trim()
      : "";

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !name
  ) {
    return null;
  }

  return {
    id,
    name,
    parent:
      Number.isSafeInteger(parent) &&
      parent >= 0
        ? parent
        : 0,
  };
}

function flowFor(productType: ProductType | null): WizardScreen[] {
  if (productType === "variable-size") return SIZE_FLOW;
  if (productType === "variable-colour") return COLOUR_FLOW;
  return SIMPLE_FLOW;
}

function skuPart(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function variationSku(baseSku: string, option: string): string {
  const base = skuPart(baseSku);
  const suffix = skuPart(option);

  if (!base || !suffix) return "";
  return `${base}-${suffix}`;
}

function priceIsValid(value: string): boolean {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) && number > 0;
}

function quantityIsValid(value: string): boolean {
  const number = Number(value);
  return (
    value.trim() !== "" &&
    Number.isInteger(number) &&
    number >= 0
  );
}

function formatPrice(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  return `₹${number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function screenMeta(
  screen: WizardScreen,
  productType: ProductType | null
): {
  title: string;
  subtitle: string;
  icon: typeof Package2;
} {
  switch (screen) {
    case "category":
      return {
        title: "Choose product category",
        subtitle: "Select where this product belongs",
        icon: FolderTree,
      };
    case "type":
      return {
        title: "Choose product type",
        subtitle: "Select how this product will be sold",
        icon: Layers3,
      };
    case "identity":
      return {
        title: "Add product identity",
        subtitle: "Give this product a clear name and code",
        icon: Package2,
      };
    case "description":
      return {
        title: "Describe your product",
        subtitle: "Add the information customers need",
        icon: FileText,
      };
    case "shared-images":
      return {
        title:
          productType === "variable-size"
            ? "Add shared product photos"
            : "Add product photos",
        subtitle:
          productType === "variable-size"
            ? "These photos apply to every size"
            : "Choose the images customers will see",
        icon: ImagePlus,
      };
    case "simple-price-stock":
      return {
        title: "Set price and quantity",
        subtitle: "Enter the selling price and available stock",
        icon: IndianRupee,
      };
    case "size-variations":
      return {
        title: "Set size variations",
        subtitle: "Add each size with price and quantity",
        icon: Ruler,
      };
    case "colour-variations":
      return {
        title: "Set colour variations",
        subtitle: "Add each colour with price and quantity",
        icon: Palette,
      };
    case "colour-images":
      return {
        title: "Add colour images",
        subtitle: "Choose multiple images for each colour",
        icon: ImagePlus,
      };
    case "shipping":
      return {
        title: "Shipping and product details",
        subtitle: "Add weight, dimensions, tags and attributes",
        icon: Truck,
      };
    case "publish":
      return {
        title: "Review and create",
        subtitle: "Choose status and storefront visibility",
        icon: Send,
      };
  }
}

export default function ProductCreationWizard({
  editProductId,
}: {
  editProductId?: number;
} = {}) {
  const router = useRouter();
  const editMode = Number.isSafeInteger(editProductId) && Number(editProductId) > 0;

  const [step, setStep] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [createdCategories, setCreatedCategories] =
    useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<number | null>(null);
  const [selectedProductType, setSelectedProductType] =
    useState<ProductType | null>(null);

  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [originalSku, setOriginalSku] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [originalShortDescription, setOriginalShortDescription] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");
  const [shortDescriptionEdited, setShortDescriptionEdited] = useState(false);
  const [descriptionEdited, setDescriptionEdited] = useState(false);

  const [regularPrice, setRegularPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");

  const [weight, setWeight] = useState("");
  const [dimensionsEnabled, setDimensionsEnabled] =
    useState(false);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [color, setColor] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [localPhotos, setLocalPhotos] =
    useState<LocalPhoto[]>([]);
  const photoInputRef =
    useRef<HTMLInputElement | null>(null);
  const photoUrlsRef = useRef<string[]>([]);
  const draggedPhotoIdRef =
    useRef<string | null>(null);
  const [draggedPhotoId, setDraggedPhotoId] =
    useState<string | null>(null);

  const [sizeInput, setSizeInput] = useState("");
  const [sizeRows, setSizeRows] =
    useState<VariationRow[]>([]);
  const [colourInput, setColourInput] = useState("");
  const [colourRows, setColourRows] =
    useState<VariationRow[]>([]);
  const variationPhotoUrlsRef = useRef<string[]>([]);
  const draggedVariationPhotoRef = useRef<{
    rowId: string;
    photoId: string;
  } | null>(null);
  const [draggedVariationPhoto, setDraggedVariationPhoto] =
    useState<{
      rowId: string;
      photoId: string;
    } | null>(null);

  const [status, setStatus] =
    useState<"draft" | "publish">("publish");
  const [visibility, setVisibility] =
    useState<"visible" | "hidden">("visible");

  const [query, setQuery] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] =
    useState(0);
  const [newCategoryImage, setNewCategoryImage] =
    useState<MediaUploadResult | null>(null);
  const [categoryCreateOpen, setCategoryCreateOpen] =
    useState(false);

  const [openSection, setOpenSection] =
    useState<GuidedSection>(editMode ? "info" : "type");
  const [unlockedSections, setUnlockedSections] =
    useState<GuidedSection[]>(editMode ? ["type", "info"] : ["type"]);
  const [sharedVariationPrice, setSharedVariationPrice] =
    useState("");
  const [activeColourPhotoRowId, setActiveColourPhotoRowId] =
    useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [successResult, setSuccessResult] =
    useState<ProductSuccess | null>(null);
  const pendingLeaveRef = useRef<
    | { kind: "back" }
    | { kind: "href"; href: string }
    | null
  >(null);
  const bypassLeaveRef = useRef(false);
  const baselineRef = useRef("");
  const [baselineReady, setBaselineReady] =
    useState(false);
  const requestedStatusRef = useRef<
    "draft" | "publish" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [confirmation, setConfirmation] =
    useState<string | null>(null);
  const [skuChecking, setSkuChecking] = useState(false);
  const [skuTaken, setSkuTaken] = useState(false);
  const [skuCheckError, setSkuCheckError] =
    useState<string | null>(null);
  const [categoryCreating, setCategoryCreating] =
    useState(false);
  const [categoryCreateError, setCategoryCreateError] =
    useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editLoading, setEditLoading] = useState(editMode);
  const [editLoadError, setEditLoadError] = useState<string | null>(null);
  const [originalVariationIds, setOriginalVariationIds] = useState<number[]>([]);
  const [submitError, setSubmitError] =
    useState<string | null>(null);
  const [submitStage, setSubmitStage] =
    useState<string | null>(null);

  useEffect(() => {
    if (
      !submitting ||
      !submitStage
    ) {
      return;
    }

    actionFeedback.loading({
      id: editMode ? "product-update" : "product-create",
      title: editMode ? "Updating product" : "Creating product",
      message: submitStage,
    });
  }, [
    submitting,
    submitStage,
    editMode,
  ]);

  const flow = useMemo(
    () => flowFor(selectedProductType),
    [selectedProductType]
  );
  const totalSteps = flow.length;
  const currentScreen =
    flow[Math.min(step - 1, flow.length - 1)];
  const meta = screenMeta(currentScreen, selectedProductType);
  const HeaderIcon = meta.icon;

  const desktopExpandedScreen =
    currentScreen === "size-variations" ||
    currentScreen === "colour-variations" ||
    currentScreen === "colour-images";

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        setLoading(true);
        setLoadError(null);

        const response = await fetch("/api/categories/list", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const json: unknown = await response.json();

        if (!response.ok) {
          throw new Error("Unable to load categories.");
        }

        setCategories(parseCategories(json));
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load categories."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCategories();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!editMode || !editProductId) {
      setEditLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadProductForEdit() {
      try {
        setEditLoading(true);
        setEditLoadError(null);

        const productResponse = await fetch(
          `/api/products/${editProductId}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const productJson: unknown =
          await productResponse.json();

        if (
          !productResponse.ok ||
          !isRecord(productJson)
        ) {
          throw new Error(
            "Unable to load this product for editing."
          );
        }

        const productType =
          typeof productJson.type === "string"
            ? productJson.type
            : "";

        if (
          productType !== "simple" &&
          productType !== "variable"
        ) {
          throw new Error(
            "This product type cannot be edited in the product wizard yet."
          );
        }

        const attributes =
          Array.isArray(productJson.attributes)
            ? productJson.attributes.filter(isRecord)
            : [];

        const colourAttribute =
          attributes.find((attribute) => {
            const name =
              typeof attribute.name === "string"
                ? attribute.name.trim().toLowerCase()
                : "";
            const slug =
              typeof attribute.slug === "string"
                ? attribute.slug.trim().toLowerCase()
                : "";

            return (
              attribute.variation === true &&
              (
                name === "colour" ||
                name === "color" ||
                slug.includes("colour") ||
                slug.includes("color")
              )
            );
          });

        const nextProductType: ProductType =
          productType === "simple"
            ? "simple"
            : colourAttribute
              ? "variable-colour"
              : "variable-size";

        const categoryIds =
          Array.isArray(productJson.category_ids)
            ? productJson.category_ids
            : [];

        const firstCategoryId =
          Number(categoryIds[0] ?? 0);

        setSelectedCategoryId(
          Number.isSafeInteger(firstCategoryId) &&
            firstCategoryId > 0
            ? firstCategoryId
            : null
        );
        setSelectedProductType(nextProductType);

        setProductName(
          typeof productJson.name === "string"
            ? productJson.name
            : ""
        );

        const loadedSku =
          typeof productJson.sku === "string"
            ? productJson.sku
            : "";

        setSku(loadedSku);
        setOriginalSku(loadedSku);

        const loadedShortDescription =
          typeof productJson.short_description === "string"
            ? productJson.short_description
            : "";
        const loadedDescription =
          typeof productJson.description === "string"
            ? productJson.description
            : "";

        setOriginalShortDescription(loadedShortDescription);
        setOriginalDescription(loadedDescription);
        setShortDescription(productContentText(loadedShortDescription));
        setDescription(productContentText(loadedDescription));
        setShortDescriptionEdited(false);
        setDescriptionEdited(false);
        setRegularPrice(
          typeof productJson.regular_price === "string"
            ? productJson.regular_price
            : typeof productJson.price === "string"
              ? productJson.price
              : ""
        );
        setStockQuantity(
          productJson.stock_quantity === null ||
          productJson.stock_quantity === undefined
            ? "0"
            : String(productJson.stock_quantity)
        );
        setWeight(
          typeof productJson.weight === "string"
            ? productJson.weight
            : ""
        );

        const dimensions =
          isRecord(productJson.dimensions)
            ? productJson.dimensions
            : null;

        const nextLength =
          dimensions &&
          typeof dimensions.length === "string"
            ? dimensions.length
            : "";
        const nextWidth =
          dimensions &&
          typeof dimensions.width === "string"
            ? dimensions.width
            : "";
        const nextHeight =
          dimensions &&
          typeof dimensions.height === "string"
            ? dimensions.height
            : "";

        setLength(nextLength);
        setWidth(nextWidth);
        setHeight(nextHeight);
        setDimensionsEnabled(
          Boolean(
            nextLength ||
            nextWidth ||
            nextHeight
          )
        );

        setColor(
          typeof productJson.color === "string"
            ? productJson.color
            : ""
        );

        setTags(
          Array.isArray(productJson.tags)
            ? productJson.tags.flatMap((item) => {
                if (
                  !isRecord(item) ||
                  typeof item.name !== "string"
                ) {
                  return [];
                }

                const name =
                  item.name.trim();

                return name ? [name] : [];
              })
            : []
        );

        setStatus(
          productJson.status === "publish"
            ? "publish"
            : "draft"
        );
        setVisibility(
          productJson.catalog_visibility === "hidden"
            ? "hidden"
            : "visible"
        );

        const existingProductPhotos: LocalPhoto[] =
          Array.isArray(productJson.image_objects)
            ? productJson.image_objects.flatMap(
                (item, index) => {
                  if (!isRecord(item)) return [];

                  const id = Number(item.id);
                  const url =
                    typeof item.src === "string"
                      ? item.src
                      : "";

                  if (
                    !Number.isSafeInteger(id) ||
                    id <= 0 ||
                    !url
                  ) {
                    return [];
                  }

                  return [{
                    id: `existing-product-${id}-${index}`,
                    name:
                      typeof item.name === "string" &&
                      item.name.trim()
                        ? item.name
                        : `Product image ${index + 1}`,
                    url,
                    mediaId: id,
                    existing: true,
                  }];
                }
              ).slice(0, 5)
            : [];

        setLocalPhotos(existingProductPhotos);

        if (nextProductType === "simple") {
          setSizeRows([]);
          setColourRows([]);
          setOriginalVariationIds([]);
          return;
        }

        const variationsResponse =
          await fetch(
            `/api/products/${editProductId}/variations`,
            {
              method: "GET",
              cache: "no-store",
              signal: controller.signal,
            }
          );

        const variationsJson: unknown =
          await variationsResponse.json();

        if (
          !variationsResponse.ok ||
          !isRecord(variationsJson)
        ) {
          throw new Error(
            "Unable to load product variations."
          );
        }

        const rawVariations =
          Array.isArray(variationsJson.variations)
            ? variationsJson.variations.filter(isRecord)
            : [];

        const variationIds =
          rawVariations.flatMap((variation) => {
            const id = Number(variation.id);
            return Number.isSafeInteger(id) && id > 0
              ? [id]
              : [];
          });

        setOriginalVariationIds(variationIds);

        let galleryByVariation =
          new Map<number, LocalPhoto[]>();

        if (
          nextProductType === "variable-colour" &&
          variationIds.length > 0
        ) {
          try {
            const galleriesResponse =
              await fetch(
                `/api/products/${editProductId}/variation-galleries`,
                {
                  method: "GET",
                  cache: "no-store",
                  signal: controller.signal,
                }
              );

            const galleriesJson: unknown =
              await galleriesResponse.json();

            if (
              galleriesResponse.ok &&
              isRecord(galleriesJson) &&
              Array.isArray(galleriesJson.galleries)
            ) {
              galleryByVariation =
                new Map(
                  galleriesJson.galleries.flatMap(
                    (gallery) => {
                      if (!isRecord(gallery)) {
                        return [];
                      }

                      const variationId =
                        Number(gallery.variation_id);

                      if (
                        !Number.isSafeInteger(variationId) ||
                        variationId <= 0
                      ) {
                        return [];
                      }

                      const photos: LocalPhoto[] =
                        Array.isArray(gallery.images)
                          ? gallery.images.flatMap(
                              (image, index) => {
                                if (!isRecord(image)) {
                                  return [];
                                }

                                const mediaId =
                                  Number(image.id);
                                const url =
                                  typeof image.url === "string"
                                    ? image.url
                                    : "";

                                if (
                                  !Number.isSafeInteger(mediaId) ||
                                  mediaId <= 0 ||
                                  !url
                                ) {
                                  return [];
                                }

                                return [{
                                  id: `existing-colour-${variationId}-${mediaId}-${index}`,
                                  name:
                                    typeof image.alt === "string" &&
                                    image.alt.trim()
                                      ? image.alt
                                      : `Colour image ${index + 1}`,
                                  url,
                                  mediaId,
                                  existing: true,
                                }];
                              }
                            ).slice(0, 3)
                          : [];

                      return [[variationId, photos] as const];
                    }
                  )
                );
            }
          } catch {
            galleryByVariation =
              new Map<number, LocalPhoto[]>();
          }
        }

        const mappedRows: VariationRow[] =
          rawVariations.flatMap(
            (variation, index) => {
              const variationId =
                Number(variation.id);

              if (
                !Number.isSafeInteger(variationId) ||
                variationId <= 0
              ) {
                return [];
              }

              const variationAttributes =
                Array.isArray(variation.attributes)
                  ? variation.attributes.filter(isRecord)
                  : [];

              const optionEntry =
                variationAttributes.find(
                  (attribute) =>
                    typeof attribute.option === "string" &&
                    attribute.option.trim()
                );

              const option =
                optionEntry &&
                typeof optionEntry.option === "string"
                  ? optionEntry.option.trim()
                  : `Option ${index + 1}`;

              let photos =
                galleryByVariation.get(variationId) || [];

              if (
                nextProductType === "variable-colour" &&
                photos.length === 0 &&
                isRecord(variation.image)
              ) {
                const mediaId =
                  Number(variation.image.id);
                const url =
                  typeof variation.image.src === "string"
                    ? variation.image.src
                    : "";

                if (
                  Number.isSafeInteger(mediaId) &&
                  mediaId > 0 &&
                  url
                ) {
                  photos = [{
                    id: `existing-colour-main-${variationId}-${mediaId}`,
                    name: option,
                    url,
                    mediaId,
                    existing: true,
                  }];
                }
              }

              return [{
                id: `edit-variation-${variationId}`,
                variationId,
                option,
                price:
                  typeof variation.regular_price === "string" &&
                  variation.regular_price.trim()
                    ? variation.regular_price
                    : typeof variation.price === "string"
                      ? variation.price
                      : "",
                quantity:
                  variation.stock_quantity === null ||
                  variation.stock_quantity === undefined
                    ? "0"
                    : String(variation.stock_quantity),
                photos:
                  nextProductType === "variable-colour"
                    ? photos
                    : [],
              }];
            }
          );

        if (nextProductType === "variable-colour") {
          setColourRows(mappedRows);
          setSizeRows([]);
        } else {
          setSizeRows(mappedRows);
          setColourRows([]);
        }
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setEditLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load this product for editing."
        );
      } finally {
        if (!controller.signal.aborted) {
          setEditLoading(false);
        }
      }
    }

    void loadProductForEdit();

    return () => controller.abort();
  }, [
    editMode,
    editProductId,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function ensureDefaultVariationAttributes() {
      try {
        const response = await fetch(
          "/api/attributes/create",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              preset: "color-size",
            }),
            signal: controller.signal,
          }
        );

        const raw = await response.text();
        let value: unknown = {};

        if (raw.trim()) {
          try {
            value = JSON.parse(raw);
          } catch {
            value = {};
          }
        }

        const json =
          isRecord(value) ? value : {};

        if (!response.ok) {
          const message =
            typeof json.error === "string"
              ? json.error
              : "Unable to prepare default Size and Colour attributes.";

          throw new Error(message);
        }
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Default Size and Colour attribute setup failed.",
          error
        );
      }
    }

    void ensureDefaultVariationAttributes();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const normalizedSku = sku.trim();

    if (
      editMode &&
      normalizedSku &&
      normalizedSku === originalSku.trim()
    ) {
      setSkuChecking(false);
      setSkuTaken(false);
      setSkuCheckError(null);
      return;
    }

    if (!normalizedSku) {
      setSkuChecking(false);
      setSkuTaken(false);
      setSkuCheckError(null);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setSkuChecking(true);
        setSkuTaken(false);
        setSkuCheckError(null);

        const response = await fetch(
          `/api/products/sku-check?sku=${encodeURIComponent(
            normalizedSku
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const json: unknown = await response.json();

        if (!response.ok || !isRecord(json)) {
          throw new Error("Unable to check SKU availability.");
        }

        setSkuTaken(json.exists === true);
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setSkuTaken(false);
        setSkuCheckError(
          error instanceof Error
            ? error.message
            : "Unable to check SKU availability."
        );
      } finally {
        if (!controller.signal.aborted) {
          setSkuChecking(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    sku,
    editMode,
    originalSku,
  ]);

  useEffect(() => {
    return () => {
      photoUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      variationPhotoUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const allCategories = useMemo(
    () =>
      [...categories, ...createdCategories].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [categories, createdCategories]
  );

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return [];

    return allCategories
      .filter((category) =>
        category.name.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 6);
  }, [allCategories, query]);

  const selectedCategory = useMemo(
    () =>
      allCategories.find(
        (category) => category.id === selectedCategoryId
      ) ?? null,
    [allCategories, selectedCategoryId]
  );

  const selectedTypeDetails = useMemo(
    () =>
      productTypes.find(
        (productType) =>
          productType.id === selectedProductType
      ) ?? null,
    [selectedProductType]
  );

  const variableProduct =
    selectedProductType === "variable-size" ||
    selectedProductType === "variable-colour";

  const identityIsValid =
    productName.trim().length >= 2 &&
    (!variableProduct || sku.trim().length >= 2) &&
    !skuChecking &&
    !skuTaken &&
    !skuCheckError;

  const dimensionsAreValid =
    !dimensionsEnabled ||
    [length, width, height].every((value) => {
      const number = Number(value);
      return (
        value.trim() !== "" &&
        Number.isFinite(number) &&
        number > 0
      );
    });

  const shippingIsValid =
    weight.trim() !== "" &&
    Number.isFinite(Number(weight)) &&
    Number(weight) > 0 &&
    dimensionsAreValid;

  const sizeVariationsAreValid =
    sizeRows.length > 0 &&
    sizeRows.every(
      (row) =>
        priceIsValid(row.price) &&
        quantityIsValid(row.quantity)
    );

  const colourVariationsAreValid =
    colourRows.length > 0 &&
    colourRows.every(
      (row) =>
        priceIsValid(row.price) &&
        quantityIsValid(row.quantity)
    );

  const colourImagesAreValid =
    colourRows.length > 0 &&
    colourRows.every((row) => row.photos.length > 0);

  const canContinue = (() => {
    switch (currentScreen) {
      case "category":
        return selectedCategory !== null;
      case "type":
        return selectedProductType !== null;
      case "identity":
        return identityIsValid;
      case "description":
        return shortDescription.trim().length >= 5;
      case "shared-images":
        return localPhotos.length > 0;
      case "simple-price-stock":
        return (
          priceIsValid(regularPrice) &&
          quantityIsValid(stockQuantity)
        );
      case "size-variations":
        return sizeVariationsAreValid;
      case "colour-variations":
        return colourVariationsAreValid;
      case "colour-images":
        return colourImagesAreValid;
      case "shipping":
        return shippingIsValid;
      case "publish":
        return true;
    }
  })();

  const guidedFingerprint = useMemo(
    () =>
      JSON.stringify({
        selectedCategoryId,
        selectedProductType,
        productName,
        sku,
        shortDescription,
        description,
        regularPrice,
        stockQuantity,
        weight,
        dimensionsEnabled,
        length,
        width,
        height,
        color,
        tags,
        localPhotos: localPhotos.map((photo) => ({
          id: photo.id,
          mediaId: photo.mediaId || null,
          name: photo.name,
        })),
        sizeRows: sizeRows.map((row) => ({
          id: row.id,
          option: row.option,
          price: row.price,
          quantity: row.quantity,
          variationId: row.variationId || null,
        })),
        colourRows: colourRows.map((row) => ({
          id: row.id,
          option: row.option,
          price: row.price,
          quantity: row.quantity,
          variationId: row.variationId || null,
          photos: row.photos.map((photo) => ({
            id: photo.id,
            mediaId: photo.mediaId || null,
            name: photo.name,
          })),
        })),
        status,
        visibility,
      }),
    [
      selectedCategoryId,
      selectedProductType,
      productName,
      sku,
      shortDescription,
      description,
      regularPrice,
      stockQuantity,
      weight,
      dimensionsEnabled,
      length,
      width,
      height,
      color,
      tags,
      localPhotos,
      sizeRows,
      colourRows,
      status,
      visibility,
    ]
  );

  useEffect(() => {
    if (editLoading || baselineReady) {
      return;
    }

    baselineRef.current = guidedFingerprint;
    setBaselineReady(true);
  }, [
    editLoading,
    baselineReady,
    guidedFingerprint,
  ]);

  const hasUnsavedProductChanges =
    baselineReady &&
    guidedFingerprint !== baselineRef.current &&
    successResult === null;

  useEffect(() => {
    function onBeforeUnload(
      event: BeforeUnloadEvent
    ) {
      if (!hasUnsavedProductChanges) return;

      event.preventDefault();
      event.returnValue = "";
    }

    function onNativeBack(event: Event) {
      if (
        !hasUnsavedProductChanges ||
        bypassLeaveRef.current
      ) {
        return;
      }

      event.preventDefault();
      pendingLeaveRef.current = {
        kind: "back",
      };
      setDiscardOpen(true);
    }

    function onLinkClick(event: MouseEvent) {
      if (
        !hasUnsavedProductChanges ||
        bypassLeaveRef.current ||
        event.defaultPrevented ||
        event.button !== 0
      ) {
        return;
      }

      const target =
        event.target as HTMLElement | null;
      const anchor =
        target?.closest("a[href]") as
          | HTMLAnchorElement
          | null;

      if (
        !anchor ||
        (anchor.target &&
          anchor.target !== "_self")
      ) {
        return;
      }

      let url: URL;

      try {
        url = new URL(
          anchor.href,
          window.location.href
        );
      } catch {
        return;
      }

      if (
        url.origin !== window.location.origin
      ) {
        return;
      }

      const current =
        new URL(window.location.href);

      if (
        url.pathname === current.pathname &&
        url.search === current.search &&
        url.hash === current.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      pendingLeaveRef.current = {
        kind: "href",
        href:
          url.pathname +
          url.search +
          url.hash,
      };
      setDiscardOpen(true);
    }

    window.addEventListener(
      "beforeunload",
      onBeforeUnload
    );
    window.addEventListener(
      LETZSHOPY_NATIVE_BACK_EVENT,
      onNativeBack
    );
    window.addEventListener(
      "click",
      onLinkClick,
      true
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        onBeforeUnload
      );
      window.removeEventListener(
        LETZSHOPY_NATIVE_BACK_EVENT,
        onNativeBack
      );
      window.removeEventListener(
        "click",
        onLinkClick,
        true
      );
    };
  }, [hasUnsavedProductChanges]);

  useEffect(() => {
    if (
      editMode &&
      !editLoading &&
      selectedProductType
    ) {
      const order =
        guidedOrder(selectedProductType);
      setUnlockedSections(order);
      setOpenSection("info");
    }
  }, [
    editMode,
    editLoading,
    selectedProductType,
  ]);

  useEffect(() => {
    if (
      selectedProductType ===
        "variable-colour" &&
      colourRows.length > 0 &&
      !activeColourPhotoRowId
    ) {
      setActiveColourPhotoRowId(
        colourRows[0].id
      );
    }
  }, [
    selectedProductType,
    colourRows,
    activeColourPhotoRowId,
  ]);

  function scrollToGuidedSection(
    section: GuidedSection
  ) {
    window.setTimeout(() => {
      document
        .getElementById(
          `product-section-${section}`
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 80);
  }

  function unlockAndOpen(
    section: GuidedSection
  ) {
    setUnlockedSections((current) =>
      current.includes(section)
        ? current
        : [...current, section]
    );
    setOpenSection(section);
    scrollToGuidedSection(section);
  }

  function chooseGuidedProductType(
    productType: ProductType
  ) {
    if (
      editMode &&
      selectedProductType &&
      selectedProductType !== productType
    ) {
      actionFeedback.info({
        id: "product-type-locked",
        title: "Product type is locked",
        message:
          "Create a new product if you need a different product type.",
        durationMs: 3200,
      });
      return;
    }

    if (
      selectedProductType !== productType
    ) {
      chooseProductType(productType);
    }

    setUnlockedSections([
      "type",
      "info",
    ]);
    setOpenSection("info");
    scrollToGuidedSection("info");
  }

  function requestProductLeave(
    href?: string
  ) {
    if (
      !hasUnsavedProductChanges
    ) {
      if (href) {
        router.push(href);
      } else {
        window.history.back();
      }
      return;
    }

    pendingLeaveRef.current = href
      ? {
          kind: "href",
          href,
        }
      : {
          kind: "back",
        };
    setDiscardOpen(true);
  }

  function discardProductChanges() {
    const pending =
      pendingLeaveRef.current;

    pendingLeaveRef.current = null;
    bypassLeaveRef.current = true;
    baselineRef.current =
      guidedFingerprint;
    setDiscardOpen(false);

    window.setTimeout(() => {
      if (!pending) {
        bypassLeaveRef.current = false;
        return;
      }

      if (pending.kind === "href") {
        router.push(pending.href);
      } else {
        window.history.back();
      }

      window.setTimeout(() => {
        bypassLeaveRef.current = false;
      }, 300);
    }, 0);
  }

  function selectCategory(category: Category) {
    setSelectedCategoryId((currentId) =>
      currentId === category.id ? null : category.id
    );
    setQuery("");
    setSearchFocused(false);
    setConfirmation(null);
  }

  function clearSelectedCategory() {
    setSelectedCategoryId(null);
    setConfirmation(null);
  }

  async function createAndSelectCategory() {
    const name = newCategoryName.trim();

    if (
      name.length < 2 ||
      categoryCreating
    ) {
      return;
    }

    try {
      setCategoryCreating(true);
      setCategoryCreateError(null);

      actionFeedback.loading({
        id: "category-create",
        title: "Checking category",
        message: name,
      });

      const response = await fetch(
        "/api/categories/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            parent: newCategoryParentId,
            image_id:
              newCategoryImage?.id || undefined,
          }),
        }
      );

      const json: unknown =
        await response.json();

      if (!response.ok) {
        const message =
          isRecord(json) &&
          typeof json.error === "string"
            ? json.error
            : "Unable to create category.";

        throw new Error(message);
      }

      const createdCategory =
        parseCreatedCategory(json);

      if (!createdCategory) {
        throw new Error(
          "Category creation returned an invalid response."
        );
      }

      const existing =
        isRecord(json) &&
        json.existing === true;

      setCreatedCategories((current) =>
        current.some(
          (category) =>
            category.id ===
            createdCategory.id
        )
          ? current
          : [...current, createdCategory]
      );

      setSelectedCategoryId(
        createdCategory.id
      );
      setNewCategoryName("");
      setNewCategoryParentId(0);
      setNewCategoryImage(null);
      setCategoryCreateOpen(false);
      setConfirmation(null);

      if (existing) {
        actionFeedback.info({
          id: "category-create",
          title:
            "Category already exists",
          message:
            `${createdCategory.name} selected.`,
        });
      } else {
        actionFeedback.success({
          id: "category-create",
          title: "Category created",
          message:
            `${createdCategory.name} selected.`,
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create category.";

      setCategoryCreateError(message);

      actionFeedback.error({
        id: "category-create",
        title:
          "Category action failed",
        message,
      });
    } finally {
      setCategoryCreating(false);
    }
  }

  function clearSharedPhotos() {
    localPhotos.forEach((photo) => {
      URL.revokeObjectURL(photo.url);
    });
    photoUrlsRef.current = [];
    setLocalPhotos([]);
  }

  function chooseProductType(productType: ProductType) {
    const nextProductType =
      selectedProductType === productType
        ? null
        : productType;

    if (nextProductType === "variable-colour") {
      clearSharedPhotos();
    }

    if (nextProductType === "variable-colour") {
      setColor("");
    }

    setSelectedProductType(nextProductType);
    setStep(2);
    setConfirmation(null);
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;

    const slotsAvailable = Math.max(
      0,
      5 - localPhotos.length
    );

    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, slotsAvailable);

    if (selectedFiles.length === 0) return;

    const newPhotos = selectedFiles.map(
      (file, index) => {
        const url = URL.createObjectURL(file);
        photoUrlsRef.current.push(url);

        return {
          id: `${Date.now()}-${index}-${file.name}`,
          name: file.name,
          url,
          file,
        };
      }
    );

    setLocalPhotos((current) => [
      ...current,
      ...newPhotos,
    ]);
    setConfirmation(null);
  }

  function movePhoto(
    sourcePhotoId: string,
    targetPhotoId: string
  ) {
    if (sourcePhotoId === targetPhotoId) return;

    setLocalPhotos((current) => {
      const sourceIndex = current.findIndex(
        (photo) => photo.id === sourcePhotoId
      );
      const targetIndex = current.findIndex(
        (photo) => photo.id === targetPhotoId
      );

      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const next = [...current];
      const [movedPhoto] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedPhoto);

      return next;
    });

    setConfirmation(null);
  }

  function beginPhotoDrag(photoId: string) {
    draggedPhotoIdRef.current = photoId;
    setDraggedPhotoId(photoId);
  }

  function moveDraggedPhotoAtPoint(
    clientX: number,
    clientY: number
  ) {
    const sourcePhotoId = draggedPhotoIdRef.current;
    if (!sourcePhotoId) return;

    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-photo-id]");

    const targetPhotoId = target?.dataset.photoId;

    if (
      targetPhotoId &&
      targetPhotoId !== sourcePhotoId
    ) {
      movePhoto(sourcePhotoId, targetPhotoId);
    }
  }

  function finishPhotoDrag() {
    draggedPhotoIdRef.current = null;
    setDraggedPhotoId(null);
  }

  function removePhoto(photoId: string) {
    const selected = localPhotos.find(
      (photo) => photo.id === photoId
    );

    if (selected?.file) {
      URL.revokeObjectURL(selected.url);
      photoUrlsRef.current =
        photoUrlsRef.current.filter(
          (url) => url !== selected.url
        );
    }

    setLocalPhotos((current) =>
      current.filter((photo) => photo.id !== photoId)
    );
    setConfirmation(null);
  }

  function addVariation(
    kind: "size" | "colour",
    rawOption: string
  ) {
    const option = rawOption.trim();
    if (!option) return;

    const setter =
      kind === "size" ? setSizeRows : setColourRows;

    setter((current) => {
      const exists = current.some(
        (row) =>
          row.option.toLowerCase() === option.toLowerCase()
      );

      if (exists || current.length >= 20) return current;

      const firstVariation = current[0];

      return [
        ...current,
        {
          id: `${kind}-${Date.now()}-${option}`,
          option,
          price: firstVariation?.price ?? "",
          quantity: firstVariation?.quantity ?? "",
          photos: [],
        },
      ];
    });

    if (kind === "size") {
      setSizeInput("");
    } else {
      setColourInput("");
    }

    setConfirmation(null);
  }

  function updateVariation(
    kind: "size" | "colour",
    id: string,
    patch: Partial<VariationRow>
  ) {
    const setter =
      kind === "size" ? setSizeRows : setColourRows;

    setter((current) => {
      const sourceIndex = current.findIndex(
        (row) => row.id === id
      );

      if (sourceIndex < 0) return current;

      const previousSource = current[sourceIndex];
      const isFirstVariation = sourceIndex === 0;

      return current.map((row) => {
        if (row.id === id) {
          return { ...row, ...patch };
        }

        if (!isFirstVariation) return row;

        const nextRow = { ...row };

        if (
          typeof patch.price === "string" &&
          (row.price === "" ||
            row.price === previousSource.price)
        ) {
          nextRow.price = patch.price;
        }

        if (
          typeof patch.quantity === "string" &&
          (row.quantity === "" ||
            row.quantity === previousSource.quantity)
        ) {
          nextRow.quantity = patch.quantity;
        }

        return nextRow;
      });
    });
    setConfirmation(null);
  }

  function removeVariation(
    kind: "size" | "colour",
    id: string
  ) {
    const rows =
      kind === "size" ? sizeRows : colourRows;
    const selected = rows.find((row) => row.id === id);

    if (selected) {
      const removedUrls = new Set(
        selected.photos.map((photo) => photo.url)
      );

      selected.photos.forEach((photo) => {
        URL.revokeObjectURL(photo.url);
      });

      variationPhotoUrlsRef.current =
        variationPhotoUrlsRef.current.filter(
          (url) => !removedUrls.has(url)
        );
    }

    const setter =
      kind === "size" ? setSizeRows : setColourRows;

    setter((current) =>
      current.filter((row) => row.id !== id)
    );
    setConfirmation(null);
  }

  function addVariationPhotos(
    rowId: string,
    files: FileList | null
  ) {
    if (!files) return;

    const currentPhotoCount =
      colourRows.find(
        (row) => row.id === rowId
      )?.photos.length ?? 0;

    const selectedFiles = Array.from(files)
      .filter(
        (file) =>
          file.type.startsWith("image/")
      )
      .slice(
        0,
        Math.max(
          0,
          3 - currentPhotoCount
        )
      );

    if (selectedFiles.length === 0) return;

    const newPhotos = selectedFiles.map((file, index) => {
      const url = URL.createObjectURL(file);
      variationPhotoUrlsRef.current.push(url);

      return {
        id: `colour-photo-${Date.now()}-${index}-${file.name}`,
        name: file.name,
        url,
        file,
      };
    });

    setColourRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              photos: [...row.photos, ...newPhotos],
            }
          : row
      )
    );

    setConfirmation(null);
  }

  function removeVariationPhoto(
    rowId: string,
    photoId: string
  ) {
    const selectedPhoto = colourRows
      .find((row) => row.id === rowId)
      ?.photos.find((photo) => photo.id === photoId);

    if (selectedPhoto?.file) {
      URL.revokeObjectURL(selectedPhoto.url);
      variationPhotoUrlsRef.current =
        variationPhotoUrlsRef.current.filter(
          (url) => url !== selectedPhoto.url
        );
    }

    setColourRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              photos: row.photos.filter(
                (photo) => photo.id !== photoId
              ),
            }
          : row
      )
    );

    setConfirmation(null);
  }

  function moveVariationPhoto(
    rowId: string,
    sourcePhotoId: string,
    targetPhotoId: string
  ) {
    if (sourcePhotoId === targetPhotoId) return;

    setColourRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        const sourceIndex = row.photos.findIndex(
          (photo) => photo.id === sourcePhotoId
        );

        const targetIndex = row.photos.findIndex(
          (photo) => photo.id === targetPhotoId
        );

        if (
          sourceIndex < 0 ||
          targetIndex < 0
        ) {
          return row;
        }

        const photos = [...row.photos];
        const [movedPhoto] = photos.splice(
          sourceIndex,
          1
        );

        photos.splice(
          targetIndex,
          0,
          movedPhoto
        );

        return {
          ...row,
          photos,
        };
      })
    );

    setConfirmation(null);
  }

  function beginVariationPhotoDrag(
    rowId: string,
    photoId: string
  ) {
    const active = {
      rowId,
      photoId,
    };

    draggedVariationPhotoRef.current = active;
    setDraggedVariationPhoto(active);
  }

  function moveDraggedVariationPhotoAtPoint(
    rowId: string,
    clientX: number,
    clientY: number
  ) {
    const active =
      draggedVariationPhotoRef.current;

    if (!active || active.rowId !== rowId) {
      return;
    }

    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>(
        "[data-variation-photo-id]"
      );

    const targetRowId =
      target?.dataset.variationRowId;

    const targetPhotoId =
      target?.dataset.variationPhotoId;

    if (
      targetRowId === rowId &&
      targetPhotoId &&
      targetPhotoId !== active.photoId
    ) {
      moveVariationPhoto(
        rowId,
        active.photoId,
        targetPhotoId
      );
    }
  }

  function finishVariationPhotoDrag() {
    draggedVariationPhotoRef.current = null;
    setDraggedVariationPhoto(null);
  }

  function addTag(rawValue: string) {
    const cleanedTag = rawValue
      .trim()
      .replace(/^#/, "");

    if (!cleanedTag) return;

    setTags((current) => {
      const alreadyExists = current.some(
        (tag) =>
          tag.toLowerCase() === cleanedTag.toLowerCase()
      );

      if (alreadyExists || current.length >= 10) {
        return current;
      }

      return [...current, cleanedTag];
    });

    setTagInput("");
    setConfirmation(null);
  }

  function removeTag(tagToRemove: string) {
    setTags((current) =>
      current.filter((tag) => tag !== tagToRemove)
    );
    setConfirmation(null);
  }

  async function deleteUploadedMedia(
    ids: number[]
  ) {
    if (ids.length === 0) return;

    await fetch("/api/media/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    }).catch(() => undefined);
  }

  async function readProductImageUploadResponse(
    response: Response,
    photoName: string
  ): Promise<number> {
    const raw = await response.text();
    let json: JsonRecord = {};

    if (raw.trim()) {
      try {
        const parsed: unknown = JSON.parse(raw);
        json = isRecord(parsed) ? parsed : {};
      } catch {
        json = {};
      }
    }

    if (
      response.status === 413 ||
      /request entity too large|payload too large|function_payload_too_large/i.test(
        raw
      )
    ) {
      throw new Error(
        `"${photoName}" was still too large for the upload service after preparation.`
      );
    }

    if (!response.ok) {
      const message =
        typeof json.error === "string"
          ? json.error
          : `Image upload failed with status ${response.status}.`;

      throw new Error(
        `"${photoName}" could not be uploaded. ${message}`
      );
    }

    const id = Number(json.id);

    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      throw new Error(
        `"${photoName}" returned an invalid upload response. Please try again.`
      );
    }

    return id;
  }

  async function uploadSingleProductPhoto(
    photo: LocalPhoto
  ): Promise<number> {
    if (
      Number.isSafeInteger(photo.mediaId) &&
      Number(photo.mediaId) > 0
    ) {
      return Number(photo.mediaId);
    }

    if (!photo.file) {
      throw new Error(
        `"${photo.name}" is missing its upload file.`
      );
    }

    let preparedFile: File;

    try {
      const optimization =
        await optimizeContentImageForUpload(
          photo.file
        );

      preparedFile = optimization.file;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "The image could not be prepared.";

      throw new Error(
        `Unable to prepare "${photo.name}". ${message}`
      );
    }

    const form = new FormData();

    form.append(
      "file",
      preparedFile,
      preparedFile.name
    );
    form.append(
      "purpose",
      "product_image"
    );

    let response: Response;

    try {
      response = await fetch(
        "/api/media/upload",
        {
          method: "POST",
          body: form,
        }
      );
    } catch {
      throw new Error(
        `"${photo.name}" could not be uploaded because the connection was interrupted.`
      );
    }

    return readProductImageUploadResponse(
      response,
      photo.name
    );
  }

  async function uploadProductPhotos(
    photos: LocalPhoto[],
    onProgress?: (
      completed: number,
      total: number
    ) => void
  ): Promise<number[]> {
    const orderedIds: Array<number | undefined> =
      new Array(photos.length);
    const uploadedIds: number[] = [];
    let nextIndex = 0;
    let completed = 0;
    let firstError: Error | null = null;

    async function worker() {
      while (true) {
        if (firstError) return;

        const index = nextIndex;
        nextIndex += 1;

        if (index >= photos.length) return;

        try {
          const id =
            await uploadSingleProductPhoto(
              photos[index]
            );

          orderedIds[index] = id;
          uploadedIds.push(id);
          completed += 1;
          onProgress?.(
            completed,
            photos.length
          );
        } catch (error: unknown) {
          firstError =
            error instanceof Error
              ? error
              : new Error(
                  "Image upload failed."
                );
        }
      }
    }

    const workerCount = Math.min(
      4,
      photos.length
    );

    await Promise.all(
      Array.from(
        { length: workerCount },
        () => worker()
      )
    );

    if (firstError) {
      Object.assign(firstError, {
        uploadedIds,
      });

      throw firstError;
    }

    return orderedIds.map((id) => {
      if (
        !Number.isSafeInteger(id) ||
        Number(id) <= 0
      ) {
        throw new Error(
          "Image upload did not return every media item."
        );
      }

      return Number(id);
    });
  }

  async function uploadProductPhotosConcurrently(
    photos: LocalPhoto[],
    onProgress?: (
      completed: number,
      total: number
    ) => void
  ): Promise<number[]> {
    return uploadProductPhotos(
      photos,
      onProgress
    );
  }
  async function verifySkuBeforeUpload() {
    const normalizedSku = sku.trim();

    if (
      editMode &&
      normalizedSku &&
      normalizedSku === originalSku.trim()
    ) {
      return;
    }

    if (!normalizedSku) return;

    const response = await fetch(
      `/api/products/sku-check?sku=${encodeURIComponent(
        normalizedSku
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const json: unknown =
      await response.json();

    if (
      !response.ok ||
      !isRecord(json)
    ) {
      throw new Error(
        "Unable to verify SKU availability."
      );
    }

    if (json.exists === true) {
      setSkuTaken(true);
      throw new Error(
        "SKU already taken"
      );
    }
  }

  async function responseJson(
    response: Response
  ): Promise<JsonRecord> {
    const value: unknown = await response
      .json()
      .catch(() => ({}));

    return isRecord(value) ? value : {};
  }

  async function verifyVariationSkusBeforeUpload(
    rows: VariationRow[]
  ) {
    await Promise.all(
      rows.map(async (row) => {
        const generatedSku = variationSku(
          sku,
          row.option
        );

        if (!generatedSku) {
          throw new Error(
            `Unable to generate SKU for ${row.option}.`
          );
        }

        if (generatedSku.length > 100) {
          throw new Error(
            `Generated SKU is too long for ${row.option}.`
          );
        }

        const response = await fetch(
          `/api/products/sku-check?sku=${encodeURIComponent(
            generatedSku
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const json =
          await responseJson(response);

        if (!response.ok) {
          throw new Error(
            "Unable to verify variation SKU availability."
          );
        }

        if (json.exists === true) {
          throw new Error(
            `Variation SKU already taken: ${generatedSku}`
          );
        }
      })
    );
  }

  async function ensureSizeAttribute(
    options: string[]
  ): Promise<number> {
    async function loadAttributes() {
      const response = await fetch(
        "/api/attributes/terms",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const json =
        await responseJson(response);

      if (!response.ok) {
        const message =
          typeof json.error === "string"
            ? json.error
            : "Unable to load product attributes.";

        throw new Error(message);
      }

      return Array.isArray(json.attributes)
        ? json.attributes
        : [];
    }

    function findSizeAttributeId(
      attributes: unknown[]
    ): number {
      for (const item of attributes) {
        if (!isRecord(item)) continue;

        const id = Number(item.id);
        const name =
          typeof item.name === "string"
            ? item.name.trim()
            : "";

        if (
          Number.isSafeInteger(id) &&
          id > 0 &&
          name.toLowerCase() === "size"
        ) {
          return id;
        }
      }

      return 0;
    }

    let attributes = await loadAttributes();
    let sizeAttributeId =
      findSizeAttributeId(attributes);

    if (!sizeAttributeId) {
      const createResponse = await fetch(
        "/api/attributes/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: "Size",
            slug: "size",
            type: "select",
            order_by: "menu_order",
          }),
        }
      );

      const createJson =
        await responseJson(createResponse);

      const createdAttribute =
        isRecord(createJson.attribute)
          ? createJson.attribute
          : null;

      const createdId = Number(
        createdAttribute?.id
      );

      if (
        createResponse.ok &&
        Number.isSafeInteger(createdId) &&
        createdId > 0
      ) {
        sizeAttributeId = createdId;
      } else {
        attributes = await loadAttributes();
        sizeAttributeId =
          findSizeAttributeId(attributes);
      }

      if (!sizeAttributeId) {
        const message =
          typeof createJson.error === "string"
            ? createJson.error
            : "Unable to create the Size attribute.";

        throw new Error(message);
      }
    }

    const termsResponse = await fetch(
      `/api/attributes/terms?id=${sizeAttributeId}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const termsJson =
      await responseJson(termsResponse);

    if (!termsResponse.ok) {
      const message =
        typeof termsJson.error === "string"
          ? termsJson.error
          : "Unable to load Size terms.";

      throw new Error(message);
    }

    const existingNames = new Set(
      (
        Array.isArray(termsJson.terms)
          ? termsJson.terms
          : []
      ).flatMap((item) => {
        if (!isRecord(item)) return [];

        const name =
          typeof item.name === "string"
            ? item.name.trim().toLowerCase()
            : "";

        return name ? [name] : [];
      })
    );

    const missingOptions = Array.from(
      new Set(
        options
          .map((option) => option.trim())
          .filter(
            (option) =>
              option &&
              !existingNames.has(
                option.toLowerCase()
              )
          )
      )
    );

    await Promise.all(
      missingOptions.map(
        async (normalizedOption) => {
          const createTermResponse =
            await fetch(
              "/api/attributes/terms",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  id: sizeAttributeId,
                  name: normalizedOption,
                }),
              }
            );

          const createTermJson =
            await responseJson(
              createTermResponse
            );

          if (!createTermResponse.ok) {
            const message =
              typeof createTermJson.error ===
              "string"
                ? createTermJson.error
                : `Unable to create Size term: ${normalizedOption}`;

            throw new Error(message);
          }
        }
      )
    );

    return sizeAttributeId;
  }

  async function ensureColourAttribute(
    options: string[]
  ): Promise<number> {
    async function loadAttributes() {
      const response = await fetch(
        "/api/attributes/terms",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const json =
        await responseJson(response);

      if (!response.ok) {
        const message =
          typeof json.error === "string"
            ? json.error
            : "Unable to load product attributes.";

        throw new Error(message);
      }

      return Array.isArray(json.attributes)
        ? json.attributes
        : [];
    }

    function findColourAttributeId(
      attributes: unknown[]
    ): number {
      for (const item of attributes) {
        if (!isRecord(item)) continue;

        const id = Number(item.id);
        const name =
          typeof item.name === "string"
            ? item.name.trim().toLowerCase()
            : "";

        if (
          Number.isSafeInteger(id) &&
          id > 0 &&
          (
            name === "colour" ||
            name === "color"
          )
        ) {
          return id;
        }
      }

      return 0;
    }

    let attributes = await loadAttributes();
    let colourAttributeId =
      findColourAttributeId(attributes);

    if (!colourAttributeId) {
      const createResponse = await fetch(
        "/api/attributes/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: "Colour",
            slug: "colour",
            type: "select",
            order_by: "menu_order",
          }),
        }
      );

      const createJson =
        await responseJson(createResponse);

      const createdAttribute =
        isRecord(createJson.attribute)
          ? createJson.attribute
          : null;

      const createdId = Number(
        createdAttribute?.id
      );

      if (
        createResponse.ok &&
        Number.isSafeInteger(createdId) &&
        createdId > 0
      ) {
        colourAttributeId = createdId;
      } else {
        attributes = await loadAttributes();
        colourAttributeId =
          findColourAttributeId(attributes);
      }

      if (!colourAttributeId) {
        const message =
          typeof createJson.error === "string"
            ? createJson.error
            : "Unable to create the Colour attribute.";

        throw new Error(message);
      }
    }

    const termsResponse = await fetch(
      `/api/attributes/terms?id=${colourAttributeId}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const termsJson =
      await responseJson(termsResponse);

    if (!termsResponse.ok) {
      const message =
        typeof termsJson.error === "string"
          ? termsJson.error
          : "Unable to load Colour terms.";

      throw new Error(message);
    }

    const existingNames = new Set(
      (
        Array.isArray(termsJson.terms)
          ? termsJson.terms
          : []
      ).flatMap((item) => {
        if (!isRecord(item)) return [];

        const name =
          typeof item.name === "string"
            ? item.name.trim().toLowerCase()
            : "";

        return name ? [name] : [];
      })
    );

    const missingOptions = Array.from(
      new Set(
        options
          .map((option) => option.trim())
          .filter(
            (option) =>
              option &&
              !existingNames.has(
                option.toLowerCase()
              )
          )
      )
    );

    await Promise.all(
      missingOptions.map(
        async (normalizedOption) => {
          const createTermResponse =
            await fetch(
              "/api/attributes/terms",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  id: colourAttributeId,
                  name: normalizedOption,
                }),
              }
            );

          const createTermJson =
            await responseJson(
              createTermResponse
            );

          if (!createTermResponse.ok) {
            const message =
              typeof createTermJson.error ===
              "string"
                ? createTermJson.error
                : `Unable to create Colour term: ${normalizedOption}`;

            throw new Error(message);
          }
        }
      )
    );

    return colourAttributeId;
  }

  async function uploadColourGalleries(
    rows: VariationRow[],
    onProgress?: (
      completed: number,
      total: number
    ) => void
  ): Promise<UploadedColourGallery[]> {
    const tasks = rows.flatMap(
      (row) =>
        row.photos.map(
          (photo, photoIndex) => ({
            rowId: row.id,
            option: row.option,
            photo,
            photoIndex,
          })
        )
    );

    const uploaded: Array<{
      rowId: string;
      option: string;
      photoIndex: number;
      imageId: number;
    } | null> = new Array(
      tasks.length
    ).fill(null);
    const uploadedIds: number[] = [];
    let nextIndex = 0;
    let completed = 0;
    let firstError: Error | null = null;

    async function worker() {
      while (true) {
        if (firstError) return;

        const index = nextIndex;
        nextIndex += 1;

        if (index >= tasks.length) return;

        const task = tasks[index];

        try {
          const imageId =
            await uploadSingleProductPhoto(
              task.photo
            );

          uploaded[index] = {
            rowId: task.rowId,
            option: task.option,
            photoIndex:
              task.photoIndex,
            imageId,
          };
          uploadedIds.push(imageId);
          completed += 1;
          onProgress?.(
            completed,
            tasks.length
          );
        } catch (error: unknown) {
          firstError =
            error instanceof Error
              ? error
              : new Error(
                  "Colour image upload failed."
                );
        }
      }
    }

    const workerCount = Math.min(
      4,
      tasks.length
    );

    await Promise.all(
      Array.from(
        { length: workerCount },
        () => worker()
      )
    );

    if (firstError) {
      Object.assign(firstError, {
        uploadedIds,
      });

      throw firstError;
    }

    const completedUploads =
      uploaded.flatMap(
        (item) => (item ? [item] : [])
      );

    return rows.map((row) => ({
      rowId: row.id,
      option: row.option,
      imageIds: completedUploads
        .filter(
          (item) =>
            item.rowId === row.id
        )
        .sort(
          (a, b) =>
            a.photoIndex -
            b.photoIndex
        )
        .map(
          (item) => item.imageId
        ),
    }));
  }

  async function completeProductUpdate() {
    const productId = Number(editProductId);
    const effectiveStatus =
      requestedStatusRef.current ?? status;

    baselineRef.current =
      guidedFingerprint;
    setOriginalSku(sku.trim());
    requestedStatusRef.current = null;

    setSuccessResult({
      kind: "updated",
      productId,
      productName:
        productName.trim() || "Product",
      status: effectiveStatus,
    });

    actionFeedback.success({
      id: "product-update",
      title: "Product updated successfully",
      message:
        productName.trim() || "Product",
      durationMs: 2600,
    });
  }

  async function updateExistingProduct() {
    if (
      !editMode ||
      !editProductId ||
      submitting ||
      !selectedProductType ||
      !selectedCategory
    ) {
      return;
    }

    const productId = Number(editProductId);
    const feedbackId = "product-update";
    const effectiveStatus =
      requestedStatusRef.current ?? status;

    try {
      setSubmitting(true);
      setSubmitError(null);
      setConfirmation(null);

      setSubmitStage("Checking product details");
      await verifySkuBeforeUpload();

      const commonPayload: JsonRecord = {
        name: productName.trim(),
        sku: sku.trim(),
        status: effectiveStatus,
        catalog_visibility: visibility,
        short_description:
          editMode && !shortDescriptionEdited
            ? originalShortDescription.trim()
            : shortDescription.trim(),
        description:
          editMode && !descriptionEdited
            ? originalDescription.trim()
            : description.trim(),
        weight: weight.trim(),
        categories: [
          {
            id: selectedCategory.id,
          },
        ],
        tags: tags.map((name) => ({
          name,
        })),
        dimensions: dimensionsEnabled
          ? {
              length: length.trim(),
              width: width.trim(),
              height: height.trim(),
            }
          : {
              length: "",
              width: "",
              height: "",
            },
      };

      if (color.trim()) {
        commonPayload.color = color.trim();
      } else {
        commonPayload.color = "";
      }

      if (selectedProductType === "simple") {
        setSubmitStage(
          `Preparing product images`
        );

        const imageIds =
          await uploadProductPhotos(
            localPhotos,
            (completed, total) => {
              setSubmitStage(
                `Preparing images ${completed} of ${total}`
              );
            }
          );

        const payload: JsonRecord = {
          ...commonPayload,
          type: "simple",
          regular_price: regularPrice.trim(),
          manage_stock: true,
          stock_quantity: Number(stockQuantity),
          stock_status:
            Number(stockQuantity) > 0
              ? "instock"
              : "outofstock",
          images: imageIds.map((id, position) => ({
            id,
            position,
          })),
        };

        setSubmitStage("Saving product");

        const response = await fetch(
          `/api/products/${productId}/update`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const json = await responseJson(response);

        if (!response.ok) {
          throw new Error(
            typeof json.error === "string"
              ? json.error
              : "Unable to update the product."
          );
        }

        await completeProductUpdate();
        return;
      }

      const rows =
        selectedProductType === "variable-colour"
          ? colourRows
          : sizeRows;

      const attributeId =
        selectedProductType === "variable-colour"
          ? await ensureColourAttribute(
              rows.map((row) => row.option)
            )
          : await ensureSizeAttribute(
              rows.map((row) => row.option)
            );

      let parentImageIds: number[] = [];
      let uploadedGalleries: UploadedColourGallery[] = [];

      if (selectedProductType === "variable-colour") {
        setSubmitStage("Preparing colour images");

        uploadedGalleries =
          await uploadColourGalleries(
            colourRows,
            (completed, total) => {
              setSubmitStage(
                `Preparing colour images ${completed} of ${total}`
              );
            }
          );

        parentImageIds =
          Array.from(
            new Set(
              uploadedGalleries.flatMap(
                (gallery) => gallery.imageIds
              )
            )
          ).slice(0, 20);
      } else {
        setSubmitStage("Preparing shared images");

        parentImageIds =
          await uploadProductPhotosConcurrently(
            localPhotos,
            (completed, total) => {
              setSubmitStage(
                `Preparing images ${completed} of ${total}`
              );
            }
          );
      }

      const variablePayload: JsonRecord = {
        ...commonPayload,
        type: "variable",
        images: parentImageIds.map((id, position) => ({
          id,
          position,
        })),
        attributes: [
          {
            id: attributeId,
            visible: true,
            variation: true,
            options: rows.map((row) => row.option),
          },
        ],
      };

      if (selectedProductType === "variable-colour") {
        variablePayload.color = colourRows
          .map((row) => row.option.trim())
          .filter(Boolean)
          .join(", ")
          .slice(0, 100);
      }

      setSubmitStage("Saving product");

      const parentResponse = await fetch(
        `/api/products/${productId}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(variablePayload),
        }
      );

      const parentJson =
        await responseJson(parentResponse);

      if (!parentResponse.ok) {
        throw new Error(
          typeof parentJson.error === "string"
            ? parentJson.error
            : "Unable to update the product."
        );
      }

      setSubmitStage("Saving variations");

      const activeVariationIds =
        rows.flatMap((row) =>
          Number.isSafeInteger(row.variationId) &&
          Number(row.variationId) > 0
            ? [Number(row.variationId)]
            : []
        );

      const deleteIds =
        originalVariationIds.filter(
          (id) => !activeVariationIds.includes(id)
        );

      const variationResponse = await fetch(
        `/api/products/${productId}/variations`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            variations: rows.map((row) => {
              const base: JsonRecord = {
                sku: variationSku(
                  sku,
                  row.option
                ),
                regular_price: row.price.trim(),
                manage_stock: true,
                stock_quantity: Number(row.quantity),
                stock_status:
                  Number(row.quantity) > 0
                    ? "instock"
                    : "outofstock",
                backorders: "no",
                attributes: [
                  {
                    id: attributeId,
                    option: row.option,
                  },
                ],
              };

              if (
                Number.isSafeInteger(row.variationId) &&
                Number(row.variationId) > 0
              ) {
                base.id = Number(row.variationId);
              }

              if (
                selectedProductType === "variable-colour"
              ) {
                const gallery =
                  uploadedGalleries.find(
                    (item) =>
                      item.rowId === row.id
                  );

                const mainImageId =
                  gallery?.imageIds[0];

                if (mainImageId) {
                  base.image = {
                    id: mainImageId,
                  };
                }
              }

              return base;
            }),
            delete_ids: deleteIds,
          }),
        }
      );

      const variationJson =
        await responseJson(
          variationResponse
        );

      if (!variationResponse.ok) {
        throw new Error(
          typeof variationJson.error === "string"
            ? variationJson.error
            : "Unable to save product variations."
        );
      }

      const savedVariations =
        Array.isArray(variationJson.variations)
          ? variationJson.variations.filter(isRecord)
          : [];

      if (
        selectedProductType === "variable-colour"
      ) {
        setSubmitStage("Saving colour galleries");

        const galleries =
          colourRows.map((row) => {
            const saved =
              savedVariations.find((variation) => {
                if (!Array.isArray(variation.attributes)) {
                  return false;
                }

                return variation.attributes.some(
                  (attribute) =>
                    isRecord(attribute) &&
                    typeof attribute.option === "string" &&
                    attribute.option.trim().toLowerCase() ===
                      row.option.trim().toLowerCase()
                );
              });

            const variationId =
              Number(row.variationId) ||
              Number(saved?.id);

            if (
              !Number.isSafeInteger(variationId) ||
              variationId <= 0
            ) {
              throw new Error(
                `Unable to match the saved variation for ${row.option}.`
              );
            }

            const gallery =
              uploadedGalleries.find(
                (item) =>
                  item.rowId === row.id
              );

            return {
              variation_id: variationId,
              image_ids:
                gallery?.imageIds || [],
            };
          });

        const galleryResponse = await fetch(
          `/api/products/${productId}/variation-galleries`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              galleries,
            }),
          }
        );

        const galleryJson =
          await responseJson(
            galleryResponse
          );

        if (
          !galleryResponse.ok ||
          galleryJson.ok !== true
        ) {
          throw new Error(
            typeof galleryJson.error === "string"
              ? galleryJson.error
              : "Unable to save colour galleries."
          );
        }
      }

      await completeProductUpdate();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Product update failed.";

      setSubmitError(message);

      actionFeedback.error({
        id: feedbackId,
        title: "Product update failed",
        message,
        durationMs: 4200,
      });

      if (message === "SKU already taken") {
        setSkuTaken(true);
      }
    } finally {
      setSubmitStage(null);
      setSubmitting(false);
    }
  }

  async function completeProductCreate(
    productId: number
  ) {
    const createdName =
      productName.trim() ||
      "Product";
    const effectiveStatus =
      requestedStatusRef.current ?? status;

    baselineRef.current =
      guidedFingerprint;
    requestedStatusRef.current = null;

    setSuccessResult({
      kind: "created",
      productId,
      productName: createdName,
      status: effectiveStatus,
    });

    actionFeedback.success({
      id: "product-create",
      title:
        effectiveStatus === "publish"
          ? "Product created successfully"
          : "Product saved as draft",
      message: createdName,
      durationMs: 2600,
    });
  }

  function notifyProductCreateError(
    message: string
  ) {
    actionFeedback.error({
      id: "product-create",
      title: "Product action failed",
      message,
    });
  }

  async function createSizeProduct() {
    const effectiveStatus =
      requestedStatusRef.current ?? status;

    if (
      submitting ||
      selectedProductType !== "variable-size"
    ) {
      return;
    }

    if (
      !selectedCategory ||
      selectedCategory.id <= 0
    ) {
      const message =
        "Select a saved product category.";

      setSubmitError(message);
      notifyProductCreateError(
        message
      );
      return;
    }

    let uploadedIds: number[] = [];
    let productId = 0;

    try {
      setSubmitting(true);
      setSubmitError(null);
      setConfirmation(null);

      setSubmitStage("Checking SKUs");

      await Promise.all([
        verifySkuBeforeUpload(),
        verifyVariationSkusBeforeUpload(
          sizeRows
        ),
      ]);

      setSubmitStage("Preparing sizes");

      const sizeAttributeId =
        await ensureSizeAttribute(
          sizeRows.map((row) => row.option)
        );

      setSubmitStage(
        `Preparing and uploading 0 of ${localPhotos.length} images`
      );

      uploadedIds =
        await uploadProductPhotosConcurrently(
          localPhotos,
          (completed, total) => {
            setSubmitStage(
              `Preparing and uploading ${completed} of ${total} images`
            );
          }
        );

      const payload: JsonRecord = {
        type: "variable",
        name: productName.trim(),
        sku: sku.trim(),
        status: effectiveStatus,
        catalog_visibility: visibility,
        short_description:
          shortDescription.trim(),
        description: description.trim(),
        weight: weight.trim(),
        categories: [
          {
            id: selectedCategory.id,
          },
        ],
        tags: tags.map((name) => ({
          name,
        })),
        images: uploadedIds.map(
          (id, position) => ({
            id,
            position,
          })
        ),
        attributes: [
          {
            id: sizeAttributeId,
            visible: true,
            variation: true,
            options: sizeRows.map(
              (row) => row.option
            ),
          },
        ],
      };

      if (dimensionsEnabled) {
        payload.dimensions = {
          length: length.trim(),
          width: width.trim(),
          height: height.trim(),
        };
      }

      if (color.trim()) {
        payload.color = color.trim();
      }

      setSubmitStage("Creating product");

      const response = await fetch(
        "/api/products/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json =
        await responseJson(response);

      if (!response.ok) {
        const message =
          typeof json.error === "string"
            ? json.error
            : "Variable product creation failed.";

        throw new Error(message);
      }

      productId = Number(json.id);

      if (
        !Number.isSafeInteger(productId) ||
        productId <= 0
      ) {
        productId = 0;
        throw new Error(
          "Product creation returned an invalid response."
        );
      }

      setSubmitStage("Creating variations");

      const variationResponse = await fetch(
        `/api/products/${productId}/variations`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            variations: sizeRows.map(
              (row) => ({
                sku: variationSku(
                  sku,
                  row.option
                ),
                regular_price:
                  row.price.trim(),
                manage_stock: true,
                stock_quantity: Number(
                  row.quantity
                ),
                backorders: "no",
                attributes: [
                  {
                    id: sizeAttributeId,
                    option: row.option,
                  },
                ],
              })
            ),
          }),
        }
      );

      const variationJson =
        await responseJson(
          variationResponse
        );

      if (!variationResponse.ok) {
        const message =
          typeof variationJson.error ===
          "string"
            ? variationJson.error
            : "Size variation creation failed.";

        throw new Error(message);
      }

      const createdVariations =
        Array.isArray(
          variationJson.variations
        )
          ? variationJson.variations
          : [];

      if (
        createdVariations.length !==
        sizeRows.length
      ) {
        throw new Error(
          `Only ${createdVariations.length} of ${sizeRows.length} size variations were created.`
        );
      }

      await completeProductCreate(productId);
    } catch (error: unknown) {
      const partialIds =
        error instanceof Error &&
        "uploadedIds" in error &&
        Array.isArray(
          (
            error as Error & {
              uploadedIds?: unknown;
            }
          ).uploadedIds
        )
          ? (
              error as Error & {
                uploadedIds: number[];
              }
            ).uploadedIds
          : [];

      const cleanupIds =
        uploadedIds.length > 0
          ? uploadedIds
          : partialIds;

      if (productId === 0) {
        await deleteUploadedMedia(
          cleanupIds
        );
      }

      const rawMessage =
        error instanceof Error
          ? error.message
          : "Size product creation failed.";

      const message =
        productId > 0
          ? `${rawMessage} Product #${productId} was created, but its size variations were not completed.`
          : rawMessage;

      setSubmitError(message);
      notifyProductCreateError(
        message
      );

      if (
        rawMessage === "SKU already taken"
      ) {
        setSkuTaken(true);
      }
    } finally {
      setSubmitStage(null);
      setSubmitting(false);
    }
  }

  async function createColourProduct() {
    const effectiveStatus =
      requestedStatusRef.current ?? status;

    if (
      submitting ||
      selectedProductType !== "variable-colour"
    ) {
      return;
    }

    if (
      !selectedCategory ||
      selectedCategory.id <= 0
    ) {
      const message =
        "Select a saved product category.";

      setSubmitError(message);
      notifyProductCreateError(
        message
      );
      return;
    }

    let uploadedIds: number[] = [];
    let productId = 0;

    try {
      setSubmitting(true);
      setSubmitError(null);
      setConfirmation(null);

      setSubmitStage("Checking SKUs");

      await Promise.all([
        verifySkuBeforeUpload(),
        verifyVariationSkusBeforeUpload(
          colourRows
        ),
      ]);

      setSubmitStage("Preparing colours");

      const colourAttributeId =
        await ensureColourAttribute(
          colourRows.map(
            (row) => row.option
          )
        );

      const imageCount =
        colourRows.reduce(
          (total, row) =>
            total + row.photos.length,
          0
        );

      setSubmitStage(
        `Preparing and uploading 0 of ${imageCount} images`
      );

      const uploadedGalleries =
        await uploadColourGalleries(
          colourRows,
          (completed, total) => {
            setSubmitStage(
              `Preparing and uploading ${completed} of ${total} images`
            );
          }
        );

      uploadedIds =
        uploadedGalleries.flatMap(
          (gallery) => gallery.imageIds
        );

      const parentImageIds =
        Array.from(
          new Set(uploadedIds)
        ).slice(0, 20);

      const colourSearchParts: string[] = [];

      for (const row of colourRows) {
        const option = row.option.trim();
        if (!option) continue;

        const nextValue = [
          ...colourSearchParts,
          option,
        ].join(", ");

        if (nextValue.length > 100) {
          break;
        }

        colourSearchParts.push(option);
      }

      const payload: JsonRecord = {
        type: "variable",
        name: productName.trim(),
        sku: sku.trim(),
        status: effectiveStatus,
        catalog_visibility: visibility,
        short_description:
          shortDescription.trim(),
        description: description.trim(),
        weight: weight.trim(),
        categories: [
          {
            id: selectedCategory.id,
          },
        ],
        tags: tags.map((name) => ({
          name,
        })),
        images: parentImageIds.map(
          (id, position) => ({
            id,
            position,
          })
        ),
        attributes: [
          {
            id: colourAttributeId,
            visible: true,
            variation: true,
            options: colourRows.map(
              (row) => row.option
            ),
          },
        ],
      };

      if (dimensionsEnabled) {
        payload.dimensions = {
          length: length.trim(),
          width: width.trim(),
          height: height.trim(),
        };
      }

      if (colourSearchParts.length > 0) {
        payload.color =
          colourSearchParts.join(", ");
      }

      setSubmitStage("Creating product");

      const response = await fetch(
        "/api/products/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json =
        await responseJson(response);

      if (!response.ok) {
        const message =
          typeof json.error === "string"
            ? json.error
            : "Colour product creation failed.";

        throw new Error(message);
      }

      productId = Number(json.id);

      if (
        !Number.isSafeInteger(productId) ||
        productId <= 0
      ) {
        productId = 0;
        throw new Error(
          "Product creation returned an invalid response."
        );
      }

      setSubmitStage("Creating variations");

      const variationResponse = await fetch(
        `/api/products/${productId}/variations`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            variations: colourRows.map(
              (row) => {
                const gallery =
                  uploadedGalleries.find(
                    (item) =>
                      item.rowId === row.id
                  );

                const mainImageId =
                  gallery?.imageIds[0] ?? 0;

                return {
                  sku: variationSku(
                    sku,
                    row.option
                  ),
                  regular_price:
                    row.price.trim(),
                  manage_stock: true,
                  stock_quantity: Number(
                    row.quantity
                  ),
                  backorders: "no",
                  attributes: [
                    {
                      id: colourAttributeId,
                      option: row.option,
                    },
                  ],
                  image: {
                    id: mainImageId,
                  },
                };
              }
            ),
          }),
        }
      );

      const variationJson =
        await responseJson(
          variationResponse
        );

      if (!variationResponse.ok) {
        const message =
          typeof variationJson.error ===
          "string"
            ? variationJson.error
            : "Colour variation creation failed.";

        throw new Error(message);
      }

      const createdVariations =
        Array.isArray(
          variationJson.variations
        )
          ? variationJson.variations
          : [];

      if (
        createdVariations.length !==
        colourRows.length
      ) {
        throw new Error(
          `Only ${createdVariations.length} of ${colourRows.length} colour variations were created.`
        );
      }

      const variationIdsBySku =
        new Map<string, number>();

      for (
        const item of createdVariations
      ) {
        if (!isRecord(item)) continue;

        const id = Number(item.id);
        const itemSku =
          typeof item.sku === "string"
            ? item.sku.trim().toUpperCase()
            : "";

        if (
          Number.isSafeInteger(id) &&
          id > 0 &&
          itemSku
        ) {
          variationIdsBySku.set(
            itemSku,
            id
          );
        }
      }

      const galleryPayload =
        uploadedGalleries.map(
          (gallery) => {
            const expectedSku =
              variationSku(
                sku,
                gallery.option
              ).toUpperCase();

            const variationId =
              variationIdsBySku.get(
                expectedSku
              );

            if (!variationId) {
              throw new Error(
                `Unable to match the ${gallery.option} variation to its gallery.`
              );
            }

            return {
              variation_id: variationId,
              image_ids: gallery.imageIds,
            };
          }
        );

      setSubmitStage(
        "Saving colour galleries"
      );

      const galleryResponse = await fetch(
        `/api/products/${productId}/variation-galleries`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            galleries: galleryPayload,
          }),
        }
      );

      const galleryJson =
        await responseJson(
          galleryResponse
        );

      if (
        !galleryResponse.ok ||
        galleryJson.ok !== true
      ) {
        const message =
          typeof galleryJson.error ===
          "string"
            ? galleryJson.error
            : "Colour gallery creation failed.";

        throw new Error(message);
      }

      if (
        Number(
          galleryJson.updated_count
        ) !== colourRows.length
      ) {
        throw new Error(
          `Only ${Number(
            galleryJson.updated_count
          ) || 0} of ${colourRows.length} colour galleries were saved.`
        );
      }

      await completeProductCreate(productId);
    } catch (error: unknown) {
      const partialIds =
        error instanceof Error &&
        "uploadedIds" in error &&
        Array.isArray(
          (
            error as Error & {
              uploadedIds?: unknown;
            }
          ).uploadedIds
        )
          ? (
              error as Error & {
                uploadedIds: number[];
              }
            ).uploadedIds
          : [];

      const cleanupIds =
        uploadedIds.length > 0
          ? uploadedIds
          : partialIds;

      if (productId === 0) {
        await deleteUploadedMedia(
          cleanupIds
        );
      }

      const rawMessage =
        error instanceof Error
          ? error.message
          : "Colour product creation failed.";

      const message =
        productId > 0
          ? `${rawMessage} Product #${productId} was created, but its colour setup was not completed.`
          : rawMessage;

      setSubmitError(message);
      notifyProductCreateError(
        message
      );

      if (
        rawMessage === "SKU already taken"
      ) {
        setSkuTaken(true);
      }
    } finally {
      setSubmitStage(null);
      setSubmitting(false);
    }
  }

  async function createSimpleProduct() {
    const effectiveStatus =
      requestedStatusRef.current ?? status;

    if (
      submitting ||
      selectedProductType !== "simple"
    ) {
      return;
    }

    if (
      !selectedCategory ||
      selectedCategory.id <= 0
    ) {
      const message =
        "Select a saved product category.";

      setSubmitError(message);
      notifyProductCreateError(
        message
      );
      return;
    }

    let uploadedIds: number[] = [];

    try {
      setSubmitting(true);
      setSubmitError(null);
      setConfirmation(null);

      setSubmitStage("Checking SKU");

      await verifySkuBeforeUpload();

      setSubmitStage(
        `Preparing and uploading 0 of ${localPhotos.length} images`
      );

      uploadedIds =
        await uploadProductPhotos(
          localPhotos,
          (completed, total) => {
            setSubmitStage(
              `Preparing and uploading ${completed} of ${total} images`
            );
          }
        );

      setSubmitStage("Creating product");

      const payload: JsonRecord = {
        type: "simple",
        name: productName.trim(),
        status: effectiveStatus,
        catalog_visibility: visibility,
        short_description:
          shortDescription.trim(),
        description: description.trim(),
        regular_price:
          regularPrice.trim(),
        manage_stock: true,
        stock_quantity: Number(
          stockQuantity
        ),
        weight: weight.trim(),
        categories: [
          {
            id: selectedCategory.id,
          },
        ],
        tags: tags.map((name) => ({
          name,
        })),
        images: uploadedIds.map(
          (id, position) => ({
            id,
            position,
          })
        ),
      };

      if (sku.trim()) {
        payload.sku = sku.trim();
      }

      if (dimensionsEnabled) {
        payload.dimensions = {
          length: length.trim(),
          width: width.trim(),
          height: height.trim(),
        };
      }

      if (color.trim()) {
        payload.color = color.trim();
      }

      const response = await fetch(
        "/api/products/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json: unknown =
        await response.json();

      if (!response.ok) {
        const message =
          isRecord(json) &&
          typeof json.error === "string"
            ? json.error
            : "Product creation failed.";

        throw new Error(message);
      }

      const productId =
        isRecord(json)
          ? Number(json.id)
          : 0;

      if (
        !Number.isSafeInteger(productId) ||
        productId <= 0
      ) {
        throw new Error(
          "Product creation returned an invalid response."
        );
      }

      await completeProductCreate(productId);
    } catch (error: unknown) {
      const partialIds =
        error instanceof Error &&
        "uploadedIds" in error &&
        Array.isArray(
          (
            error as Error & {
              uploadedIds?: unknown;
            }
          ).uploadedIds
        )
          ? (
              error as Error & {
                uploadedIds: number[];
              }
            ).uploadedIds
          : [];

      const cleanupIds =
        uploadedIds.length > 0
          ? uploadedIds
          : partialIds;

      await deleteUploadedMedia(
        cleanupIds
      );

      const message =
        error instanceof Error
          ? error.message
          : "Product creation failed.";

      setSubmitError(message);
      notifyProductCreateError(
        message
      );

      if (
        message === "SKU already taken"
      ) {
        setSkuTaken(true);
      }
    } finally {
      setSubmitStage(null);
      setSubmitting(false);
    }
  }

  const guidedInfoValid =
    selectedCategory !== null &&
    identityIsValid;

  const guidedDescriptionValid =
    shortDescription.trim().length >= 5;

  const guidedPhotosValid =
    selectedProductType ===
      "variable-colour"
      ? colourImagesAreValid
      : localPhotos.length > 0;

  const guidedVariationsValid =
    selectedProductType ===
      "variable-size"
      ? sizeVariationsAreValid
      : selectedProductType ===
          "variable-colour"
        ? colourVariationsAreValid
        : true;

  const guidedPricingValid =
    selectedProductType !== "simple" ||
    (
      priceIsValid(regularPrice) &&
      quantityIsValid(stockQuantity)
    );

  const guidedReadyToSubmit =
    selectedProductType !== null &&
    guidedInfoValid &&
    guidedDescriptionValid &&
    guidedPhotosValid &&
    guidedVariationsValid &&
    guidedPricingValid;

  function firstIncompleteGuidedSection():
    GuidedSection {
    if (!selectedProductType) {
      return "type";
    }

    if (!guidedInfoValid) {
      return "info";
    }

    if (
      selectedProductType !== "simple" &&
      !guidedVariationsValid
    ) {
      return "variations";
    }

    if (!guidedPhotosValid) {
      return "photos";
    }

    if (
      selectedProductType === "simple" &&
      !guidedPricingValid
    ) {
      return "pricing";
    }

    if (!guidedDescriptionValid) {
      return "description";
    }

    return "review";
  }

  async function submitGuidedProduct(
    requestedStatus:
      | "draft"
      | "publish"
  ) {
    setSubmitError(null);

    if (!guidedReadyToSubmit) {
      const target =
        firstIncompleteGuidedSection();

      setSubmitError(
        "Complete all required fields before saving the product."
      );
      unlockAndOpen(target);
      return;
    }

    requestedStatusRef.current =
      requestedStatus;

    if (editMode) {
      await updateExistingProduct();
      return;
    }

    if (
      selectedProductType === "simple"
    ) {
      await createSimpleProduct();
      return;
    }

    if (
      selectedProductType ===
      "variable-size"
    ) {
      await createSizeProduct();
      return;
    }

    if (
      selectedProductType ===
      "variable-colour"
    ) {
      await createColourProduct();
    }
  }

  function goToScreen(screen: WizardScreen) {
    const index = flow.indexOf(screen);
    if (index >= 0) {
      setStep(index + 1);
      setConfirmation(null);
    }
  }

  function goBack() {
    setConfirmation(null);

    if (step <= 1) {
      window.history.back();
      return;
    }

    setStep((current) => Math.max(1, current - 1));
  }

  async function continueWizard() {
    setConfirmation(null);

    if (
      !canContinue ||
      submitting
    ) {
      return;
    }

    if (currentScreen === "publish") {
      if (editMode) {
        await updateExistingProduct();
        return;
      }

      if (
        selectedProductType === "simple"
      ) {
        await createSimpleProduct();
        return;
      }

      if (
        selectedProductType === "variable-size"
      ) {
        await createSizeProduct();
        return;
      }

      if (
        selectedProductType === "variable-colour"
      ) {
        await createColourProduct();
        return;
      }

      setConfirmation(
        `Preview ready as ${
          status === "publish"
            ? "Published"
            : "Draft"
        } and ${
          visibility === "visible"
            ? "Visible"
            : "Hidden"
        }. This product type is not connected yet.`
      );
      return;
    }

    setStep((current) =>
      Math.min(totalSteps, current + 1)
    );
  }

  const actionLabel =
    currentScreen === "publish"
      ? editMode
        ? "Update Product"
        : "Create Product"
      : "Continue";

  if (editLoading) {
    return (
      <main className="mx-auto flex min-h-[420px] w-full max-w-6xl items-center justify-center rounded-2xl border border-border bg-card">
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <div className="text-sm font-bold text-heading">
            Loading product into the wizard…
          </div>
          <div className="text-xs text-muted-foreground">
            Product details, variations and images are being prepared.
          </div>
        </div>
      </main>
    );
  }

  if (editLoadError) {
    return (
      <main className="mx-auto w-full max-w-3xl pb-28 md:pb-8">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="text-sm font-extrabold text-destructive">
            Product could not be opened for editing
          </div>
          <div className="mt-1 text-sm text-destructive">
            {editLoadError}
          </div>
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground"
          >
            Back to Products
          </button>
        </div>
      </main>
    );
  }

  if (successResult) {
    return (
      <main className="mx-auto w-full max-w-3xl pb-6 md:pb-10">
        <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_14px_40px_rgba(23,35,60,0.08)]">
          <div className="bg-emerald-600 px-5 py-8 text-center text-white md:px-8 md:py-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/16">
              <CheckCircle2 className="h-9 w-9" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
              {successResult.kind === "updated"
                ? "Product Updated Successfully"
                : successResult.status === "publish"
                  ? "Product Created Successfully"
                  : "Product Saved as Draft"}
            </h1>
            <p className="mt-2 text-sm font-semibold text-emerald-50">
              {successResult.productName}
            </p>
          </div>

          <div className="space-y-3 p-5 md:p-7">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/products/${successResult.productId}`
                )
              }
              className="ls-focus-ring flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white shadow-sm"
            >
              View Product
            </button>

            {successResult.kind === "created" ? (
              <button
                type="button"
                onClick={() => {
                  bypassLeaveRef.current = true;
                  window.location.assign(
                    "/products/add"
                  );
                }}
                className="ls-focus-ring flex min-h-12 w-full items-center justify-center rounded-xl border border-[#C8D4E2] bg-white px-4 text-sm font-extrabold text-[#1F63D8]"
              >
                Add Another Product
              </button>
            ) : null}

            <button
              type="button"
              onClick={() =>
                router.push("/products")
              }
              className="ls-focus-ring flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-bold text-[#64748B]"
            >
              Back to Products
            </button>
          </div>
        </section>
      </main>
    );
  }

  const sectionSummary = (
    section: GuidedSection
  ) => {
    switch (section) {
      case "type":
        return (
          selectedTypeDetails?.title ||
          "Choose product type"
        );
      case "info":
        return [
          productName.trim(),
          selectedCategory?.name,
        ]
          .filter(Boolean)
          .join(" · ");
      case "variations":
        return selectedProductType ===
          "variable-size"
          ? `${sizeRows.length} size${sizeRows.length === 1 ? "" : "s"} configured`
          : `${colourRows.length} colour${colourRows.length === 1 ? "" : "s"} configured`;
      case "photos":
        return selectedProductType ===
          "variable-colour"
          ? `${colourRows.filter((row) => row.photos.length > 0).length}/${colourRows.length} colours completed`
          : `${localPhotos.length}/5 photos`;
      case "pricing":
        return regularPrice
          ? `₹${regularPrice} · Qty ${stockQuantity || "0"}`
          : "Price and quantity";
      case "description":
        return shortDescription.trim()
          ? shortDescription.trim().slice(0, 60)
          : "Product description";
      case "extra":
        return "Optional product details";
      case "review":
        return editMode
          ? "Ready to update"
          : "Ready to create";
    }
  };

  const isSectionComplete = (
    section: GuidedSection
  ) => {
    switch (section) {
      case "type":
        return selectedProductType !== null;
      case "info":
        return guidedInfoValid;
      case "variations":
        return guidedVariationsValid;
      case "photos":
        return guidedPhotosValid;
      case "pricing":
        return guidedPricingValid;
      case "description":
        return guidedDescriptionValid;
      case "extra":
        return true;
      case "review":
        return guidedReadyToSubmit;
    }
  };

  const sectionCardClass = (
    section: GuidedSection
  ) =>
    [
      "scroll-mt-24 overflow-hidden rounded-2xl border bg-white transition-all duration-200",
      openSection === section
        ? "border-[#9CB8D8] shadow-[0_10px_28px_rgba(23,35,60,0.08)]"
        : "border-[#D7E0EA] shadow-[0_4px_14px_rgba(23,35,60,0.04)]",
    ].join(" ");

  const sectionHead = (
    section: GuidedSection,
    title: string,
    requirement:
      | "Required"
      | "Optional",
    icon: React.ReactNode
  ) => {
    const complete =
      isSectionComplete(section);
    const expanded =
      openSection === section;

    return (
      <button
        type="button"
        onClick={() =>
          setOpenSection(
            expanded ? section : section
          )
        }
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E8EFF8] text-[#1F63D8]">
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-extrabold text-[#17233C]">
              {title}
            </span>
            {complete && !expanded ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-700">
                <Check className="h-3 w-3" />
                Completed
              </span>
            ) : (
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold",
                  requirement === "Required"
                    ? "bg-[#EEF5FF] text-[#1F63D8]"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {requirement}
              </span>
            )}
          </span>

          {!expanded ? (
            <span className="mt-1 block truncate text-xs text-[#6B748A]">
              {sectionSummary(section)}
            </span>
          ) : null}
        </span>

        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#718096]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[#718096]" />
        )}
      </button>
    );
  };

  const nextAfter = (
    section: GuidedSection
  ) => {
    const order =
      guidedOrder(selectedProductType);
    const index = order.indexOf(section);
    return index >= 0
      ? order[index + 1] || null
      : null;
  };

  const advanceFrom = (
    section: GuidedSection
  ) => {
    const next =
      nextAfter(section);

    if (next) {
      unlockAndOpen(next);
    }
  };

  const activeColourRow =
    colourRows.find(
      (row) =>
        row.id === activeColourPhotoRowId
    ) || colourRows[0] || null;

  return (
    <>
      <main className="mx-auto w-full max-w-5xl pb-28 md:pb-8">
        <div className="mb-3 hidden items-center justify-between gap-4 md:flex">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#1F63D8]">
              {editMode
                ? "Product editor"
                : "New product"}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#17233C]">
              {editMode
                ? "Edit Product"
                : "Add Product"}
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              requestProductLeave(
                editMode && editProductId
                  ? `/products/${editProductId}`
                  : "/products"
              )
            }
            className="ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D7E0EA] bg-white px-4 text-sm font-bold text-[#334155]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-[#D7E0EA] bg-[#E8EFF8] px-4 py-3">
          <div className="text-sm font-extrabold text-[#17233C]">
            {editMode
              ? "Update only what you need."
              : "The app will guide you section by section."}
          </div>
          <p className="mt-1 text-xs leading-5 text-[#5E6A7F]">
            Completed sections collapse automatically into a clean summary. Tap any completed section to change it again.
          </p>
        </div>

        <div className="space-y-3">
          <section
            id="product-section-type"
            className={sectionCardClass(
              "type"
            )}
          >
            {sectionHead(
              "type",
              "Product Type",
              "Required",
              <Layers3 className="h-5 w-5" />
            )}

            {openSection === "type" ? (
              <div className="border-t border-[#E3E9F2] p-4">
                <p className="mb-3 text-xs font-semibold text-[#6B748A]">
                  {editMode
                    ? "Product type is locked while editing. You can update the product details below."
                    : "Choose how this product will be sold."}
                </p>

                <div className="grid gap-2 sm:grid-cols-3">
                  {productTypes.map(
                    (productType) => {
                      const Icon =
                        productType.icon;
                      const selected =
                        selectedProductType ===
                        productType.id;

                      return (
                        <button
                          key={productType.id}
                          type="button"
                          onClick={() =>
                            chooseGuidedProductType(
                              productType.id
                            )
                          }
                          className={[
                            "ls-focus-ring flex min-h-20 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                            selected
                              ? "border-[#1F63D8] bg-[#EEF5FF] shadow-sm"
                              : editMode
                                ? "cursor-not-allowed border-[#E2E8F0] bg-[#F8FAFC] opacity-45"
                                : "border-[#D7E0EA] bg-white hover:bg-[#F8FAFC]",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                              productType.iconClass,
                            ].join(" ")}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-extrabold text-[#17233C]">
                              {productType.id ===
                              "variable-size"
                                ? "Size Variation"
                                : productType.id ===
                                    "variable-colour"
                                  ? "Colour Variation"
                                  : "Simple Product"}
                            </span>
                            <span className="mt-0.5 block text-xs text-[#6B748A]">
                              {productType.label}
                            </span>
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {unlockedSections.includes(
            "info"
          ) ? (
            <section
              id="product-section-info"
              className={sectionCardClass(
                "info"
              )}
            >
              {sectionHead(
                "info",
                "Product Information",
                "Required",
                <Package2 className="h-5 w-5" />
              )}

              {openSection === "info" ? (
                <div className="space-y-4 border-t border-[#E3E9F2] p-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label className="text-xs font-extrabold text-[#34405F]">
                        Product Name
                      </label>
                      <span className="text-[10px] font-bold text-[#1F63D8]">
                        Required
                      </span>
                    </div>
                    <input
                      value={productName}
                      onChange={(event) => {
                        setProductName(
                          event.target.value
                        );
                        setConfirmation(null);
                      }}
                      placeholder="Example: Premium Cotton Handbag"
                      className="ls-focus-ring min-h-11 w-full rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm font-semibold text-[#17233C]"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label className="text-xs font-extrabold text-[#34405F]">
                        Category
                      </label>
                      <span className="text-[10px] font-bold text-[#1F63D8]">
                        Required
                      </span>
                    </div>

                    {selectedCategory ? (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-emerald-800">
                          {selectedCategory.name}
                        </span>
                        <button
                          type="button"
                          onClick={
                            clearSelectedCategory
                          }
                          className="text-xs font-bold text-emerald-700"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#94A3B8]" />
                        <input
                          value={query}
                          onFocus={() =>
                            setSearchFocused(
                              true
                            )
                          }
                          onChange={(event) => {
                            setQuery(
                              event.target.value
                            );
                            setSearchFocused(
                              true
                            );
                          }}
                          placeholder="Search existing category"
                          className="ls-focus-ring min-h-11 w-full rounded-xl border border-[#C8D4E2] bg-white pl-10 pr-3 text-sm"
                        />

                        {searchFocused &&
                        query.trim() ? (
                          <div className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-xl border border-[#D7E0EA] bg-white shadow-xl">
                            {suggestions.length >
                            0 ? (
                              suggestions.map(
                                (category) => (
                                  <button
                                    key={
                                      category.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      selectCategory(
                                        category
                                      )
                                    }
                                    className="flex min-h-11 w-full items-center justify-between border-b border-[#EEF2F6] px-3 text-left text-sm font-semibold text-[#34405F] last:border-0"
                                  >
                                    <span className="truncate">
                                      {
                                        category.name
                                      }
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                                  </button>
                                )
                              )
                            ) : (
                              <div className="px-3 py-3 text-xs text-[#64748B]">
                                No matching category.
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {!selectedCategory ? (
                      <button
                        type="button"
                        onClick={() =>
                          setCategoryCreateOpen(
                            (current) =>
                              !current
                          )
                        }
                        className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl text-sm font-extrabold text-[#1F63D8]"
                      >
                        <Plus className="h-4 w-4" />
                        Create New Category
                      </button>
                    ) : null}

                    {categoryCreateOpen &&
                    !selectedCategory ? (
                      <div className="mt-2 space-y-3 rounded-2xl border border-[#C8D4E2] bg-[#F8FAFC] p-3">
                        <div className="text-sm font-extrabold text-[#17233C]">
                          Create Category
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-xs font-bold text-[#34405F]">
                              Category Name
                            </label>
                            <span className="text-[10px] font-bold text-[#1F63D8]">
                              Required
                            </span>
                          </div>
                          <input
                            value={
                              newCategoryName
                            }
                            onChange={(
                              event
                            ) =>
                              setNewCategoryName(
                                event.target
                                  .value
                              )
                            }
                            className="min-h-11 w-full rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                            placeholder="Example: Travel Bags"
                          />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-xs font-bold text-[#34405F]">
                              Parent Category
                            </label>
                            <span className="text-[10px] font-bold text-slate-500">
                              Optional
                            </span>
                          </div>
                          <select
                            value={
                              newCategoryParentId
                            }
                            onChange={(
                              event
                            ) =>
                              setNewCategoryParentId(
                                Number(
                                  event.target
                                    .value
                                )
                              )
                            }
                            className="min-h-11 w-full rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                          >
                            <option value={0}>
                              No parent category
                            </option>
                            {allCategories.map(
                              (category) => (
                                <option
                                  key={
                                    category.id
                                  }
                                  value={
                                    category.id
                                  }
                                >
                                  {
                                    category.name
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-xs font-bold text-[#34405F]">
                              Category Image
                            </label>
                            <span className="text-[10px] font-bold text-slate-500">
                              Optional
                            </span>
                          </div>
                          <ImageUploader
                            purpose="category_image"
                            accept="image/*"
                            label={
                              newCategoryImage
                                ? "Replace image"
                                : "Upload image"
                            }
                            onUploaded={(
                              _url,
                              media
                            ) =>
                              setNewCategoryImage(
                                media ||
                                  null
                              )
                            }
                          />
                        </div>

                        {categoryCreateError ? (
                          <p className="text-xs font-semibold text-rose-600">
                            {
                              categoryCreateError
                            }
                          </p>
                        ) : null}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryCreateOpen(
                                false
                              );
                              setCategoryCreateError(
                                null
                              );
                            }}
                            className="min-h-10 flex-1 rounded-xl border border-[#D7E0EA] bg-white text-sm font-bold text-[#475569]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={
                              newCategoryName.trim()
                                .length < 2 ||
                              categoryCreating
                            }
                            onClick={() =>
                              void createAndSelectCategory()
                            }
                            className="min-h-10 flex-1 rounded-xl bg-[#1F63D8] text-sm font-extrabold text-white disabled:opacity-50"
                          >
                            {categoryCreating
                              ? "Creating…"
                              : "Create Category"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label className="text-xs font-extrabold text-[#34405F]">
                        SKU
                      </label>
                      <span
                        className={[
                          "text-[10px] font-bold",
                          variableProduct
                            ? "text-[#1F63D8]"
                            : "text-slate-500",
                        ].join(" ")}
                      >
                        {variableProduct
                          ? "Required"
                          : "Optional"}
                      </span>
                    </div>
                    <input
                      value={sku}
                      onChange={(event) => {
                        setSku(
                          event.target.value
                        );
                        setSkuTaken(false);
                        setSkuCheckError(
                          null
                        );
                        setConfirmation(null);
                      }}
                      placeholder={
                        variableProduct
                          ? "Base SKU for variations"
                          : "Optional product SKU"
                      }
                      className="ls-focus-ring min-h-11 w-full rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                    />
                    {skuChecking ? (
                      <p className="mt-1 text-[11px] font-semibold text-[#64748B]">
                        Checking SKU…
                      </p>
                    ) : skuTaken ? (
                      <p className="mt-1 text-[11px] font-semibold text-rose-600">
                        SKU already taken.
                      </p>
                    ) : skuCheckError ? (
                      <p className="mt-1 text-[11px] font-semibold text-amber-700">
                        {skuCheckError}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={!guidedInfoValid}
                    onClick={() =>
                      advanceFrom("info")
                    }
                    className="ls-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white disabled:opacity-40"
                  >
                    Continue
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {unlockedSections.includes(
            "variations"
          ) &&
          selectedProductType !==
            "simple" ? (
            <section
              id="product-section-variations"
              className={sectionCardClass(
                "variations"
              )}
            >
              {sectionHead(
                "variations",
                selectedProductType ===
                  "variable-size"
                  ? "Sizes, Price & Quantity"
                  : "Colours, Price & Quantity",
                "Required",
                selectedProductType ===
                  "variable-size" ? (
                  <Ruler className="h-5 w-5" />
                ) : (
                  <Palette className="h-5 w-5" />
                )
              )}

              {openSection ===
              "variations" ? (
                <div className="space-y-4 border-t border-[#E3E9F2] p-4">
                  {selectedProductType ===
                  "variable-size" ? (
                    <>
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#34405F]">
                            Choose Sizes
                          </span>
                          <span className="text-[10px] font-bold text-[#1F63D8]">
                            Required
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {commonSizes.map(
                            (size) => {
                              const row =
                                sizeRows.find(
                                  (item) =>
                                    item.option.toLowerCase() ===
                                    size.toLowerCase()
                                );

                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() =>
                                    row
                                      ? removeVariation(
                                          "size",
                                          row.id
                                        )
                                      : addVariation(
                                          "size",
                                          size
                                        )
                                  }
                                  className={[
                                    "min-h-9 rounded-xl border px-3 text-xs font-extrabold",
                                    row
                                      ? "border-[#1F63D8] bg-[#EEF5FF] text-[#1F63D8]"
                                      : "border-[#D7E0EA] bg-white text-[#475569]",
                                  ].join(
                                    " "
                                  )}
                                >
                                  {size}
                                  {row
                                    ? " ✓"
                                    : ""}
                                </button>
                              );
                            }
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <input
                            value={sizeInput}
                            onChange={(
                              event
                            ) =>
                              setSizeInput(
                                event.target
                                  .value
                              )
                            }
                            placeholder="Custom size"
                            className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              addVariation(
                                "size",
                                sizeInput
                              )
                            }
                            className="min-h-10 rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm font-bold text-[#1F63D8]"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#34405F]">
                          Add Colours
                        </span>
                        <span className="text-[10px] font-bold text-[#1F63D8]">
                          Required
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={colourInput}
                          onChange={(event) =>
                            setColourInput(
                              event.target.value
                            )
                          }
                          placeholder="Example: Maroon"
                          className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            addVariation(
                              "colour",
                              colourInput
                            )
                          }
                          className="min-h-10 rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white"
                        >
                          Add Colour
                        </button>
                      </div>
                    </div>
                  )}

                  {(selectedProductType ===
                  "variable-size"
                    ? sizeRows
                    : colourRows
                  ).length > 0 ? (
                    <>
                      <div className="rounded-xl border border-[#D7E0EA] bg-[#F8FAFC] p-3">
                        <div className="mb-2 text-xs font-extrabold text-[#34405F]">
                          Same price for all
                          <span className="ml-2 text-[10px] font-bold text-slate-500">
                            Optional shortcut
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative min-w-0 flex-1">
                            <IndianRupee className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
                            <input
                              value={
                                sharedVariationPrice
                              }
                              onChange={(
                                event
                              ) =>
                                setSharedVariationPrice(
                                  event.target
                                    .value
                                )
                              }
                              inputMode="decimal"
                              placeholder="799"
                              className="min-h-10 w-full rounded-xl border border-[#C8D4E2] bg-white pl-9 pr-3 text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const value =
                                sharedVariationPrice.trim();
                              if (
                                !priceIsValid(
                                  value
                                )
                              ) {
                                return;
                              }
                              const setter =
                                selectedProductType ===
                                "variable-size"
                                  ? setSizeRows
                                  : setColourRows;
                              setter(
                                (current) =>
                                  current.map(
                                    (row) => ({
                                      ...row,
                                      price:
                                        value,
                                    })
                                  )
                              );
                            }}
                            className="min-h-10 rounded-xl border border-[#C8D4E2] bg-white px-3 text-xs font-extrabold text-[#1F63D8]"
                          >
                            Apply
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {(selectedProductType ===
                        "variable-size"
                          ? sizeRows
                          : colourRows
                        ).map((row) => (
                          <div
                            key={row.id}
                            className="rounded-xl border border-[#D7E0EA] bg-white p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-extrabold text-[#17233C]">
                                {row.option}
                              </span>
                              <button
                                type="button"
                                aria-label={`Remove ${row.option}`}
                                onClick={() =>
                                  removeVariation(
                                    selectedProductType ===
                                      "variable-size"
                                      ? "size"
                                      : "colour",
                                    row.id
                                  )
                                }
                                className="grid h-8 w-8 place-items-center rounded-lg text-rose-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="mb-1 flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-[#64748B]">
                                    Price
                                  </label>
                                  <span className="text-[9px] font-bold text-[#1F63D8]">
                                    Required
                                  </span>
                                </div>
                                <input
                                  value={
                                    row.price
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateVariation(
                                      selectedProductType ===
                                        "variable-size"
                                        ? "size"
                                        : "colour",
                                      row.id,
                                      {
                                        price:
                                          event
                                            .target
                                            .value,
                                      }
                                    )
                                  }
                                  inputMode="decimal"
                                  placeholder="₹"
                                  className="min-h-10 w-full rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                                />
                              </div>
                              <div>
                                <div className="mb-1 flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-[#64748B]">
                                    Quantity
                                  </label>
                                  <span className="text-[9px] font-bold text-[#1F63D8]">
                                    Required
                                  </span>
                                </div>
                                <input
                                  value={
                                    row.quantity
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateVariation(
                                      selectedProductType ===
                                        "variable-size"
                                        ? "size"
                                        : "colour",
                                      row.id,
                                      {
                                        quantity:
                                          event
                                            .target
                                            .value,
                                      }
                                    )
                                  }
                                  inputMode="numeric"
                                  placeholder="0"
                                  className="min-h-10 w-full rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#C8D4E2] bg-[#F8FAFC] px-4 py-6 text-center text-xs font-semibold text-[#64748B]">
                      {selectedProductType ===
                      "variable-size"
                        ? "Choose at least one size."
                        : "Add at least one colour."}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={
                      !guidedVariationsValid
                    }
                    onClick={() =>
                      advanceFrom(
                        "variations"
                      )
                    }
                    className="ls-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white disabled:opacity-40"
                  >
                    Continue to Photos
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {unlockedSections.includes(
            "photos"
          ) ? (
            <section
              id="product-section-photos"
              className={sectionCardClass(
                "photos"
              )}
            >
              {sectionHead(
                "photos",
                selectedProductType ===
                  "variable-colour"
                  ? "Photos by Colour"
                  : "Product Photos",
                "Required",
                <ImagePlus className="h-5 w-5" />
              )}

              {openSection === "photos" ? (
                <div className="space-y-4 border-t border-[#E3E9F2] p-4">
                  {selectedProductType ===
                  "variable-colour" ? (
                    <>
                      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                        {colourRows.map(
                          (row) => (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() =>
                                setActiveColourPhotoRowId(
                                  row.id
                                )
                              }
                              className={[
                                "min-h-9 shrink-0 rounded-xl border px-3 text-xs font-extrabold",
                                activeColourRow?.id ===
                                row.id
                                  ? "border-[#1F63D8] bg-[#EEF5FF] text-[#1F63D8]"
                                  : "border-[#D7E0EA] bg-white text-[#475569]",
                              ].join(
                                " "
                              )}
                            >
                              {row.option}
                              {row.photos.length >
                              0
                                ? " ✓"
                                : ""}
                            </button>
                          )
                        )}
                      </div>

                      {activeColourRow ? (
                        <div className="rounded-2xl border border-[#D7E0EA] bg-[#F8FAFC] p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-extrabold text-[#17233C]">
                                {
                                  activeColourRow.option
                                }{" "}
                                photos
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold text-[#64748B]">
                                At least 1 · Maximum 3
                              </div>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-[#1F63D8]">
                              {
                                activeColourRow
                                  .photos
                                  .length
                              }
                              /3
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {activeColourRow.photos.map(
                              (
                                photo,
                                index
                              ) => (
                                <div
                                  key={
                                    photo.id
                                  }
                                  className="relative aspect-square overflow-hidden rounded-xl border border-[#D7E0EA] bg-white"
                                >
                                  <img
                                    src={
                                      photo.url
                                    }
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                  {index ===
                                  0 ? (
                                    <span className="absolute left-1.5 top-1.5 rounded-full bg-[#17233C]/85 px-2 py-0.5 text-[9px] font-bold text-white">
                                      Main
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeVariationPhoto(
                                        activeColourRow.id,
                                        photo.id
                                      )
                                    }
                                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-rose-600 shadow-sm"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )
                            )}

                            {activeColourRow
                              .photos.length <
                            3 ? (
                              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#B8C7D9] bg-white text-center text-[#1F63D8]">
                                <ImagePlus className="h-5 w-5" />
                                <span className="mt-1 text-[10px] font-extrabold">
                                  Add Photos
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(
                                    event
                                  ) => {
                                    addVariationPhotos(
                                      activeColourRow.id,
                                      event
                                        .target
                                        .files
                                    );
                                    event.currentTarget.value =
                                      "";
                                  }}
                                />
                              </label>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div className="text-[11px] font-semibold text-[#64748B]">
                        Each colour needs at least one photo. Maximum 3 photos per colour.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-extrabold text-[#17233C]">
                            Product Gallery
                          </div>
                          <div className="mt-0.5 text-[11px] font-semibold text-[#64748B]">
                            At least 1 · Maximum 5
                          </div>
                        </div>
                        <span className="rounded-full bg-[#EEF5FF] px-2.5 py-1 text-[10px] font-extrabold text-[#1F63D8]">
                          {localPhotos.length}
                          /5
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {localPhotos.map(
                          (
                            photo,
                            index
                          ) => (
                            <div
                              key={photo.id}
                              className="relative aspect-square overflow-hidden rounded-xl border border-[#D7E0EA] bg-white"
                            >
                              <img
                                src={photo.url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              {index === 0 ? (
                                <span className="absolute left-1.5 top-1.5 rounded-full bg-[#17233C]/85 px-2 py-0.5 text-[9px] font-bold text-white">
                                  Main
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  removePhoto(
                                    photo.id
                                  )
                                }
                                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-rose-600 shadow-sm"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )
                        )}

                        {localPhotos.length <
                        5 ? (
                          <button
                            type="button"
                            onClick={() =>
                              photoInputRef.current?.click()
                            }
                            className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#B8C7D9] bg-[#F8FAFC] text-[#1F63D8]"
                          >
                            <ImagePlus className="h-5 w-5" />
                            <span className="mt-1 text-[10px] font-extrabold">
                              Add Photos
                            </span>
                          </button>
                        ) : null}
                      </div>

                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          addPhotos(
                            event.target.files
                          );
                          event.currentTarget.value =
                            "";
                        }}
                      />
                    </>
                  )}

                  <button
                    type="button"
                    disabled={
                      !guidedPhotosValid
                    }
                    onClick={() =>
                      advanceFrom("photos")
                    }
                    className="ls-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white disabled:opacity-40"
                  >
                    Continue
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {unlockedSections.includes(
            "pricing"
          ) &&
          selectedProductType ===
            "simple" ? (
            <section
              id="product-section-pricing"
              className={sectionCardClass(
                "pricing"
              )}
            >
              {sectionHead(
                "pricing",
                "Price & Quantity",
                "Required",
                <IndianRupee className="h-5 w-5" />
              )}

              {openSection === "pricing" ? (
                <div className="space-y-4 border-t border-[#E3E9F2] p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-extrabold text-[#34405F]">
                          Selling Price
                        </label>
                        <span className="text-[9px] font-bold text-[#1F63D8]">
                          Required
                        </span>
                      </div>
                      <input
                        value={regularPrice}
                        onChange={(
                          event
                        ) =>
                          setRegularPrice(
                            event.target.value
                          )
                        }
                        inputMode="decimal"
                        placeholder="₹ 799"
                        className="min-h-11 w-full rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                      />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-extrabold text-[#34405F]">
                          Quantity
                        </label>
                        <span className="text-[9px] font-bold text-[#1F63D8]">
                          Required
                        </span>
                      </div>
                      <input
                        value={stockQuantity}
                        onChange={(
                          event
                        ) =>
                          setStockQuantity(
                            event.target.value
                          )
                        }
                        inputMode="numeric"
                        placeholder="0"
                        className="min-h-11 w-full rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] font-semibold text-[#64748B]">
                    LetzShopy manages stock status automatically from the quantity.
                  </p>

                  <button
                    type="button"
                    disabled={
                      !guidedPricingValid
                    }
                    onClick={() =>
                      advanceFrom("pricing")
                    }
                    className="ls-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white disabled:opacity-40"
                  >
                    Continue
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {unlockedSections.includes(
            "description"
          ) ? (
            <section
              id="product-section-description"
              className={sectionCardClass(
                "description"
              )}
            >
              {sectionHead(
                "description",
                "Product Description",
                "Required",
                <FileText className="h-5 w-5" />
              )}

              {openSection ===
              "description" ? (
                <div className="space-y-4 border-t border-[#E3E9F2] p-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-extrabold text-[#34405F]">
                        Short Selling Summary
                      </label>
                      <span className="text-[10px] font-bold text-[#1F63D8]">
                        Required
                      </span>
                    </div>
                    <textarea
                      value={shortDescription}
                      rows={3}
                      onChange={(event) => {
                        setShortDescription(
                          event.target.value
                        );
                        setShortDescriptionEdited(
                          true
                        );
                      }}
                      placeholder="A short summary customers can understand quickly."
                      className="w-full resize-none rounded-xl border border-[#C8D4E2] bg-white px-3 py-3 text-sm leading-5"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-extrabold text-[#34405F]">
                        Detailed Information
                      </label>
                      <span className="text-[10px] font-bold text-slate-500">
                        Optional
                      </span>
                    </div>
                    <textarea
                      value={description}
                      rows={5}
                      onChange={(event) => {
                        setDescription(
                          event.target.value
                        );
                        setDescriptionEdited(
                          true
                        );
                      }}
                      placeholder="Material, design, care instructions or other useful details."
                      className="w-full resize-none rounded-xl border border-[#C8D4E2] bg-white px-3 py-3 text-sm leading-5"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={
                      !guidedDescriptionValid
                    }
                    onClick={() =>
                      advanceFrom(
                        "description"
                      )
                    }
                    className="ls-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white disabled:opacity-40"
                  >
                    Continue
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {unlockedSections.includes(
            "extra"
          ) ? (
            <section
              id="product-section-extra"
              className={sectionCardClass(
                "extra"
              )}
            >
              {sectionHead(
                "extra",
                "Additional Details",
                "Optional",
                <Tag className="h-5 w-5" />
              )}

              {openSection === "extra" ? (
                <div className="space-y-4 border-t border-[#E3E9F2] p-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-extrabold text-[#34405F]">
                        Weight (kg)
                      </label>
                      <span className="text-[10px] font-bold text-slate-500">
                        Optional
                      </span>
                    </div>
                    <input
                      value={weight}
                      onChange={(event) =>
                        setWeight(
                          event.target.value
                        )
                      }
                      inputMode="decimal"
                      placeholder="Example: 0.5"
                      className="min-h-11 w-full rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                    />
                  </div>

                  <div className="rounded-xl border border-[#D7E0EA] bg-[#F8FAFC] p-3">
                    <label className="flex items-center justify-between gap-3">
                      <span>
                        <span className="block text-xs font-extrabold text-[#34405F]">
                          Dimensions
                        </span>
                        <span className="mt-0.5 block text-[10px] font-semibold text-[#64748B]">
                          Optional
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={
                          dimensionsEnabled
                        }
                        onChange={(
                          event
                        ) =>
                          setDimensionsEnabled(
                            event.target
                              .checked
                          )
                        }
                        className="h-5 w-5"
                      />
                    </label>

                    {dimensionsEnabled ? (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[
                          [
                            "Length",
                            length,
                            setLength,
                          ],
                          [
                            "Width",
                            width,
                            setWidth,
                          ],
                          [
                            "Height",
                            height,
                            setHeight,
                          ],
                        ].map(
                          ([
                            label,
                            value,
                            setter,
                          ]) => (
                            <div
                              key={
                                label as string
                              }
                            >
                              <label className="mb-1 block text-[10px] font-bold text-[#64748B]">
                                {label as string}
                              </label>
                              <input
                                value={
                                  value as string
                                }
                                onChange={(
                                  event
                                ) =>
                                  (
                                    setter as (
                                      value: string
                                    ) => void
                                  )(
                                    event
                                      .target
                                      .value
                                  )
                                }
                                inputMode="decimal"
                                placeholder="cm"
                                className="min-h-10 w-full rounded-xl border border-[#C8D4E2] bg-white px-2 text-sm"
                              />
                            </div>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-extrabold text-[#34405F]">
                        Tags
                      </label>
                      <span className="text-[10px] font-bold text-slate-500">
                        Optional
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(event) =>
                          setTagInput(
                            event.target.value
                          )
                        }
                        placeholder="Example: cotton"
                        className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addTag(tagInput)
                        }
                        className="min-h-10 rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm font-bold text-[#1F63D8]"
                      >
                        Add
                      </button>
                    </div>

                    {tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              removeTag(tag)
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-[#EEF5FF] px-3 py-1.5 text-xs font-bold text-[#1F63D8]"
                          >
                            {tag}
                            <X className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      advanceFrom("extra")
                    }
                    className="ls-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white"
                  >
                    Continue to Review
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {unlockedSections.includes(
            "review"
          ) ? (
            <section
              id="product-section-review"
              className={sectionCardClass(
                "review"
              )}
            >
              {sectionHead(
                "review",
                editMode
                  ? "Review & Update"
                  : "Review & Create",
                "Required",
                <CheckCircle2 className="h-5 w-5" />
              )}

              {openSection === "review" ? (
                <div className="space-y-4 border-t border-[#E3E9F2] p-4">
                  <div className="rounded-2xl bg-[#F8FAFC] p-4">
                    <div className="flex items-start gap-3">
                      {(selectedProductType ===
                        "variable-colour"
                        ? colourRows[0]
                            ?.photos?.[0]?.url
                        : localPhotos[0]
                            ?.url) ? (
                        <img
                          src={
                            selectedProductType ===
                            "variable-colour"
                              ? colourRows[0]
                                  ?.photos?.[0]
                                  ?.url
                              : localPhotos[0]
                                  ?.url
                          }
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-xl border border-[#D7E0EA] object-cover"
                        />
                      ) : (
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[#E8EFF8] text-[#1F63D8]">
                          <Package2 className="h-6 w-6" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="truncate text-base font-extrabold text-[#17233C]">
                          {productName.trim() ||
                            "Product"}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[#64748B]">
                          {selectedCategory?.name ||
                            "No category"}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#475569]">
                            {selectedTypeDetails?.title}
                          </span>
                          {selectedProductType ===
                          "simple" ? (
                            <>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#475569]">
                                ₹
                                {regularPrice ||
                                  "—"}
                              </span>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#475569]">
                                Qty{" "}
                                {stockQuantity ||
                                  "0"}
                              </span>
                            </>
                          ) : (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#475569]">
                              {selectedProductType ===
                              "variable-size"
                                ? sizeRows.length
                                : colourRows.length}{" "}
                              variations
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {editMode ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#34405F]">
                          Product Status
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          Optional change
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setStatus("publish")
                          }
                          className={[
                            "min-h-10 rounded-xl border text-sm font-extrabold",
                            status ===
                            "publish"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-[#D7E0EA] bg-white text-[#64748B]",
                          ].join(" ")}
                        >
                          Published
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStatus("draft")
                          }
                          className={[
                            "min-h-10 rounded-xl border text-sm font-extrabold",
                            status === "draft"
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : "border-[#D7E0EA] bg-white text-[#64748B]",
                          ].join(" ")}
                        >
                          Draft
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {submitError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700">
                      {submitError}
                    </div>
                  ) : null}

                  {!guidedReadyToSubmit ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold leading-5 text-amber-800">
                      Some required information is still missing. Tap the incomplete section above to finish it.
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Ready to{" "}
                      {editMode
                        ? "update"
                        : "create"}
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[65] border-t border-[#C8D4E2] bg-white/96 px-3 pb-[calc(0.75rem+var(--ls-safe-area-bottom))] pt-2.5 shadow-[0_-10px_30px_rgba(23,35,60,0.12)] backdrop-blur md:static md:mt-2 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0 md:shadow-none">
        <div className="mx-auto flex max-w-5xl gap-2">
          {!editMode ? (
            <button
              type="button"
              disabled={
                submitting ||
                !guidedReadyToSubmit
              }
              onClick={() =>
                void submitGuidedProduct(
                  "draft"
                )
              }
              className="ls-focus-ring min-h-12 flex-1 rounded-xl border border-[#C8D4E2] bg-white px-3 text-sm font-extrabold text-[#1F63D8] disabled:opacity-40"
            >
              Save Draft
            </button>
          ) : null}

          <button
            type="button"
            disabled={
              submitting ||
              !guidedReadyToSubmit
            }
            onClick={() =>
              void submitGuidedProduct(
                editMode
                  ? status
                  : "publish"
              )
            }
            className="ls-focus-ring min-h-12 flex-[1.35] rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(31,99,216,0.22)] disabled:opacity-40"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {editMode
                  ? "Updating Product…"
                  : submitStage ||
                    "Creating Product…"}
              </span>
            ) : editMode ? (
              "Update Product"
            ) : (
              "Create Product"
            )}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={(open) => {
          if (!open) {
            pendingLeaveRef.current =
              null;
            setDiscardOpen(false);
          }
        }}
        title="Discard changes?"
        description="You have unsaved product information. Leaving now will discard your changes."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        destructive
        onConfirm={
          discardProductChanges
        }
      />
    </>
  );
}
