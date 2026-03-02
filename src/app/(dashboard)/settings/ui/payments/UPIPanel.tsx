"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { PaymentsFormValues } from "@/types/payments";

export default function UPIPanel() {
  const { register, watch, setValue } = useFormContext<PaymentsFormValues>();
  const qrValue = watch("upi.qr") || "no";

  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const handleQrUpload: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Re-use your media upload API (same one used for products)
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      const url =
        data?.url || data?.source_url || data?.media?.source_url || "";

      if (!url) {
        throw new Error("Upload succeeded but no URL returned");
      }

      // Save URL into form state so it goes into letz_payments_settings.upi.qr_src
      setValue("upi.qr_src", url, { shouldDirty: true, shouldTouch: true });
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Row: UPI ID + UPI Payment Number */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="upi_upi_id"
            className="block text-sm font-medium mb-1"
          >
            UPI ID
          </label>
          <input
            id="upi_upi_id"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="yourname@bank"
            {...register("upi.upi_id")}
          />
        </div>
        <div>
          <label
            htmlFor="upi_upi_number"
            className="block text-sm font-medium mb-1"
          >
            UPI Payment Number
          </label>
          <input
            id="upi_upi_number"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="10-digit mobile UPI number"
            {...register("upi.upi_number")}
          />
        </div>
      </div>

      {/* Row: Payee + Time limit */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="upi_payee"
            className="block text-sm font-medium mb-1"
          >
            Payee name (optional)
          </label>
          <input
            id="upi_payee"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder=""
            {...register("upi.payee")}
          />
        </div>
        <div>
          <label
            htmlFor="upi_time_min"
            className="block text-sm font-medium mb-1"
          >
            Time limit (mins, optional)
          </label>
          <input
            id="upi_time_min"
            type="number"
            min={0}
            step={1}
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="e.g., 30"
            {...register("upi.time_min")}
          />
        </div>
      </div>

      {/* Show QR select */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="upi_qr"
            className="block text-sm font-medium mb-1"
          >
            Show QR on checkout
          </label>
          <select
            id="upi_qr"
            className="w-full border rounded-md px-3 py-2 text-sm"
            {...register("upi.qr")}
            value={qrValue}
            onChange={(e) => setValue("upi.qr", e.target.value as "yes" | "no")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>

      {/* QR URL + upload – only when QR is enabled */}
      {qrValue === "yes" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="upi_qr_src"
              className="block text-sm font-medium mb-1"
            >
              QR image URL
            </label>
            <input
              id="upi_qr_src"
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="https://template.letzshopy.in/wp-content/uploads/upi-qr.png"
              {...register("upi.qr_src")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              If you already uploaded QR to WordPress Media, paste its URL here.
            </p>
          </div>
          <div>
            <label
              htmlFor="upi_qr_upload"
              className="block text-sm font-medium mb-1"
            >
              Or upload QR image
            </label>
            <input
              id="upi_qr_upload"
              type="file"
              accept="image/*"
              className="w-full text-sm"
              onChange={handleQrUpload}
            />
            <p className="text-xs text-muted-foreground mt-1">
              We&apos;ll upload to WordPress and fill the URL automatically.
            </p>
            {uploading && (
              <p className="text-xs text-muted-foreground mt-1">
                Uploading QR image…
              </p>
            )}
            {uploadError && (
              <p className="text-xs text-red-600 mt-1">{uploadError}</p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label
          htmlFor="upi_notes"
          className="block text-sm font-medium mb-1"
        >
          Notes (shown on Thank-you &amp; Email)
        </label>
        <textarea
          id="upi_notes"
          rows={3}
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="UPI instructions for the customer"
          {...register("upi.notes")}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Customers will see these UPI instructions on checkout, thank-you page
          and in order emails.
        </p>
      </div>
    </div>
  );
}
