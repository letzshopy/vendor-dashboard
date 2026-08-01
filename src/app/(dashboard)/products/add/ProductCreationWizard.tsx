"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  Check,
  CheckCircle2,
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
  | "variable-colour"
  | "grouped";

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
  | "grouped-products"
  | "publish";

type LocalPhoto = {
  id: string;
  name: string;
  url: string;
};

type VariationRow = {
  id: string;
  option: string;
  price: string;
  quantity: string;
  photos: LocalPhoto[];
};

type ProductSearchItem = {
  id: number;
  name: string;
  sku: string;
  price: string;
  image: string;
};

type JsonRecord = Record<string, unknown>;

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

const GROUPED_FLOW: WizardScreen[] = [
  "category",
  "type",
  "identity",
  "description",
  "grouped-products",
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
  {
    id: "grouped",
    title: "Grouped product",
    label: "Combine existing products",
    icon: Boxes,
    iconClass: "bg-[#DDF2E8] text-[#257052]",
    selectedClass: "border-[#4A9B78] bg-[#F0FAF5]",
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

function parseProductResults(value: unknown): ProductSearchItem[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    return [];
  }

  return value.results.flatMap((item) => {
    if (!isRecord(item)) return [];

    const id = Number(item.id);
    const name =
      typeof item.name === "string"
        ? item.name.trim()
        : "";

    if (!Number.isSafeInteger(id) || id <= 0 || !name) {
      return [];
    }

    return [
      {
        id,
        name,
        sku:
          typeof item.sku === "string"
            ? item.sku
            : "",
        price:
          typeof item.price === "string"
            ? item.price
            : "",
        image:
          typeof item.image === "string"
            ? item.image
            : "",
      },
    ];
  });
}

function flowFor(productType: ProductType | null): WizardScreen[] {
  if (productType === "variable-size") return SIZE_FLOW;
  if (productType === "variable-colour") return COLOUR_FLOW;
  if (productType === "grouped") return GROUPED_FLOW;
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
    case "grouped-products":
      return {
        title: "Select grouped products",
        subtitle: "Search and link existing products",
        icon: Boxes,
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

  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] =
    useState<ProductSearchItem[]>([]);
  const [groupSelected, setGroupSelected] =
    useState<ProductSearchItem[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] =
    useState<string | null>(null);

  const [status, setStatus] =
    useState<"draft" | "publish">("publish");
  const [visibility, setVisibility] =
    useState<"visible" | "hidden">("visible");

  const [query, setQuery] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [confirmation, setConfirmation] =
    useState<string | null>(null);

  const flow = useMemo(
    () => flowFor(selectedProductType),
    [selectedProductType]
  );
  const totalSteps = flow.length;
  const currentScreen =
    flow[Math.min(step - 1, flow.length - 1)];
  const meta = screenMeta(currentScreen, selectedProductType);
  const HeaderIcon = meta.icon;

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
    return () => {
      photoUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      variationPhotoUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  useEffect(() => {
    if (
      currentScreen !== "grouped-products" ||
      !groupQuery.trim()
    ) {
      setGroupResults([]);
      setGroupError(null);
      setGroupLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setGroupLoading(true);
        setGroupError(null);

        const response = await fetch(
          `/api/products/search?q=${encodeURIComponent(
            groupQuery.trim()
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const json: unknown = await response.json();

        if (!response.ok) {
          throw new Error("Unable to search products.");
        }

        setGroupResults(parseProductResults(json));
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setGroupError(
          error instanceof Error
            ? error.message
            : "Unable to search products."
        );
      } finally {
        if (!controller.signal.aborted) {
          setGroupLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentScreen, groupQuery]);

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
    (!variableProduct || sku.trim().length >= 2);

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
      case "grouped-products":
        return groupSelected.length > 0;
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

  function createAndSelectCategory() {
    const name = newCategoryName.trim();
    if (name.length < 2) return;

    const existingCategory = allCategories.find(
      (category) =>
        category.name.toLowerCase() === name.toLowerCase()
    );

    if (existingCategory) {
      setSelectedCategoryId(existingCategory.id);
      setNewCategoryName("");
      setConfirmation(null);
      return;
    }

    const createdCategory: Category = {
      id: -Date.now(),
      name,
      parent: 0,
    };

    setCreatedCategories((current) => [
      ...current,
      createdCategory,
    ]);
    setSelectedCategoryId(createdCategory.id);
    setNewCategoryName("");
    setConfirmation(null);
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

    if (
      nextProductType === "variable-colour" ||
      nextProductType === "grouped"
    ) {
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

    const selectedFiles = Array.from(files).filter(
      (file) => file.type.startsWith("image/")
    );

    if (selectedFiles.length === 0) return;

    const newPhotos = selectedFiles.map((file, index) => {
      const url = URL.createObjectURL(file);
      variationPhotoUrlsRef.current.push(url);

      return {
        id: `colour-photo-${Date.now()}-${index}-${file.name}`,
        name: file.name,
        url,
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

  function toggleGroupedProduct(product: ProductSearchItem) {
    setGroupSelected((current) => {
      const selected = current.some(
        (item) => item.id === product.id
      );

      if (selected) {
        return current.filter(
          (item) => item.id !== product.id
        );
      }

      return [...current, product];
    });

    setConfirmation(null);
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

  function continueWizard() {
    setConfirmation(null);
    if (!canContinue) return;

    if (currentScreen === "publish") {
      setConfirmation(
        `Preview ready as ${
          status === "publish" ? "Published" : "Draft"
        } and ${
          visibility === "visible" ? "Visible" : "Hidden"
        }. No product has been created.`
      );
      return;
    }

    setStep((current) =>
      Math.min(totalSteps, current + 1)
    );
  }

  const actionLabel =
    currentScreen === "publish"
      ? selectedProductType === "grouped"
        ? "Create Grouped Product"
        : "Create Product"
      : "Continue";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col rounded-2xl border border-[#D9DEEC] bg-white shadow-[0_10px_32px_rgba(35,50,102,0.08)] md:h-[calc(100dvh-8.75rem)] md:min-h-[560px] md:max-h-[700px]">
      <header className="rounded-t-2xl bg-[#2E3F7D] px-4 py-3.5 text-white md:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={goBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E85D4A]">
              <HeaderIcon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight">
                {meta.title}
              </h1>
              <p className="truncate text-xs text-white/65">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-wide">
            {step} OF {totalSteps}
          </span>
        </div>

        <div className="mt-3 flex gap-1">
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

      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:overflow-hidden md:px-5">
        {currentScreen === "category" && (
          <div className="grid flex-1 content-start gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
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

            <div className="rounded-2xl border border-[#F1D5CE] bg-[#FFF8F6] p-4">
              <div className="mb-3 flex items-start gap-3">
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
              </div>

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
                  setConfirmation(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    createAndSelectCategory();
                  }
                }}
                placeholder="Example: Handbags"
                className="h-12 w-full rounded-xl border border-[#E3C7C0] bg-white px-3.5 text-sm font-semibold text-[#4D2B25] outline-none transition placeholder:font-normal placeholder:text-[#B18D86] focus:border-[#E85D4A] focus:ring-4 focus:ring-[#E85D4A]/10"
              />

              <button
                type="button"
                disabled={newCategoryName.trim().length < 2}
                onClick={createAndSelectCategory}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E85D4A] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(232,93,74,0.22)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-[#D8C8C4] disabled:shadow-none"
              >
                <Plus className="h-4 w-4" />
                Create & select
              </button>

              <p className="mt-2 text-center text-[11px] font-medium text-[#A1766E]">
                Preview only — nothing is saved yet.
              </p>
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

            <div className="grid flex-1 grid-cols-2 content-start gap-3">
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
                      "relative flex min-h-32 flex-col items-start rounded-2xl border p-4 text-left transition active:scale-[0.985] md:min-h-36",
                      selected
                        ? `${productType.selectedClass} shadow-[0_10px_24px_rgba(44,56,104,0.10)]`
                        : "border-[#DFE3ED] bg-white hover:border-[#BFC6D8]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        productType.iconClass,
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="mt-3 font-bold text-[#262F52]">
                      {productType.title}
                    </div>
                    <div className="mt-1 text-xs font-medium text-[#7B8397]">
                      {productType.label}
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
            <div className="rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
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

              <p className="mt-2 text-[11px] font-medium text-[#858DA2]">
                {variableProduct
                  ? "Variation SKUs will be generated automatically from this code."
                  : "Use your own stock code when needed."}
              </p>
            </div>

            <div className="flex flex-col rounded-2xl bg-[#26356F] p-4 text-white shadow-[0_12px_28px_rgba(38,53,111,0.18)]">
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
            <div className="min-w-0 rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
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

            <div className="flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white shadow-[0_12px_28px_rgba(38,53,111,0.18)]">
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
            <div className="min-w-0 overflow-hidden rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
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

            <div className="flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white shadow-[0_12px_28px_rgba(38,53,111,0.18)]">
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
            <div className="rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
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

            <div className="flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white shadow-[0_12px_28px_rgba(38,53,111,0.18)]">
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
          <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
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

              <div className="mt-3 min-h-0 flex-1 scroll-pb-20 overflow-y-auto overscroll-contain pb-20 pr-1">
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

            <div className="flex min-h-0 min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white">
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

              <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-12 pr-1">
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
          <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex min-h-0 flex-col rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE0D9] text-[#B24737]">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#26335F]">
                    Colour images
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737C96]">
                    Add one or more images for every colour.
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
                            className="relative aspect-square min-w-0 overflow-visible rounded-lg"
                          >
                            <div className="relative h-full w-full overflow-hidden rounded-lg border border-[#DDE1EA] bg-[#F8F9FC]">
                              <Image
                                unoptimized
                                fill
                                src={photo.url}
                                alt={`${row.option} image ${photoIndex + 1}`}
                                className="object-cover"
                              />

                              {photoIndex === 0 && (
                                <span className="absolute bottom-1 left-1 rounded bg-[#E85D4A] px-1.5 py-0.5 text-[7px] font-bold uppercase text-white">
                                  Main
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              aria-label={`Remove ${row.option} image ${photoIndex + 1}`}
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
                      </div>

                      {row.photos.length === 0 && (
                        <p className="mt-2 text-[10px] font-semibold text-[#A15A4E]">
                          Add at least one image for this colour.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white">
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

              <div className="mt-4 space-y-2 overflow-y-auto">
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
            <div className="min-h-0 min-w-0 overflow-y-auto rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
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

            <div className="flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white">
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

        {currentScreen === "grouped-products" && (
          <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex min-h-0 flex-col rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDF2E8] text-[#257052]">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#26335F]">
                    Existing products
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737C96]">
                    Search by product name or SKU.
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C849B]" />
                <input
                  value={groupQuery}
                  onChange={(event) =>
                    setGroupQuery(event.target.value)
                  }
                  placeholder="Search products"
                  className="h-11 w-full rounded-xl border border-[#CDD3E2] bg-white pl-10 pr-3.5 text-sm font-semibold outline-none focus:border-[#5366B7] focus:ring-4 focus:ring-[#5366B7]/10"
                />
              </div>

              <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                {groupLoading && (
                  <div className="flex min-h-24 items-center justify-center gap-2 text-sm font-semibold text-[#737C96]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching products
                  </div>
                )}

                {!groupLoading && groupError && (
                  <div className="rounded-xl bg-[#FFF0ED] px-3 py-2.5 text-xs font-semibold text-[#A24438]">
                    {groupError}
                  </div>
                )}

                {!groupLoading &&
                  !groupError &&
                  !groupQuery.trim() && (
                    <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[#C9CFDC] bg-white px-4 text-center text-sm font-medium text-[#8A91A3]">
                      Type a product name or SKU to search.
                    </div>
                  )}

                {!groupLoading &&
                  !groupError &&
                  groupQuery.trim() &&
                  groupResults.length === 0 && (
                    <div className="rounded-xl bg-white px-3 py-4 text-center text-sm font-medium text-[#8A91A3]">
                      No products found.
                    </div>
                  )}

                {!groupLoading &&
                  !groupError &&
                  groupResults.length > 0 && (
                    <div className="space-y-2">
                      {groupResults.map((product) => {
                        const selected = groupSelected.some(
                          (item) => item.id === product.id
                        );

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() =>
                              toggleGroupedProduct(product)
                            }
                            className={[
                              "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left",
                              selected
                                ? "border-[#5366B7] bg-[#EEF1FF]"
                                : "border-[#E0E4ED] bg-white",
                            ].join(" ")}
                          >
                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F1F3F8]">
                              {product.image ? (
                                <Image
                                  fill
                                  src={product.image}
                                  alt={product.name}
                                  className="object-cover"
                                />
                              ) : (
                                <Package2 className="h-5 w-5 text-[#8991A4]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-bold text-[#27335F]">
                                {product.name}
                              </div>
                              <div className="mt-1 text-[10px] font-semibold text-[#858DA2]">
                                {product.sku || "No SKU"} ·{" "}
                                {product.price
                                  ? formatPrice(product.price)
                                  : "No price"}
                              </div>
                            </div>
                            <div
                              className={[
                                "flex h-7 w-7 items-center justify-center rounded-full border",
                                selected
                                  ? "border-[#5366B7] bg-[#5366B7] text-white"
                                  : "border-[#CCD1DE] text-transparent",
                              ].join(" ")}
                            >
                              <Check className="h-4 w-4" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E85D4A]">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
                    Selected products
                  </div>
                  <div className="mt-0.5 text-base font-bold">
                    {groupSelected.length}
                  </div>
                </div>
              </div>

              <div className="mt-4 min-h-0 space-y-2 overflow-y-auto">
                {groupSelected.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-xs text-white/50">
                    No products selected.
                  </div>
                ) : (
                  groupSelected.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5"
                    >
                      <Package2 className="h-4 w-4 shrink-0 text-[#8FE0B8]" />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold">
                        {product.name}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        onClick={() =>
                          toggleGroupedProduct(product)
                        }
                        className="text-white/55 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-auto pt-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium text-white/55">
                  Grouped products use the linked products&apos;
                  own price, stock and images.
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === "publish" && (
          <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-[#E1E5EF] bg-[#F8F9FC] p-4">
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

            <div className="flex min-w-0 flex-col rounded-2xl bg-[#26356F] p-4 text-white">
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

                {selectedProductType === "grouped" && (
                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
                    <span className="text-xs text-white/60">
                      Linked products
                    </span>
                    <span className="text-xs font-bold">
                      {groupSelected.length}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-3">
                {confirmation ? (
                  <div
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-xl bg-[#DDF4E8] px-3 py-2.5 text-[11px] font-semibold leading-4 text-[#236047]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {confirmation}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium leading-4 text-white/55">
                    Preview mode — Create Product will not write
                    to WordPress yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <footer
        className="flex items-center gap-3 rounded-b-2xl border-t border-[#E5E8F0] bg-[#F8F9FC] px-4 py-3 md:px-5"
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
          disabled={!canContinue}
          onClick={continueWizard}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#E85D4A] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(232,93,74,0.22)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#C9CCD4] disabled:shadow-none"
        >
          {actionLabel}
          {currentScreen === "publish" ? (
            <Check className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </footer>
    </main>
  );
}
