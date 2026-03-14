"use client";

import { useEffect, useMemo, useState } from "react";

type KycStatus = "not_started" | "in_review" | "approved" | "rejected";
type KycDocKey = "AADHAAR" | "PAN" | "CHEQUE" | "GST_CERT";

type KycData = {
  ok?: boolean;
  kycStatus: KycStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string;
  businessType?: string;
  pan?: string;
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  state?: string;
  bank?: {
    accountNumber?: string;
    accountHolderName?: string;
    ifsc?: string;
    bankName?: string;
    branch?: string;
  };
  docs?: {
    aadhaarKey?: string;
    aadhaarName?: string;
    panKey?: string;
    panName?: string;
    cancelledChequeKey?: string;
    cancelledChequeName?: string;
    gstCertKey?: string;
    gstCertName?: string;
  };
};

function StatusPill({ status }: { status: KycStatus }) {
  const cls =
    status === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "rejected"
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "in_review"
      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function maskAccountNumber(v?: string) {
  const s = (v || "").trim();
  if (!s) return "-";
  if (s.length <= 4) return s;
  return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

export default function VendorKycReviewCard({
  blogid,
  vendorName,
  storeUrl,
}: {
  blogid: number;
  vendorName: string;
  storeUrl?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"" | "approved" | "rejected">("");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [kyc, setKyc] = useState<KycData | null>(null);

  async function loadKyc() {
    if (!storeUrl) {
      setError("Vendor store URL missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/master/vendors/${blogid}/kyc?storeUrl=${encodeURIComponent(storeUrl)}&_ts=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load KYC");
      }

      setKyc(data);
      setReviewNote(data?.reviewNote || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load KYC");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKyc();
  }, [blogid, storeUrl]);

  function showBanner(msg: string) {
    setBanner(msg);
    setTimeout(() => setBanner(null), 2400);
  }

  async function review(status: "approved" | "rejected") {
    if (!storeUrl) {
      setError("Vendor store URL missing");
      return;
    }

    setActionLoading(status);
    setError(null);

    try {
      const res = await fetch(`/api/master/vendors/${blogid}/kyc/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          note: reviewNote,
          storeUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to ${status} KYC`);
      }

      // immediately reflect approved/rejected in UI
      setKyc((prev) =>
        prev
          ? {
              ...prev,
              kycStatus: status,
              reviewedAt: data?.reviewedAt || new Date().toISOString(),
              reviewNote,
            }
          : prev
      );

      // then fetch fresh canonical copy
      await loadKyc();

      showBanner(status === "approved" ? "KYC approved successfully" : "KYC rejected successfully");
    } catch (e: any) {
      setError(e?.message || "Failed to update KYC review");
    } finally {
      setActionLoading("");
    }
  }

  const docs = useMemo(() => {
    if (!kyc?.docs) return [];

    return [
      {
        key: "AADHAAR" as KycDocKey,
        title: "Aadhaar",
        fileKey: kyc.docs.aadhaarKey,
        fileName: kyc.docs.aadhaarName,
      },
      {
        key: "PAN" as KycDocKey,
        title: "PAN",
        fileKey: kyc.docs.panKey,
        fileName: kyc.docs.panName,
      },
      {
        key: "CHEQUE" as KycDocKey,
        title: "Cancelled cheque",
        fileKey: kyc.docs.cancelledChequeKey,
        fileName: kyc.docs.cancelledChequeName,
      },
      {
        key: "GST_CERT" as KycDocKey,
        title: "GST certificate",
        fileKey: kyc.docs.gstCertKey,
        fileName: kyc.docs.gstCertName,
      },
    ];
  }, [kyc]);

  return (
    <>
      {banner ? (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            {banner}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm lg:col-span-3">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-900">KYC Review</div>
            <div className="text-xs text-slate-500">
              Vendor: {vendorName} {storeUrl ? `• ${storeUrl}` : ""}
            </div>
          </div>

          <div>{kyc?.kycStatus ? <StatusPill status={kyc.kycStatus} /> : null}</div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-600">Loading KYC details…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : !kyc ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            KYC data not available.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </div>
                <div className="space-y-1 text-sm text-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Current:</span>
                    <StatusPill status={kyc.kycStatus} />
                  </div>
                  <div className="text-xs text-slate-600">
                    Submitted: {kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleString() : "-"}
                  </div>
                  <div className="text-xs text-slate-600">
                    Reviewed: {kyc.reviewedAt ? new Date(kyc.reviewedAt).toLocaleString() : "-"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Business
                </div>
                <div className="space-y-1 text-sm text-slate-900">
                  <div><span className="text-slate-500">Type:</span> {kyc.businessType || "-"}</div>
                  <div><span className="text-slate-500">PAN:</span> {kyc.pan || "-"}</div>
                  <div><span className="text-slate-500">GSTIN:</span> {kyc.gstin || "-"}</div>
                  <div><span className="text-slate-500">Legal:</span> {kyc.legalName || "-"}</div>
                  <div><span className="text-slate-500">Trade:</span> {kyc.tradeName || "-"}</div>
                  <div><span className="text-slate-500">State:</span> {kyc.state || "-"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Bank
                </div>
                <div className="space-y-1 text-sm text-slate-900">
                  <div><span className="text-slate-500">A/c holder:</span> {kyc.bank?.accountHolderName || "-"}</div>
                  <div><span className="text-slate-500">A/c no:</span> {maskAccountNumber(kyc.bank?.accountNumber)}</div>
                  <div><span className="text-slate-500">IFSC:</span> {kyc.bank?.ifsc || "-"}</div>
                  <div><span className="text-slate-500">Bank:</span> {kyc.bank?.bankName || "-"}</div>
                  <div><span className="text-slate-500">Branch:</span> {kyc.bank?.branch || "-"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-3 text-sm font-semibold text-slate-900">Uploaded Documents</div>

              <div className="grid gap-3 md:grid-cols-2">
                {docs.map((doc) => (
                  <div
                    key={doc.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">{doc.title}</div>
                      <div className="truncate text-xs text-slate-500">
                        {doc.fileName || doc.fileKey || "Not uploaded"}
                      </div>
                    </div>

                    {doc.fileKey ? (
                      <a
                        href={`/api/master/vendors/${blogid}/kyc?storeUrl=${encodeURIComponent(storeUrl || "")}&download=${encodeURIComponent(doc.fileKey)}&_ts=${Date.now()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Missing</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 text-sm font-semibold text-slate-900">Review Note</div>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Optional note for approval or rejection"
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => review("approved")}
                disabled={actionLoading !== ""}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {actionLoading === "approved" ? "Approving…" : "Approve"}
              </button>

              <button
                type="button"
                onClick={() => review("rejected")}
                disabled={actionLoading !== ""}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading === "rejected" ? "Rejecting…" : "Reject"}
              </button>

              <button
                type="button"
                onClick={loadKyc}
                disabled={actionLoading !== "" || loading}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}