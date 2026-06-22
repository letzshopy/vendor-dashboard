"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { PaymentsFormValues } from "@/types/payments";

export default function UPIPanel() {
  const { register, watch, setValue } = useFormContext<PaymentsFormValues>();

  const qrValue = watch("upi.qr") || "no";
  const qrSrc = watch("upi.qr_src") || "";

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleQrUpload: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload a valid QR image file.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/settings/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "QR upload failed");
      }

      const url =
        data?.url || data?.source_url || data?.media?.source_url || "";

      if (!url) {
        throw new Error("Upload succeeded but image URL was missing");
      }

      setValue("upi.qr_src", url, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      setValue("upi.qr", "yes", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    } catch (err: any) {
      setUploadError(err?.message || "QR upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeQr = () => {
    setValue("upi.qr_src", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="upi_upi_id"
            className="mb-1 block text-sm font-medium"
          >
            UPI ID
          </label>
          <input
            id="upi_upi_id"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="yourname@bank"
            {...register("upi.upi_id")}
          />
        </div>

        <div>
          <label
            htmlFor="upi_upi_number"
            className="mb-1 block text-sm font-medium"
          >
            UPI Payment Number
          </label>
          <input
            id="upi_upi_number"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="10-digit mobile UPI number"
            {...register("upi.upi_number")}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="upi_payee"
            className="mb-1 block text-sm font-medium"
          >
            Payee name
          </label>
          <input
            id="upi_payee"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Name shown to customer"
            {...register("upi.payee")}
          />
        </div>

        <div>
          <label
            htmlFor="upi_time_min"
            className="mb-1 block text-sm font-medium"
          >
            Time limit
          </label>
          <input
            id="upi_time_min"
            type="number"
            min={0}
            step={1}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g., 30"
            {...register("upi.time_min")}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Optional. Enter minutes if you want to show payment time limit.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="upi_qr" className="mb-1 block text-sm font-medium">
            Show QR on checkout
          </label>
          <select
            id="upi_qr"
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register("upi.qr")}
            value={qrValue}
            onChange={(e) =>
              setValue("upi.qr", e.target.value as "yes" | "no", {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>

      {qrValue === "yes" && (
        <div>
          <label className="mb-2 block text-sm font-medium">UPI QR image</label>

          <input type="hidden" {...register("upi.qr_src")} />

          <input
            ref={fileInputRef}
            id="upi_qr_upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleQrUpload}
          />

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            {qrSrc ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt="UPI QR"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">
                    QR image uploaded
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    This QR will be shown on checkout when QR display is enabled.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openFilePicker}
                      disabled={uploading}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {uploading ? "Uploading..." : "Replace QR"}
                    </button>

                    <button
                      type="button"
                      onClick={removeQr}
                      disabled={uploading}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Upload UPI QR image
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload PNG/JPG QR image. It will be stored safely and hidden
                    from Catalog Media.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={uploading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Upload QR"}
                </button>
              </div>
            )}

            {uploadError && (
              <p className="mt-3 text-xs font-medium text-red-600">
                {uploadError}
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="upi_notes" className="mb-1 block text-sm font-medium">
          Notes shown on checkout / email
        </label>
        <textarea
          id="upi_notes"
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="UPI instructions for the customer"
          {...register("upi.notes")}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Customers will see these UPI instructions on checkout and in order
          emails.
        </p>
      </div>
    </div>
  );
}