"use client";

import {
  Capacitor,
} from "@capacitor/core";
import {
  Directory,
  Filesystem,
} from "@capacitor/filesystem";
import {
  Share,
} from "@capacitor/share";

export type ClientFileSaveResult = {
  native: boolean;
  fileName: string;
  savedLocation: string | null;
  shared: boolean;
  message: string;
};

type SaveClientFileOptions = {
  shareNative?: boolean;
  shareTitle?: string;
  shareDialogTitle?: string;
};

function safeFileName(
  fileName: string
) {
  const cleaned = fileName
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");

  return (
    cleaned.slice(0, 180) ||
    `letzshopy-file-${Date.now()}`
  );
}

async function blobToBase64(
  blob: Blob
): Promise<string> {
  return await new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        const value =
          typeof reader.result ===
          "string"
            ? reader.result
            : "";

        const commaIndex =
          value.indexOf(",");

        if (commaIndex < 0) {
          reject(
            new Error(
              "The file could not be prepared for saving."
            )
          );
          return;
        }

        resolve(
          value.slice(
            commaIndex + 1
          )
        );
      };

      reader.onerror = () =>
        reject(
          new Error(
            "The file could not be read for saving."
          )
        );

      reader.readAsDataURL(
        blob
      );
    }
  );
}

function browserDownload(
  blob: Blob,
  fileName: string
): ClientFileSaveResult {
  const objectUrl =
    URL.createObjectURL(blob);
  const anchor =
    document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display =
    "none";

  document.body.appendChild(
    anchor
  );
  anchor.click();
  anchor.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(
        objectUrl
      ),
    1500
  );

  return {
    native: false,
    fileName,
    savedLocation: null,
    shared: false,
    message:
      "Download started.",
  };
}

export async function saveClientFile(
  blob: Blob,
  requestedFileName: string,
  options: SaveClientFileOptions = {}
): Promise<ClientFileSaveResult> {
  const fileName =
    safeFileName(
      requestedFileName
    );

  if (
    !Capacitor.isNativePlatform()
  ) {
    return browserDownload(
      blob,
      fileName
    );
  }

  const base64 =
    await blobToBase64(blob);

  let savedLocation:
    | string
    | null = null;
  let documentSaveError:
    | unknown
    | null = null;

  try {
    await Filesystem.writeFile({
      path:
        `LetzShopy/${fileName}`,
      data: base64,
      directory:
        Directory.Documents,
      recursive: true,
    });

    savedLocation =
      `Documents/LetzShopy/${fileName}`;
  } catch (error: unknown) {
    documentSaveError =
      error;
    console.warn(
      "LetzShopy document save failed",
      error
    );
  }

  let shared = false;

  if (
    options.shareNative ||
    !savedLocation
  ) {
    try {
      const cacheResult =
        await Filesystem.writeFile({
          path:
            `letzshopy-share/${Date.now()}-${fileName}`,
          data: base64,
          directory:
            Directory.Cache,
          recursive: true,
        });

      if (
        Capacitor.isPluginAvailable(
          "Share"
        )
      ) {
        const canShare =
          await Share.canShare();

        if (canShare.value) {
          await Share.share({
            title:
              options.shareTitle ||
              fileName,
            url:
              cacheResult.uri,
            dialogTitle:
              options.shareDialogTitle ||
              "Open or share file",
          });

          shared = true;
        }
      }
    } catch (error: unknown) {
      console.warn(
        "LetzShopy native share failed",
        error
      );
    }
  }

  if (
    !savedLocation &&
    !shared
  ) {
    console.error(
      "LetzShopy native file save failed",
      documentSaveError
    );

    throw new Error(
      "The file could not be saved on this device."
    );
  }

  const message =
    savedLocation
      ? shared
        ? `Saved to ${savedLocation}. Android file actions opened.`
        : `Saved to ${savedLocation}.`
      : "Android file actions opened.";

  return {
    native: true,
    fileName,
    savedLocation,
    shared,
    message,
  };
}
