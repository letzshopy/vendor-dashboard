"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { optimizeContentImageForUpload } from "@/lib/clientImageOptimizer";
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
  file: File;
};

type VariationRow = {
  id: string;
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
    selectedClass: "border-[#E85D4A] bg-[#FFF4F1]",
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

export default function ProductCreationWizard() {
  const router = useRouter();

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
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

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
  const [categoryCreateOpen, setCategoryCreateOpen] =
    useState(false);
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
      id: "product-create",
      title: "Creating product",
      message: submitStage,
    });
  }, [
    submitting,
    submitStage,
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
  }, [sku]);

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

    if (selected) {
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

    if (selectedPhoto) {
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

  async function completeProductCreate() {
    const createdName =
      productName.trim() ||
      "Product";

    actionFeedback.success({
      id: "product-create",
      title:
        status === "publish"
          ? "Product created"
          : "Draft created",
      message:
        `${createdName} · Opening Products…`,
      durationMs: 3200,
    });

    router.prefetch("/products");

    await new Promise<void>(
      (resolve) => {
        window.setTimeout(
          resolve,
          450
        );
      }
    );

    router.replace("/products");
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
        status,
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

      await completeProductCreate();
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
        status,
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

      await completeProductCreate();
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
        status,
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

      await completeProductCreate();
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
      ? "Create Product"
      : "Continue";

  return (
    <main
      className={[
        "mx-auto flex h-[calc(100dvh-8.75rem)] min-h-0 w-full max-w-6xl flex-col overflow-hidden bg-white md:min-h-[560px] md:max-h-[740px] md:rounded-2xl md:border md:border-[#D9DEEC] md:shadow-[0_10px_32px_rgba(35,50,102,0.08)]",
        desktopExpandedScreen
          ? "lg:h-auto lg:max-h-none lg:overflow-visible"
          : "",
      ].join(" ")}
    >
      <header className="sticky top-0 z-30 bg-[#2E3F7D] px-3 py-3 text-white md:static md:rounded-t-2xl md:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={goBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 transition active:scale-95 md:h-10 md:w-10 md:rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E85D4A] md:h-10 md:w-10 md:rounded-xl">
              <HeaderIcon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight md:text-lg">
                {meta.title}
              </h1>
              <p className="hidden truncate text-xs text-white/65 sm:block">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-wide md:px-3 md:py-1.5 md:text-[11px]">
            {step} OF {totalSteps}
          </span>
        </div>

        <div className="mt-2.5 flex gap-1 md:mt-3">
          {Array.from({ length: totalSteps }).map(
            (_, index) => (
              <span
                key={index}
                className={[
                  "h-1 flex-1 rounded-full",
                  index < step
                    ? "bg-[#FF7867]"
                    : "bg-white/20",
                ].join(" ")}
              />
            )
          )}
        </div>
      </header>

      <section
        className={[
          "flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-hidden md:px-5 md:py-4",
          desktopExpandedScreen
            ? "lg:overflow-visible"
            : "",
        ].join(" ")}
      >
        {currentScreen === "category" && (
          <div className="grid flex-1 content-start gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="border-b border-[#E7EAF2] bg-white px-1 pb-5 pt-1 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-[#26335F]">
                  Find an existing category
                </h2>
                <p className="mt-0.5 text-xs text-[#737C96]">
                  Start typing to see matching categories.
                </p>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7C849B]" />

                <input
                  value={query}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => {
                    window.setTimeout(
                      () => setSearchFocused(false),
                      120
                    );
                  }}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSearchFocused(true);
                    setConfirmation(null);
                  }}
                  placeholder="Search categories"
                  className="h-12 w-full rounded-xl border border-[#CDD3E2] bg-white pl-11 pr-11 text-sm font-semibold text-[#222B49] outline-none transition placeholder:font-normal placeholder:text-[#9299AA] focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
                />

                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#737B90] hover:bg-[#EEF0F6]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {searchFocused && query.trim() && (
                  <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-40 overflow-hidden rounded-xl border border-[#D9DEEA] bg-white shadow-[0_14px_36px_rgba(35,50,102,0.16)]">
                    {loading && (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#68718A]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading categories
                      </div>
                    )}

                    {!loading && loadError && (
                      <div className="px-4 py-3 text-sm font-medium text-[#A24438]">
                        {loadError}
                      </div>
                    )}

                    {!loading &&
                      !loadError &&
                      suggestions.length === 0 && (
                        <div className="px-4 py-3 text-sm text-[#727A90]">
                          No matching category
                        </div>
                      )}

                    {!loading &&
                      !loadError &&
                      suggestions.map((category) => {
                        const selected =
                          category.id === selectedCategoryId;

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              selectCategory(category);
                            }}
                            className={[
                              "flex w-full items-center gap-3 border-b border-[#EEF0F5] px-3 py-2.5 text-left last:border-b-0",
                              selected
                                ? "bg-[#EEF1FF]"
                                : "bg-white hover:bg-[#F7F8FC]",
                            ].join(" ")}
                          >
                            <div
                              className={[
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                selected
                                  ? "bg-[#5366B7] text-white"
                                  : "bg-[#E9ECF6] text-[#4B5C9E]",
                              ].join(" ")}
                            >
                              {selected ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <FolderTree className="h-4 w-4" />
                              )}
                            </div>

                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#252D49]">
                              {category.name}
                            </span>

                            <span className="text-[11px] font-semibold text-[#8991A4]">
                              {selected ? "Selected" : "Choose"}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#858DA2]">
                  Selected category
                </div>

                {selectedCategory ? (
                  <div className="flex min-h-14 items-center gap-3 rounded-xl border border-[#9FAAE0] bg-[#EEF1FF] px-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5366B7] text-white">
                      <Check className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[#27335F]">
                        {selectedCategory.name}
                      </div>
                      <div className="text-[11px] font-medium text-[#69759D]">
                        Product category selected
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Remove selected category"
                      onClick={clearSelectedCategory}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#5F6881] shadow-sm transition hover:text-[#D54C3B]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex min-h-14 items-center rounded-xl border border-dashed border-[#C9CFDC] bg-white px-4 text-sm font-medium text-[#8A91A3]">
                    No category selected
                  </div>
                )}
              </div>
            </div>

            <div className="border-b border-[#F1D5CE] bg-[#FFF9F7] px-1 pb-5 pt-4 md:rounded-2xl md:border md:bg-[#FFF8F6] md:p-4">
              <button
                type="button"
                aria-expanded={categoryCreateOpen}
                onClick={() =>
                  setCategoryCreateOpen(
                    (current) => !current
                  )
                }
                className="mb-0 flex w-full items-start gap-3 text-left md:mb-3 md:pointer-events-none"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E85D4A] text-white">
                  <Plus className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-[#633229]">
                    Create a new category
                  </h2>
                  <p className="mt-0.5 text-xs text-[#93675F]">
                    Add it and use it for this product.
                  </p>
                </div>

                <ChevronDown
                  className={[
                    "ml-auto mt-2 h-5 w-5 shrink-0 text-[#93675F] transition-transform md:hidden",
                    categoryCreateOpen
                      ? "rotate-180"
                      : "",
                  ].join(" ")}
                />
              </button>

              <div
                className={
                  categoryCreateOpen
                    ? "mt-3 block md:mt-0"
                    : "hidden md:block"
                }
              >
              <label
                htmlFor="new-category-name"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A6D65]"
              >
                Category name
              </label>

              <input
                id="new-category-name"
                value={newCategoryName}
                onChange={(event) => {
                  setNewCategoryName(event.target.value);
                  setCategoryCreateError(null);
                  setConfirmation(null);
                }}
                placeholder="Example: Handbags"
                className="h-12 w-full rounded-xl border border-[#E3C7C0] bg-white px-3.5 text-sm font-semibold text-[#4D2B25] outline-none transition placeholder:font-normal placeholder:text-[#B18D86] focus:border-[#E85D4A] focus:ring-4 focus:ring-[#E85D4A]/10"
              />

              <button
                type="button"
                disabled={
                  categoryCreating ||
                  newCategoryName.trim().length < 2
                }
                onClick={() =>
                  void createAndSelectCategory()
                }
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E85D4A] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(232,93,74,0.22)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-[#D8C8C4] disabled:shadow-none"
              >
                {categoryCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating category
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create & select
                  </>
                )}
              </button>

              <p
                aria-live="polite"
                className={[
                  "mt-2 text-center text-[11px] font-medium",
                  categoryCreateError
                    ? "text-[#C74636]"
                    : "text-[#A1766E]",
                ].join(" ")}
              >
                {categoryCreateError ??
                  "Existing categories are checked only when you press Create & select."}
              </p>
              </div>
            </div>
          </div>
        )}

        {currentScreen === "type" && (
          <div className="flex flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-[#F1F3FA] px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#858EA6]">
                  Category
                </div>
                <div className="truncate text-sm font-bold text-[#2C3868]">
                  {selectedCategory?.name}
                </div>
              </div>

              <button
                type="button"
                onClick={() => goToScreen("category")}
                className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#5366B7] shadow-sm"
              >
                Change
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 content-center gap-3 sm:grid-cols-3">
              {productTypes.map((productType) => {
                const Icon = productType.icon;
                const selected =
                  selectedProductType === productType.id;

                return (
                  <button
                    key={productType.id}
                    type="button"
                    onClick={() =>
                      chooseProductType(productType.id)
                    }
                    className={[
                      "relative flex min-h-[76px] flex-row items-center gap-3 rounded-2xl border p-3 pr-12 text-left transition active:scale-[0.985] sm:min-h-40 sm:flex-col sm:items-start sm:gap-0 sm:p-4 sm:pr-4",
                      selected
                        ? `${productType.selectedClass} shadow-[0_10px_24px_rgba(44,56,104,0.10)]`
                        : "border-[#DFE3ED] bg-white hover:border-[#BFC6D8]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11",
                        productType.iconClass,
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1 sm:mt-3 sm:flex-none">
                      <div className="truncate text-sm font-bold text-[#262F52] sm:text-base">
                        {productType.title}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-medium text-[#7B8397] sm:mt-1 sm:text-xs">
                        {productType.label}
                      </div>
                    </div>

                    <div
                      className={[
                        "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border",
                        selected
                          ? "border-[#5366B7] bg-[#5366B7] text-white"
                          : "border-[#CCD1DE] bg-white text-transparent",
                      ].join(" ")}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentScreen === "identity" && (
          <div className="grid flex-1 content-start gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="border-b border-[#E7EAF2] bg-white px-1 pb-5 pt-1 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DDE8FF] text-[#315DA8]">
                  <Package2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#26335F]">
                    Product identity
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737C96]">
                    Enter the name customers will see.
                  </p>
                </div>
              </div>

              <label
                htmlFor="product-name"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#66708C]"
              >
                Product name
                <span className="ml-1 text-[#E85D4A]">*</span>
              </label>

              <input
                id="product-name"
                autoFocus
                value={productName}
                onChange={(event) => {
                  setProductName(event.target.value);
                  setConfirmation(null);
                }}
                placeholder="Example: Premium Cotton Handbag"
                className="h-12 w-full rounded-xl border border-[#CDD3E2] bg-white px-3.5 text-sm font-semibold text-[#222B49] outline-none transition placeholder:font-normal placeholder:text-[#9299AA] focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
              />

              <div className="mt-4 flex items-center justify-between gap-3">
                <label
                  htmlFor="product-sku"
                  className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#66708C]"
                >
                  SKU / Product code
                  {variableProduct && (
                    <span className="ml-1 text-[#E85D4A]">
                      *
                    </span>
                  )}
                </label>

                {!variableProduct && (
                  <span className="text-[10px] font-semibold text-[#9399AA]">
                    Optional
                  </span>
                )}
              </div>

              <div className="relative mt-1.5">
                <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C849B]" />
                <input
                  id="product-sku"
                  value={sku}
                  onChange={(event) => {
                    setSku(event.target.value);
                    setConfirmation(null);
                  }}
                  placeholder="Example: BAG-001"
                  className="h-12 w-full rounded-xl border border-[#CDD3E2] bg-white pl-10 pr-3.5 text-sm font-semibold uppercase text-[#222B49] outline-none transition placeholder:font-normal placeholder:normal-case placeholder:text-[#9299AA] focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
                />
              </div>

              <div
                aria-live="polite"
                className="mt-2 min-h-4 text-[11px] font-semibold"
              >
                {skuChecking ? (
                  <span className="inline-flex items-center gap-1.5 text-[#66708C]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking SKU
                  </span>
                ) : skuTaken ? (
                  <span className="text-[#C74636]">
                    SKU already taken
                  </span>
                ) : skuCheckError ? (
                  <span className="text-[#C74636]">
                    {skuCheckError}
                  </span>
                ) : sku.trim() ? (
                  <span className="inline-flex items-center gap-1.5 text-[#257052]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    SKU available
                  </span>
                ) : (
                  <span className="text-[#858DA2]">
                    {variableProduct
                      ? "Variation SKUs will be generated automatically from this code."
                      : "Use your own stock code when needed."}
                  </span>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col rounded-2xl bg-[#26356F] p-4 text-white shadow-[0_12px_28px_rgba(38,53,111,0.18)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E85D4A]">
                  <Package2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/55">
                    Product preview
                  </div>
                  <div className="mt-0.5 truncate text-base font-bold">
                    {productName.trim() || "Your product name"}
                  </div>
                </div>
              </div>

              {sku.trim() && (
                <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold uppercase text-white/75">
                  <Hash className="h-3.5 w-3.5" />
                  {sku.trim()}
                </div>
              )}

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
                  <FolderTree className="h-4 w-4 shrink-0 text-[#FF9588]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">
                      Category
                    </div>
                    <div className="truncate text-xs font-bold">
                      {selectedCategory?.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToScreen("category")}
                    className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/80"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
                  <Layers3 className="h-4 w-4 shrink-0 text-[#FF9588]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">
                      Product type
                    </div>
                    <div className="truncate text-xs font-bold">
                      {selectedTypeDetails?.title}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToScreen("type")}
                    className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/80"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-4">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium leading-4 text-white/55">
                  Preview only — product data has not been saved.
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === "description" && (
          <div className="grid min-h-0 min-w-0 flex-1 content-start gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="min-w-0 border-b border-[#E7EAF2] bg-white px-1 pb-5 pt-1 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E1E7FF] text-[#4A5FAE]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#26335F]">
                    Product description
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737C96]">
                    Keep the main message clear and useful.
                  </p>
                </div>
              </div>

              <label
                htmlFor="short-description"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#66708C]"
              >
                Short selling summary
                <span className="ml-1 text-[#E85D4A]">*</span>
              </label>
              <textarea
                id="short-description"
                value={shortDescription}
                rows={3}
                onChange={(event) => {
                  setShortDescription(event.target.value);
                  setConfirmation(null);
                }}
                placeholder="Example: Premium cotton handbag with spacious compartments and a comfortable shoulder strap."
                className="h-24 w-full resize-none rounded-xl border border-[#CDD3E2] bg-white px-3.5 py-3 text-sm font-medium leading-5 text-[#222B49] outline-none transition placeholder:font-normal placeholder:text-[#9299AA] focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
              />

              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label
                    htmlFor="product-description"
                    className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#66708C]"
                  >
                    Detailed information
                  </label>
                  <span className="text-[10px] font-semibold text-[#9198AA]">
                    Optional
                  </span>
                </div>
                <textarea
                  id="product-description"
                  value={description}
                  rows={5}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setConfirmation(null);
                  }}
                  placeholder="Add material, design, size, usage, care instructions or other important product details."
                  className="h-32 w-full resize-none rounded-xl border border-[#CDD3E2] bg-white px-3.5 py-3 text-sm font-medium leading-5 text-[#222B49] outline-none transition placeholder:font-normal placeholder:text-[#9299AA] focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
                />
              </div>
            </div>

            <div className="hidden lg:flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white shadow-[0_12px_28px_rgba(38,53,111,0.18)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E85D4A]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
                    Content preview
                  </div>
                  <div className="mt-0.5 truncate text-base font-bold">
                    {productName.trim()}
                  </div>
                  <div className="mt-1 truncate text-xs text-white/55">
                    {selectedCategory?.name} ·{" "}
                    {selectedTypeDetails?.title}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white p-4 text-[#26335F]">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8991A4]">
                  Summary
                </div>
                <p className="mt-2 line-clamp-5 min-h-12 text-sm font-semibold leading-5">
                  {shortDescription.trim() ||
                    "Your short product summary will appear here."}
                </p>

                <div className="my-3 h-px bg-[#E6E9F0]" />

                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8991A4]">
                  Product details
                </div>
                <p className="mt-2 line-clamp-5 min-h-16 whitespace-pre-line text-xs leading-5 text-[#677087]">
                  {description.trim() ||
                    "Detailed information is optional and can be added whenever the product needs more explanation."}
                </p>
              </div>

              <div className="mt-auto pt-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium leading-4 text-white/55">
                  Preview only — description has not been saved.
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === "shared-images" && (
          <div className="grid min-h-0 min-w-0 flex-1 content-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="min-w-0 overflow-hidden border-b border-[#E7EAF2] bg-white px-1 pb-5 pt-1 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#26335F]">
                    {selectedProductType === "variable-size"
                      ? "Shared size photos"
                      : "Product photos"}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737C96]">
                    Drag thumbnails to reorder. The first is the
                    main image.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#E9ECF6] px-3 py-1.5 text-[11px] font-bold text-[#5366B7]">
                  {localPhotos.length} / 5
                </span>
              </div>

              {localPhotos.length === 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    photoInputRef.current?.click()
                  }
                  className="flex h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#BCC4D8] bg-white text-center transition hover:border-[#5366B7] hover:bg-[#F7F8FF]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E9EDFF] text-[#5366B7]">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <div className="mt-3 text-sm font-bold text-[#29345F]">
                    Choose product photos
                  </div>
                  <div className="mt-1 text-xs text-[#7C849A]">
                    Select up to five images
                  </div>
                </button>
              ) : (
                <>
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-[#DDE1EA] bg-white">
                    <Image
                      unoptimized
                      fill
                      src={localPhotos[0].url}
                      alt={localPhotos[0].name}
                      className="object-contain p-2"
                    />
                    <span className="absolute left-2.5 top-2.5 rounded-lg bg-[#E85D4A] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Main photo
                    </span>
                  </div>

                  <div className="mt-2.5 grid min-w-0 grid-cols-5 gap-2">
                    {localPhotos.map((photo, index) => (
                      <div
                        key={photo.id}
                        data-photo-id={photo.id}
                        className={[
                          "relative aspect-square min-w-0 rounded-xl",
                          draggedPhotoId === photo.id
                            ? "opacity-60"
                            : "",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          draggable
                          aria-label={
                            index === 0
                              ? "Main photo. Drag to reorder."
                              : "Drag photo to reorder."
                          }
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed =
                              "move";
                            event.dataTransfer.setData(
                              "text/plain",
                              photo.id
                            );
                            beginPhotoDrag(photo.id);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const sourcePhotoId =
                              event.dataTransfer.getData(
                                "text/plain"
                              ) ||
                              draggedPhotoIdRef.current;

                            if (sourcePhotoId) {
                              movePhoto(
                                sourcePhotoId,
                                photo.id
                              );
                            }
                            finishPhotoDrag();
                          }}
                          onDragEnd={finishPhotoDrag}
                          onTouchStart={() =>
                            beginPhotoDrag(photo.id)
                          }
                          onTouchMove={(event) => {
                            event.preventDefault();
                            const touch = event.touches[0];

                            if (touch) {
                              moveDraggedPhotoAtPoint(
                                touch.clientX,
                                touch.clientY
                              );
                            }
                          }}
                          onTouchEnd={finishPhotoDrag}
                          onTouchCancel={finishPhotoDrag}
                          className={[
                            "relative h-full w-full cursor-grab touch-none overflow-hidden rounded-xl border-2 bg-white active:cursor-grabbing",
                            index === 0
                              ? "border-[#E85D4A]"
                              : "border-[#DDE1EA]",
                          ].join(" ")}
                        >
                          <Image
                            unoptimized
                            fill
                            src={photo.url}
                            alt={photo.name}
                            className="pointer-events-none object-cover"
                          />
                          <span className="pointer-events-none absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-md bg-black/55 text-white">
                            <GripVertical className="h-3.5 w-3.5" />
                          </span>
                          {index === 0 && (
                            <span className="pointer-events-none absolute right-1 top-1 rounded-md bg-[#E85D4A] px-1.5 py-0.5 text-[7px] font-bold uppercase text-white">
                              Main
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          aria-label="Remove photo"
                          onPointerDown={(event) =>
                            event.stopPropagation()
                          }
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#E3E6EE] bg-white text-[#C94A3B] shadow-sm"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {localPhotos.length < 5 && (
                      <button
                        type="button"
                        aria-label="Add another photo"
                        onClick={() =>
                          photoInputRef.current?.click()
                        }
                        className="flex aspect-square min-w-0 items-center justify-center rounded-xl border-2 border-dashed border-[#BCC4D8] bg-white text-[#5366B7]"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  addPhotos(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </div>

            <div className="hidden lg:flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white shadow-[0_12px_28px_rgba(38,53,111,0.18)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E85D4A]">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
                    Product
                  </div>
                  <div className="mt-0.5 truncate text-base font-bold">
                    {productName.trim()}
                  </div>
                  <div className="mt-1 truncate text-xs text-white/55">
                    {selectedCategory?.name}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5">
                  <GripVertical className="h-4 w-4 shrink-0 text-[#8FE0B8]" />
                  <span className="text-xs font-semibold text-white/75">
                    Drag thumbnails to change the order
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#8FE0B8]" />
                  <span className="text-xs font-semibold text-white/75">
                    The first thumbnail becomes the main image
                  </span>
                </div>
                {selectedProductType === "variable-size" && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5">
                    <Ruler className="h-4 w-4 shrink-0 text-[#8FE0B8]" />
                    <span className="text-xs font-semibold text-white/75">
                      One shared gallery is used for every size
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium text-white/55">
                  Local preview only — images are not uploaded.
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === "simple-price-stock" && (
          <div className="grid min-h-0 min-w-0 flex-1 content-start gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="border-b border-[#E7EAF2] bg-white px-1 pb-5 pt-1 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DDF2E8] text-[#257052]">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#26335F]">
                    Price and quantity
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737C96]">
                    Sale pricing is handled separately in Sale
                    Events.
                  </p>
                </div>
              </div>

              <label
                htmlFor="regular-price"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#66708C]"
              >
                Regular price
                <span className="ml-1 text-[#E85D4A]">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C849B]" />
                <input
                  id="regular-price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={regularPrice}
                  onChange={(event) => {
                    setRegularPrice(event.target.value);
                    setConfirmation(null);
                  }}
                  placeholder="0.00"
                  className="h-12 w-full rounded-xl border border-[#CDD3E2] bg-white pl-10 pr-3.5 text-sm font-bold text-[#222B49] outline-none transition placeholder:font-normal placeholder:text-[#9299AA] focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
                />
              </div>

              <label
                htmlFor="stock-quantity"
                className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#66708C]"
              >
                Stock quantity
                <span className="ml-1 text-[#E85D4A]">*</span>
              </label>
              <input
                id="stock-quantity"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={stockQuantity}
                onChange={(event) => {
                  setStockQuantity(event.target.value);
                  setConfirmation(null);
                }}
                placeholder="Example: 10"
                className="h-12 w-full rounded-xl border border-[#CDD3E2] bg-white px-3.5 text-sm font-bold text-[#222B49] outline-none transition placeholder:font-normal placeholder:text-[#9299AA] focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
              />
              <p className="mt-2 text-[11px] font-medium text-[#858DA2]">
                Enter 0 when the product is currently out of
                stock.
              </p>
            </div>

            <div className="hidden lg:flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white shadow-[0_12px_28px_rgba(38,53,111,0.18)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E85D4A]">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
                    Selling preview
                  </div>
                  <div className="mt-0.5 truncate text-base font-bold">
                    {productName.trim()}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 text-[#26335F]">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8991A4]">
                  Customer price
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {priceIsValid(regularPrice)
                    ? formatPrice(regularPrice)
                    : "₹0"}
                </div>

                <div className="my-4 h-px bg-[#E6E9F0]" />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[#737C96]">
                    Available quantity
                  </span>
                  <span className="text-sm font-bold">
                    {quantityIsValid(stockQuantity)
                      ? stockQuantity
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium text-white/55">
                  No sale-price field is included here.
                </div>
              </div>
            </div>
          </div>
        )}

        {(currentScreen === "size-variations" ||
          currentScreen === "colour-variations") && (
          <div className="grid min-w-0 content-start gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="flex min-h-0 min-w-0 flex-col border-b border-[#E7EAF2] bg-white px-1 pb-5 pt-1 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    currentScreen === "size-variations"
                      ? "bg-[#E5DCF8] text-[#6949A5]"
                      : "bg-[#FFE0D9] text-[#B24737]",
                  ].join(" ")}
                >
                  {currentScreen === "size-variations" ? (
                    <Ruler className="h-5 w-5" />
                  ) : (
                    <Palette className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#26335F]">
                    {currentScreen === "size-variations"
                      ? "Size options"
                      : "Colour options"}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737C96]">
                    Enter price and quantity in the first option.
                    Matching values fill the remaining options and
                    can still be edited individually.
                  </p>
                </div>
              </div>

              {currentScreen === "size-variations" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {commonSizes.map((size) => {
                    const selected = sizeRows.some(
                      (row) =>
                        row.option.toLowerCase() ===
                        size.toLowerCase()
                    );

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          selected
                            ? removeVariation(
                                "size",
                                sizeRows.find(
                                  (row) =>
                                    row.option.toLowerCase() ===
                                    size.toLowerCase()
                                )?.id ?? ""
                              )
                            : addVariation("size", size)
                        }
                        className={[
                          "rounded-lg border px-3 py-2 text-xs font-bold",
                          selected
                            ? "border-[#7A62B7] bg-[#F0EAFF] text-[#60469A]"
                            : "border-[#D9DDE8] bg-white text-[#697187]",
                        ].join(" ")}
                      >
                        {selected && (
                          <Check className="mr-1 inline h-3.5 w-3.5" />
                        )}
                        {size}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  value={
                    currentScreen === "size-variations"
                      ? sizeInput
                      : colourInput
                  }
                  onChange={(event) => {
                    if (currentScreen === "size-variations") {
                      setSizeInput(event.target.value);
                    } else {
                      setColourInput(event.target.value);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === ","
                    ) {
                      event.preventDefault();
                      addVariation(
                        currentScreen === "size-variations"
                          ? "size"
                          : "colour",
                        currentScreen === "size-variations"
                          ? sizeInput
                          : colourInput
                      );
                    }
                  }}
                  placeholder={
                    currentScreen === "size-variations"
                      ? "Add another size"
                      : "Add a colour"
                  }
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[#CDD3E2] bg-white px-3.5 text-sm font-semibold text-[#222B49] outline-none placeholder:font-normal placeholder:text-[#9299AA] focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
                />
                <button
                  type="button"
                  onClick={() =>
                    addVariation(
                      currentScreen === "size-variations"
                        ? "size"
                        : "colour",
                      currentScreen === "size-variations"
                        ? sizeInput
                        : colourInput
                    )
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5366B7] text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 pb-4 lg:pb-0">
                {(currentScreen === "size-variations"
                  ? sizeRows
                  : colourRows
                ).length === 0 ? (
                  <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[#C9CFDC] bg-white px-4 text-center text-sm font-medium text-[#8A91A3]">
                    Add at least one{" "}
                    {currentScreen === "size-variations"
                      ? "size"
                      : "colour"}{" "}
                    option.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(currentScreen === "size-variations"
                      ? sizeRows
                      : colourRows
                    ).map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[minmax(88px,1fr)_minmax(92px,1fr)_minmax(82px,0.8fr)_36px] items-end gap-2 rounded-xl border border-[#E0E4ED] bg-white p-2.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-[#27335F]">
                            {row.option}
                          </div>
                          <div className="mt-1 truncate text-[10px] font-semibold uppercase text-[#858DA2]">
                            {variationSku(sku, row.option)}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#858DA2]">
                            Price
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={row.price}
                            onChange={(event) =>
                              updateVariation(
                                currentScreen ===
                                  "size-variations"
                                  ? "size"
                                  : "colour",
                                row.id,
                                { price: event.target.value }
                              )
                            }
                            placeholder="0"
                            className="h-9 w-full rounded-lg border border-[#CDD3E2] px-2.5 text-xs font-bold outline-none focus:border-[#5366B7]"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#858DA2]">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={row.quantity}
                            onChange={(event) =>
                              updateVariation(
                                currentScreen ===
                                  "size-variations"
                                  ? "size"
                                  : "colour",
                                row.id,
                                {
                                  quantity: event.target.value,
                                }
                              )
                            }
                            placeholder="0"
                            className="h-9 w-full rounded-lg border border-[#CDD3E2] px-2.5 text-xs font-bold outline-none focus:border-[#5366B7]"
                          />
                        </div>

                        <button
                          type="button"
                          aria-label={`Remove ${row.option}`}
                          onClick={() =>
                            removeVariation(
                              currentScreen ===
                                "size-variations"
                                ? "size"
                                : "colour",
                              row.id
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF0ED] text-[#C94A3B]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:flex min-h-0 min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E85D4A]">
                  {currentScreen === "size-variations" ? (
                    <Ruler className="h-5 w-5" />
                  ) : (
                    <Palette className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
                    Variation summary
                  </div>
                  <div className="mt-0.5 text-base font-bold">
                    {(currentScreen === "size-variations"
                      ? sizeRows
                      : colourRows
                    ).length}{" "}
                    options
                  </div>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-12 pr-1 lg:overflow-visible lg:pb-0 lg:pr-0">
                {(currentScreen === "size-variations"
                  ? sizeRows
                  : colourRows
                ).map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl bg-white/10 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-bold">
                        {row.option}
                      </span>
                      <span className="text-xs font-bold text-[#8FE0B8]">
                        {priceIsValid(row.price)
                          ? formatPrice(row.price)
                          : "Price needed"}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-white/50">
                      {variationSku(sku, row.option)} · Qty{" "}
                      {quantityIsValid(row.quantity)
                        ? row.quantity
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium leading-4 text-white/55">
                  Sale pricing remains in Sale Events.
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === "colour-images" && (
          <div className="grid min-w-0 content-start gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex min-h-0 flex-col border-b border-[#E7EAF2] bg-white px-1 pb-5 pt-1 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE0D9] text-[#B24737]">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#26335F]">
                    Colour images
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737C96]">
                    Add images, then drag them to set the order.
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 pr-0">
                <div className="space-y-3">
                  {colourRows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-[#E0E4ED] bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-[#27335F]">
                            {row.option}
                          </div>
                          <div className="mt-1 truncate text-[10px] font-semibold uppercase text-[#858DA2]">
                            {variationSku(sku, row.option)}
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[10px] font-bold text-[#5366B7]">
                          {row.photos.length}{" "}
                          {row.photos.length === 1
                            ? "image"
                            : "images"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7">
                        {row.photos.map((photo, photoIndex) => (
                          <div
                            key={photo.id}
                            data-variation-row-id={row.id}
                            data-variation-photo-id={photo.id}
                            className={[
                              "relative aspect-square min-w-0 overflow-visible rounded-lg",
                              draggedVariationPhoto?.rowId === row.id &&
                              draggedVariationPhoto.photoId === photo.id
                                ? "opacity-60"
                                : "",
                            ].join(" ")}
                          >
                            <button
                              type="button"
                              draggable
                              aria-label={`${row.option} image ${photoIndex + 1}. Drag to reorder.`}
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed =
                                  "move";

                                event.dataTransfer.setData(
                                  "text/plain",
                                  photo.id
                                );

                                beginVariationPhotoDrag(
                                  row.id,
                                  photo.id
                                );
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect =
                                  "move";
                              }}
                              onDrop={(event) => {
                                event.preventDefault();

                                const sourcePhotoId =
                                  event.dataTransfer.getData(
                                    "text/plain"
                                  ) ||
                                  draggedVariationPhotoRef.current
                                    ?.photoId;

                                if (sourcePhotoId) {
                                  moveVariationPhoto(
                                    row.id,
                                    sourcePhotoId,
                                    photo.id
                                  );
                                }

                                finishVariationPhotoDrag();
                              }}
                              onDragEnd={
                                finishVariationPhotoDrag
                              }
                              onTouchStart={() =>
                                beginVariationPhotoDrag(
                                  row.id,
                                  photo.id
                                )
                              }
                              onTouchMove={(event) => {
                                event.preventDefault();

                                const touch =
                                  event.touches[0];

                                if (touch) {
                                  moveDraggedVariationPhotoAtPoint(
                                    row.id,
                                    touch.clientX,
                                    touch.clientY
                                  );
                                }
                              }}
                              onTouchEnd={
                                finishVariationPhotoDrag
                              }
                              onTouchCancel={
                                finishVariationPhotoDrag
                              }
                              className={[
                                "relative h-full w-full cursor-grab touch-none overflow-hidden rounded-lg border-2 bg-[#F8F9FC] active:cursor-grabbing",
                                photoIndex === 0
                                  ? "border-[#E85D4A]"
                                  : "border-[#DDE1EA]",
                              ].join(" ")}
                            >
                              <Image
                                unoptimized
                                fill
                                src={photo.url}
                                alt={`${row.option} image ${photoIndex + 1}`}
                                className="pointer-events-none object-cover"
                              />

                              <span className="pointer-events-none absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-md bg-black/55 text-white">
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>

                              {photoIndex === 0 && (
                                <span className="pointer-events-none absolute right-1 top-1 rounded bg-[#E85D4A] px-1.5 py-0.5 text-[7px] font-bold uppercase text-white">
                                  Main
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              aria-label={`Remove ${row.option} image ${photoIndex + 1}`}
                              onPointerDown={(event) =>
                                event.stopPropagation()
                              }
                              onClick={() =>
                                removeVariationPhoto(
                                  row.id,
                                  photo.id
                                )
                              }
                              className="absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#E3E6EE] bg-white text-[#C94A3B] shadow-sm"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}

                        {row.photos.length < 3 && (
                          <label className="flex aspect-square min-w-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#C8CEDD] bg-[#F8F9FC] text-[#6877AD] transition hover:border-[#5366B7] hover:bg-[#F1F3FF]">
                            <Plus className="h-5 w-5" />
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                addVariationPhotos(
                                  row.id,
                                  event.target.files
                                );
                                event.currentTarget.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {row.photos.length === 0 ? (
                        <p className="mt-2 text-[10px] font-semibold text-[#A15A4E]">
                          Add at least one image for this colour.
                        </p>
                      ) : (
                        <p className="mt-2 text-[10px] font-semibold text-[#858DA2]">
                          Up to 3 images per colour.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden lg:flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E85D4A]">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
                    Image progress
                  </div>
                  <div className="mt-0.5 text-base font-bold">
                    {
                      colourRows.filter(
                        (row) => row.photos.length > 0
                      ).length
                    }{" "}
                    of {colourRows.length} colours ready
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 overflow-y-auto lg:overflow-visible">
                {colourRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5"
                  >
                    <div
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        row.photos.length > 0
                          ? "bg-[#DDF4E8] text-[#246247]"
                          : "bg-white/10 text-white/45",
                      ].join(" ")}
                    >
                      {row.photos.length > 0 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                    </div>

                    <span className="min-w-0 flex-1 truncate text-xs font-bold">
                      {row.option}
                    </span>

                    <span className="shrink-0 text-[10px] font-semibold text-white/55">
                      {row.photos.length}{" "}
                      {row.photos.length === 1
                        ? "image"
                        : "images"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium text-white/55">
                  The first image under each colour becomes that
                  variation&apos;s main image.
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === "shipping" && (
          <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="min-h-0 min-w-0 overflow-y-auto border-b border-[#E7EAF2] bg-white px-1 pb-5 pt-1 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="shipping-weight"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#66708C]"
                  >
                    Shipping weight
                    <span className="ml-1 text-[#E85D4A]">
                      *
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="shipping-weight"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={weight}
                      onChange={(event) => {
                        setWeight(event.target.value);
                        setConfirmation(null);
                      }}
                      placeholder="Example: 0.75"
                      className="h-11 w-full rounded-xl border border-[#CDD3E2] bg-white px-3.5 pr-12 text-sm font-bold text-[#222B49] outline-none focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#788198]">
                      kg
                    </span>
                  </div>
                </div>

                {selectedProductType !==
                  "variable-colour" && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="product-colour"
                        className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#66708C]"
                      >
                        Colour
                      </label>
                      <span className="text-[10px] font-semibold text-[#9198AA]">
                        Optional
                      </span>
                    </div>
                    <input
                      id="product-colour"
                      value={color}
                      onChange={(event) => {
                        setColor(event.target.value);
                        setConfirmation(null);
                      }}
                      placeholder="Example: Maroon"
                      className="h-11 w-full rounded-xl border border-[#CDD3E2] bg-white px-3.5 text-sm font-semibold text-[#222B49] outline-none focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
                    />
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-[#E0E4ED] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E9EDFF] text-[#5366B7]">
                      <Ruler className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#27335F]">
                        Package dimensions
                      </div>
                      <div className="text-[10px] text-[#858DA2]">
                        Optional length, width and height
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-pressed={dimensionsEnabled}
                    onClick={() => {
                      setDimensionsEnabled(
                        (current) => !current
                      );
                      setConfirmation(null);
                    }}
                    className={[
                      "relative h-7 w-12 rounded-full transition",
                      dimensionsEnabled
                        ? "bg-[#E85D4A]"
                        : "bg-[#CCD1DE]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
                        dimensionsEnabled
                          ? "left-6"
                          : "left-1",
                      ].join(" ")}
                    />
                  </button>
                </div>

                {dimensionsEnabled && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      {
                        id: "package-length",
                        label: "Length",
                        value: length,
                        setter: setLength,
                      },
                      {
                        id: "package-width",
                        label: "Width",
                        value: width,
                        setter: setWidth,
                      },
                      {
                        id: "package-height",
                        label: "Height",
                        value: height,
                        setter: setHeight,
                      },
                    ].map((field) => (
                      <div key={field.id}>
                        <label
                          htmlFor={field.id}
                          className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#858DA2]"
                        >
                          {field.label}
                        </label>
                        <div className="relative">
                          <input
                            id={field.id}
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={field.value}
                            onChange={(event) => {
                              field.setter(event.target.value);
                              setConfirmation(null);
                            }}
                            placeholder="0"
                            className="h-10 w-full rounded-lg border border-[#CDD3E2] px-2.5 pr-8 text-xs font-bold outline-none focus:border-[#5366B7]"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#858DA2]">
                            cm
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-[#E0E4ED] bg-white p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF0ED] text-[#C94A3B]">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#27335F]">
                      Product tags
                    </div>
                    <div className="text-[10px] text-[#858DA2]">
                      Add up to ten searchable tags
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(event) => {
                      setTagInput(event.target.value);
                      setConfirmation(null);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === ","
                      ) {
                        event.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="Example: cotton"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-[#CDD3E2] px-3 text-xs font-semibold outline-none focus:border-[#5366B7]"
                  />
                  <button
                    type="button"
                    disabled={
                      !tagInput.trim() ||
                      tags.length >= 10
                    }
                    onClick={() => addTag(tagInput)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5366B7] text-white disabled:bg-[#C9CCD4]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="mt-2.5 flex max-h-16 flex-wrap gap-2 overflow-y-auto">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#EEF1FF] px-2.5 py-1.5 text-[10px] font-bold text-[#35447F]"
                      >
                        {tag}
                        <button
                          type="button"
                          aria-label={`Remove ${tag}`}
                          onClick={() => removeTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E85D4A]">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
                    Shipping preview
                  </div>
                  <div className="mt-0.5 text-base font-bold">
                    {productName.trim()}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                  <span className="text-xs text-white/60">
                    Weight
                  </span>
                  <span className="text-xs font-bold">
                    {weight.trim() ? `${weight} kg` : "—"}
                  </span>
                </div>

                {selectedProductType !==
                  "variable-colour" && (
                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                    <span className="text-xs text-white/60">
                      Colour
                    </span>
                    <span className="text-xs font-bold">
                      {color.trim() || "Not set"}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                  <span className="text-xs text-white/60">
                    Dimensions
                  </span>
                  <span className="text-xs font-bold">
                    {dimensionsEnabled &&
                    dimensionsAreValid
                      ? `${length} × ${width} × ${height} cm`
                      : "Not used"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                  <span className="text-xs text-white/60">
                    Tags
                  </span>
                  <span className="text-xs font-bold">
                    {tags.length}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium text-white/55">
                  All editable shipping fields remain on the left.
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === "publish" && (
          <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="border-b border-[#E7EAF2] bg-white px-1 pb-5 pt-1 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDF2E8] text-[#257052]">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#26335F]">
                    Product status
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737C96]">
                    Choose how the product should be created.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    id: "publish" as const,
                    title: "Publish",
                    label: "Make it active now",
                    icon: Send,
                  },
                  {
                    id: "draft" as const,
                    title: "Draft",
                    label: "Save without publishing",
                    icon: Save,
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  const selected = status === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setStatus(option.id);
                        setConfirmation(null);
                      }}
                      className={[
                        "flex items-center gap-3 rounded-xl border p-3 text-left",
                        selected
                          ? "border-[#5366B7] bg-[#EEF1FF]"
                          : "border-[#DCE0EA] bg-white",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          selected
                            ? "bg-[#5366B7] text-white"
                            : "bg-[#EEF0F5] text-[#6B748B]",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#27335F]">
                          {option.title}
                        </div>
                        <div className="text-[10px] text-[#858DA2]">
                          {option.label}
                        </div>
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 text-[#5366B7]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#66708C]">
                  Storefront visibility
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      id: "visible" as const,
                      title: "Visible",
                      label: "Show in the store",
                      icon: Eye,
                    },
                    {
                      id: "hidden" as const,
                      title: "Hidden",
                      label: "Keep it out of listings",
                      icon: EyeOff,
                    },
                  ].map((option) => {
                    const Icon = option.icon;
                    const selected =
                      visibility === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setVisibility(option.id);
                          setConfirmation(null);
                        }}
                        className={[
                          "flex items-center gap-3 rounded-xl border p-3 text-left",
                          selected
                            ? "border-[#E85D4A] bg-[#FFF4F1]"
                            : "border-[#DCE0EA] bg-white",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            selected
                              ? "bg-[#E85D4A] text-white"
                              : "bg-[#EEF0F5] text-[#6B748B]",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-[#27335F]">
                            {option.title}
                          </div>
                          <div className="text-[10px] text-[#858DA2]">
                            {option.label}
                          </div>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 text-[#E85D4A]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="hidden lg:flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E85D4A]">
                  <Package2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
                    Final review
                  </div>
                  <div className="mt-0.5 truncate text-base font-bold">
                    {productName.trim()}
                  </div>
                  <div className="mt-1 text-xs text-white/55">
                    {selectedTypeDetails?.title}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                  <span className="text-xs text-white/60">
                    Category
                  </span>
                  <span className="max-w-[58%] truncate text-xs font-bold">
                    {selectedCategory?.name}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                  <span className="text-xs text-white/60">
                    Status
                  </span>
                  <span className="text-xs font-bold capitalize">
                    {status}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                  <span className="text-xs text-white/60">
                    Visibility
                  </span>
                  <span className="text-xs font-bold capitalize">
                    {visibility}
                  </span>
                </div>

                {selectedProductType === "simple" && (
                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                    <span className="text-xs text-white/60">
                      Price / Quantity
                    </span>
                    <span className="text-xs font-bold">
                      {formatPrice(regularPrice)} /{" "}
                      {stockQuantity}
                    </span>
                  </div>
                )}

                {selectedProductType === "variable-size" && (
                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                    <span className="text-xs text-white/60">
                      Size variations
                    </span>
                    <span className="text-xs font-bold">
                      {sizeRows.length}
                    </span>
                  </div>
                )}

                {selectedProductType ===
                  "variable-colour" && (
                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                    <span className="text-xs text-white/60">
                      Colour variations
                    </span>
                    <span className="text-xs font-bold">
                      {colourRows.length}
                    </span>
                  </div>
                )}

              </div>

              <div className="mt-auto pt-3">
                {submitError ? (
                  <div
                    aria-live="assertive"
                    className="flex items-start gap-2 rounded-xl bg-[#FFE3DE] px-3 py-2.5 text-[11px] font-semibold leading-4 text-[#9F3427]"
                  >
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    {submitError}
                  </div>
                ) : confirmation ? (
                  <div
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-xl bg-[#DDF4E8] px-3 py-2.5 text-[11px] font-semibold leading-4 text-[#236047]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {confirmation}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium leading-4 text-white/55">
                    {selectedProductType === "simple"
                      ? "The product and images will be saved when you press Create Product."
                      : selectedProductType === "variable-size"
                        ? "The product, shared images and size variations will be saved when you press Create Product."
                        : "The product, colour variations and ordered image galleries will be saved when you press Create Product."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {currentScreen === "publish" && submitError && (
        <div className="px-4 pb-3 lg:hidden">
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-[#F1BDB5] bg-[#FFF1EE] px-3 py-2.5 text-xs font-semibold leading-5 text-[#9F3427]"
          >
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        </div>
      )}

      <footer
        className="sticky bottom-0 z-30 flex shrink-0 items-center gap-3 border-t border-[#E5E8F0] bg-white/95 px-3 py-3 backdrop-blur md:static md:rounded-b-2xl md:bg-[#F8F9FC] md:px-5"
        style={{
          paddingBottom:
            "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={goBack}
          className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-[#CDD3E1] bg-white px-3 font-bold text-[#455070] transition active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Back</span>
        </button>

        <button
          type="button"
          disabled={
            !canContinue ||
            submitting
          }
          onClick={() =>
            void continueWizard()
          }
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#E85D4A] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(232,93,74,0.22)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#C9CCD4] disabled:shadow-none"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {submitStage ?? "Creating product"}
            </>
          ) : (
            <>
              {actionLabel}
              {currentScreen === "publish" ? (
                <Check className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </>
          )}
        </button>
      </footer>
    </main>
  );
}
