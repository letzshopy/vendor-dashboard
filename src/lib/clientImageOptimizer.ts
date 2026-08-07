"use client";

export type ClientImageOptimizationOptions = {
  triggerBytes?: number;
  targetBytes?: number;
  maxBytes?: number;
  maxSourceBytes?: number;
  maxDimension?: number;
  minDimension?: number;
};

export type ClientImageOptimizationResult = {
  file: File;
  optimized: boolean;
  originalBytes: number;
  outputBytes: number;
};

const MB = 1024 * 1024;

export const CONTENT_IMAGE_OPTIMIZATION_OPTIONS = {
  triggerBytes: 2.5 * MB,
  targetBytes: 1.8 * MB,
  maxBytes: 3 * MB,
  maxSourceBytes: 25 * MB,
  maxDimension: 1800,
  minDimension: 900,
} as const;

const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const QUALITY_STEPS = [0.9, 0.84, 0.78, 0.72, 0.66, 0.6];
const DIMENSION_FACTORS = [1, 0.9, 0.8, 0.72, 0.64];

type LoadedImage = {
  image: HTMLImageElement;
  width: number;
  height: number;
  release: () => void;
};

function inferredMimeType(file: File): string {
  const declared = file.type.trim().toLowerCase();
  if (declared) return declared;

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";

  return "";
}

function outputTypeFor(sourceType: string): "image/jpeg" | "image/webp" {
  return sourceType === "image/png" || sourceType === "image/webp"
    ? "image/webp"
    : "image/jpeg";
}

function optimizedFileName(
  originalName: string,
  outputType: "image/jpeg" | "image/webp",
): string {
  const base =
    originalName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-") || `image-${Date.now()}`;

  return `${base}-optimized.${outputType === "image/webp" ? "webp" : "jpg"}`;
}

function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        image,
        width: Math.max(1, image.naturalWidth || image.width),
        height: Math.max(1, image.naturalHeight || image.height),
        release: () => URL.revokeObjectURL(objectUrl),
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          "This image could not be opened. Please choose a JPG, PNG, WebP, or GIF image.",
        ),
      );
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/jpeg" | "image/webp",
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("The image could not be optimized on this device."));
      },
      type,
      quality,
    );
  });
}

export function formatImageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  return `${(bytes / MB).toFixed(2)} MB`;
}

export async function optimizeContentImageForUpload(
  file: File,
  options: ClientImageOptimizationOptions = {},
): Promise<ClientImageOptimizationResult> {
  const config = {
    ...CONTENT_IMAGE_OPTIMIZATION_OPTIONS,
    ...options,
  };

  const sourceType = inferredMimeType(file);

  if (!SUPPORTED_TYPES.has(sourceType)) {
    throw new Error("Please upload a JPG, PNG, WebP, or GIF image.");
  }

  if (file.size > config.maxSourceBytes) {
    throw new Error(
      `This image is too large to prepare. Please choose an image below ${formatImageBytes(
        config.maxSourceBytes,
      )}.`,
    );
  }

  if (sourceType === "image/gif") {
    if (file.size <= config.maxBytes) {
      return {
        file,
        optimized: false,
        originalBytes: file.size,
        outputBytes: file.size,
      };
    }

    throw new Error(
      "This GIF is too large to upload. Please use a smaller GIF or convert it to JPG, PNG, or WebP.",
    );
  }

  const loaded = await loadImage(file);

  try {
    const largestSide = Math.max(
      loaded.width,
      loaded.height
    );

    const shouldOptimize =
      file.size > config.triggerBytes ||
      largestSide > config.maxDimension ||
      sourceType === "image/png";

    if (!shouldOptimize) {
      return {
        file,
        optimized: false,
        originalBytes: file.size,
        outputBytes: file.size,
      };
    }

    const initialScale = Math.min(
      1,
      config.maxDimension / largestSide
    );
    const outputType = outputTypeFor(sourceType);
    let smallestBlob: Blob | null = null;

    for (const dimensionFactor of DIMENSION_FACTORS) {
      const scale = initialScale * dimensionFactor;
      const width = Math.max(1, Math.round(loaded.width * scale));
      const height = Math.max(1, Math.round(loaded.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", {
        alpha: outputType !== "image/jpeg",
      });

      if (!context) {
        throw new Error("Image optimization is not supported on this device.");
      }

      if (outputType === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      } else {
        context.clearRect(0, 0, width, height);
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(loaded.image, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, outputType, quality);

        if (!smallestBlob || blob.size < smallestBlob.size) {
          smallestBlob = blob;
        }

        if (blob.size <= config.targetBytes) {
          const optimized = new File(
            [blob],
            optimizedFileName(file.name, outputType),
            {
              type: outputType,
              lastModified: Date.now(),
            },
          );

          return {
            file: optimized,
            optimized: true,
            originalBytes: file.size,
            outputBytes: optimized.size,
          };
        }
      }

      if (Math.max(width, height) <= config.minDimension) {
        break;
      }
    }

    if (smallestBlob && smallestBlob.size <= config.maxBytes) {
      const optimized = new File(
        [smallestBlob],
        optimizedFileName(file.name, outputTypeFor(sourceType)),
        {
          type: outputTypeFor(sourceType),
          lastModified: Date.now(),
        },
      );

      return {
        file: optimized,
        optimized: true,
        originalBytes: file.size,
        outputBytes: optimized.size,
      };
    }

    if (file.size <= config.maxBytes) {
      return {
        file,
        optimized: false,
        originalBytes: file.size,
        outputBytes: file.size,
      };
    }

    throw new Error(
      "This image is too large even after optimization. Please choose a smaller image.",
    );
  } finally {
    loaded.release();
  }
}
