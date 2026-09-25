"use client";

import * as React from "react";
import {
  ImagePlus,
  QrCode,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  useFormContext,
} from "react-hook-form";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import type {
  PaymentsFormValues,
} from "@/types/payments";

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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-heading">
        {label}
      </label>

      {children}

      {hint ? (
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function UPIPanel() {
  const {
    register,
    watch,
    setValue,
  } =
    useFormContext<PaymentsFormValues>();

  const qrValue =
    watch("upi.qr") ||
    "no";

  const qrSrc =
    watch(
      "upi.qr_src"
    ) || "";

  const fileInputRef =
    React.useRef<HTMLInputElement | null>(
      null
    );

  const qrPreviewRef =
    React.useRef<string | null>(
      null
    );

  const [
    uploading,
    setUploading,
  ] =
    React.useState(false);

  const [
    qrPreviewUrl,
    setQrPreviewUrl,
  ] =
    React.useState<string | null>(
      null
    );

  const clearQrPreview =
    React.useCallback(() => {
      if (
        qrPreviewRef.current
      ) {
        URL.revokeObjectURL(
          qrPreviewRef.current
        );

        qrPreviewRef.current =
          null;
      }

      setQrPreviewUrl(
        null
      );
    }, []);

  React.useEffect(() => {
    return () => {
      if (
        qrPreviewRef.current
      ) {
        URL.revokeObjectURL(
          qrPreviewRef.current
        );
      }
    };
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleQrUpload(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      actionFeedback.warning({
        id:
          "upi-qr-upload",
        title:
          "Choose an image file",
        durationMs: 2800,
      });
      return;
    }

    clearQrPreview();

    const localPreview =
      URL.createObjectURL(
        file
      );

    qrPreviewRef.current =
      localPreview;

    setQrPreviewUrl(
      localPreview
    );

    setUploading(true);

    actionFeedback.loading({
      id:
        "upi-qr-upload",
      title:
        "Uploading QR…",
    });

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "purpose",
        "vendor_upi_qr"
      );

      const response =
        await fetch(
          "/api/media/upload",
          {
            method:
              "POST",
            body:
              formData,
          }
        );

      const parsed =
        await response
          .json()
          .catch(
            () => null
          );

      const data =
        isRecord(parsed)
          ? parsed
          : {};

      const media =
        isRecord(
          data.media
        )
          ? data.media
          : {};

      if (!response.ok) {
        throw new Error(
          typeof data.error ===
            "string"
            ? data.error
            : "QR upload failed"
        );
      }

      const url =
        [
          data.url,
          data.source_url,
          media.source_url,
        ].find(
          (
            value
          ): value is string =>
            typeof value ===
              "string" &&
            /^https?:///i.test(
              value
            )
        ) || "";

      if (!url) {
        throw new Error(
          "Upload completed but QR image URL is missing."
        );
      }

      setValue(
        "upi.qr_src",
        url,
        {
          shouldDirty:
            true,
          shouldTouch:
            true,
          shouldValidate:
            true,
        }
      );

      setValue(
        "upi.qr",
        "yes",
        {
          shouldDirty:
            true,
          shouldTouch:
            true,
          shouldValidate:
            true,
        }
      );

      actionFeedback.success({
        id:
          "upi-qr-upload",
        title:
          "QR uploaded",
        durationMs: 2000,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id:
          "upi-qr-upload",
        title:
          "Could not upload QR",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      clearQrPreview();
      setUploading(false);
    }
  }

  function removeQr() {
    clearQrPreview();

    setValue(
      "upi.qr_src",
      "",
      {
        shouldDirty:
          true,
        shouldTouch:
          true,
        shouldValidate:
          true,
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="UPI ID">
          <Input
            placeholder="yourname@bank"
            {...register(
              "upi.upi_id"
            )}
          />
        </Field>

        <Field label="UPI payment number">
          <Input
            inputMode="numeric"
            placeholder="10-digit mobile number"
            {...register(
              "upi.upi_number"
            )}
          />
        </Field>

        <Field label="Payee name">
          <Input
            placeholder="Name shown to customer"
            {...register(
              "upi.payee"
            )}
          />
        </Field>

        <Field
          label="Payment time limit"
          hint="Optional, in minutes."
        >
          <Input
            type="number"
            min={0}
            step={1}
            placeholder="30"
            {...register(
              "upi.time_min"
            )}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-heading">
            Show QR at checkout
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Display your UPI QR along with UPI details.
          </p>
        </div>

        <select
          className="ls-focus-ring h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
          value={
            qrValue
          }
          onChange={(
            event
          ) =>
            setValue(
              "upi.qr",
              event.target
                .value as
                | "yes"
                | "no",
              {
                shouldDirty:
                  true,
                shouldTouch:
                  true,
                shouldValidate:
                  true,
              }
            )
          }
        >
          <option value="no">
            Off
          </option>
          <option value="yes">
            On
          </option>
        </select>

        <input
          type="hidden"
          {...register(
            "upi.qr"
          )}
        />
      </div>

      {qrValue ===
      "yes" ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-soft p-4">
          <input
            type="hidden"
            {...register(
              "upi.qr_src"
            )}
          />

          <input
            ref={
              fileInputRef
            }
            type="file"
            accept="image/*"
            className="hidden"
            onChange={
              handleQrUpload
            }
          />

          {qrPreviewUrl ||
          qrSrc ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-card p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    qrPreviewUrl ||
                    qrSrc
                  }
                  alt="UPI QR"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-heading">
                  <QrCode className="h-4 w-4 text-primary" />
                  QR ready
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  This QR will be shown to customers when QR display is on.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <AsyncButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={
                      uploading
                    }
                    loadingLabel="Uploading…"
                    onClick={
                      openFilePicker
                    }
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    Replace QR
                  </AsyncButton>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={
                      uploading
                    }
                    onClick={
                      removeQr
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-primary">
                  <ImagePlus className="h-4.5 w-4.5" />
                </span>

                <div>
                  <div className="text-sm font-bold text-heading">
                    Upload UPI QR
                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    PNG or JPG recommended.
                  </p>
                </div>
              </div>

              <AsyncButton
                type="button"
                variant="secondary"
                size="sm"
                loading={
                  uploading
                }
                loadingLabel="Uploading…"
                onClick={
                  openFilePicker
                }
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload QR
              </AsyncButton>
            </div>
          )}
        </div>
      ) : null}

      <Field
        label="Customer instructions"
        hint="Shown on checkout and order emails."
      >
        <textarea
          rows={3}
          className="ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          placeholder="UPI payment instructions"
          {...register(
            "upi.notes"
          )}
        />
      </Field>
    </div>
  );
}
