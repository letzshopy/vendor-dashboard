"use client";

import { useEffect, useMemo, useState } from "react";

type BizType =
  | "INDIVIDUAL"
  | "PROPRIETORSHIP"
  | "LLP"
  | "PVT_LTD"
  | "PUBLIC_LTD"
  | "OPC";

type KycFileType = "AADHAAR" | "PAN" | "CHEQUE" | "GST_CERT";

type KycFile = { type: KycFileType; key: string; name?: string };
type KycStatus = "not_started" | "in_review" | "approved" | "rejected";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 placeholder:text-slate-500 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

const selectClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 shadow-sm focus:outline-none focus:ring-2 " +
  "focus:ring-indigo-500 focus:border-indigo-600";

const primaryBtnClass =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 " +
  "text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60";

const secondaryBtnClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 " +
  "text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60";

function downloadUrlForKey(fileKey: string) {
  return `/api/settings/kyc/download?fileKey=${encodeURIComponent(fileKey)}`;
}

function normalizeBizType(v: string | undefined): BizType {
  const allowed: BizType[] = [
    "INDIVIDUAL",
    "PROPRIETORSHIP",
    "LLP",
    "PVT_LTD",
    "PUBLIC_LTD",
    "OPC",
  ];
  return allowed.includes(v as BizType) ? (v as BizType) : "INDIVIDUAL";
}

function KycPrivateUploader({
  onUploaded,
  docType,
  label = "Upload file",
  accept = "image/*,.pdf,application/pdf",
}: {
  onUploaded: (key: string, filename?: string) => void;
  docType: KycFileType;
  label?: string;
  accept?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      fd.append("doc_type", docType);

      const res = await fetch("/api/settings/kyc/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      const key = data?.fileKey || data?.key;
      if (!key) throw new Error("Upload ok but no key returned");

      onUploaded(key, data?.filename || file.name);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-1">
      <label className="inline-block cursor-pointer rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50">
        {loading ? "Uploading…" : label}
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={loading}
        />
      </label>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}

function DocRow({
  title,
  required = false,
  type,
  kyc,
  setKyc,
  readOnly = false,
}: {
  title: string;
  required?: boolean;
  type: KycFileType;
  kyc: KycFile[];
  setKyc: (v: KycFile[]) => void;
  readOnly?: boolean;
}) {
  const current = useMemo(() => kyc.find((k) => k.type === type), [kyc, type]);

  const onUploaded = (key: string, name?: string) => {
    const others = kyc.filter((k) => k.type !== type);
    setKyc([...others, { type, key, name }]);
  };

  const clear = () => setKyc(kyc.filter((k) => k.type !== type));

  return (
    <div className="mb-2 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900">
          {title} {required && <span className="text-red-500">*</span>}
        </div>

        {current ? (
          <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
            </svg>
            <span className="truncate">{current.name || current.key || "Uploaded"}</span>
          </div>
        ) : (
          <div className="mt-0.5 text-xs text-slate-500">Not uploaded</div>
        )}

        {required && !current && (
          <div className="mt-1 text-[11px] text-red-500">This document is required.</div>
        )}
      </div>

      <div className="flex items-center gap-2 whitespace-nowrap">
        {current ? (
          <>
            <a
              href={downloadUrlForKey(current.key)}
              target="_blank"
              className="text-xs text-indigo-600 underline"
              rel="noreferrer"
            >
              View
            </a>

            {!readOnly && (
              <button
                onClick={clear}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Remove
              </button>
            )}
          </>
        ) : readOnly ? null : (
          <KycPrivateUploader onUploaded={onUploaded} docType={type} />
        )}
      </div>
    </div>
  );
}

export default function KycTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [banner, setBanner] = useState<null | "saved" | "submitted">(null);
  const [error, setError] = useState<string | null>(null);

  const [kycStatus, setKycStatus] = useState<KycStatus>("not_started");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [bizType, setBizType] = useState<BizType>("INDIVIDUAL");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [gstLegal, setGstLegal] = useState("");
  const [gstTrade, setGstTrade] = useState("");
  const [gstState, setGstState] = useState("");

  const [accNo, setAccNo] = useState("");
  const [accName, setAccName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bank, setBank] = useState("");
  const [branch, setBranch] = useState("");

  const [kyc, setKyc] = useState<KycFile[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState("");

  const inReview = kycStatus === "in_review";
  const approved = kycStatus === "approved";
  const rejected = kycStatus === "rejected";
  const readOnly = inReview || approved;

  const showGST = bizType !== "INDIVIDUAL";

  const getSnapshot = () =>
    JSON.stringify({
      bizType,
      pan,
      gstin,
      gstLegal,
      gstTrade,
      gstState,
      accNo,
      accName,
      ifsc,
      bank,
      branch,
      kyc,
      kycStatus,
    });

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return initialSnapshot !== getSnapshot();
  }, [initialSnapshot, bizType, pan, gstin, gstLegal, gstTrade, gstState, accNo, accName, ifsc, bank, branch, kyc, kycStatus]);

  const triggerBanner = (kind: "saved" | "submitted") => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setBanner(kind);
    setTimeout(() => setBanner(null), 2600);
  };

  async function loadKyc() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/settings/kyc", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Failed to load KYC");

      const files: KycFile[] = [];
      if (data?.docs?.aadhaarKey) files.push({ type: "AADHAAR", key: data.docs.aadhaarKey, name: data.docs.aadhaarName });
      if (data?.docs?.panKey) files.push({ type: "PAN", key: data.docs.panKey, name: data.docs.panName });
      if (data?.docs?.cancelledChequeKey) files.push({ type: "CHEQUE", key: data.docs.cancelledChequeKey, name: data.docs.cancelledChequeName });
      if (data?.docs?.gstCertKey) files.push({ type: "GST_CERT", key: data.docs.gstCertKey, name: data.docs.gstCertName });

      setKycStatus((data?.kycStatus || "not_started") as KycStatus);
      setSubmittedAt(data?.submittedAt || null);

      setBizType(normalizeBizType(data?.businessType));
      setPan(data?.pan || "");
      setGstin(data?.gstin || "");
      setGstLegal(data?.legalName || "");
      setGstTrade(data?.tradeName || "");
      setGstState(data?.state || "");

      setAccNo(data?.bank?.accountNumber || "");
      setAccName(data?.bank?.accountHolderName || "");
      setIfsc(data?.bank?.ifsc || "");
      setBank(data?.bank?.bankName || "");
      setBranch(data?.bank?.branch || "");

      setKyc(files);

      const snap = JSON.stringify({
        bizType: normalizeBizType(data?.businessType),
        pan: data?.pan || "",
        gstin: data?.gstin || "",
        gstLegal: data?.legalName || "",
        gstTrade: data?.tradeName || "",
        gstState: data?.state || "",
        accNo: data?.bank?.accountNumber || "",
        accName: data?.bank?.accountHolderName || "",
        ifsc: data?.bank?.ifsc || "",
        bank: data?.bank?.bankName || "",
        branch: data?.bank?.branch || "",
        kyc: files,
        kycStatus: (data?.kycStatus || "not_started") as KycStatus,
      });

      setInitialSnapshot(snap);
    } catch (e: any) {
      setError(e?.message || "Failed to load KYC");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKyc();
  }, []);

  function buildDocsPayload() {
    const doc = (type: KycFileType) => kyc.find((k) => k.type === type);

    return {
      aadhaarKey: doc("AADHAAR")?.key || "",
      aadhaarName: doc("AADHAAR")?.name || "",
      panKey: doc("PAN")?.key || "",
      panName: doc("PAN")?.name || "",
      cancelledChequeKey: doc("CHEQUE")?.key || "",
      cancelledChequeName: doc("CHEQUE")?.name || "",
      gstCertKey: doc("GST_CERT")?.key || "",
      gstCertName: doc("GST_CERT")?.name || "",
    };
  }

  function buildPayload() {
    return {
      businessType: bizType,
      pan,
      gstin,
      legalName: gstLegal,
      tradeName: gstTrade,
      state: gstState,
      bank: {
        accountNumber: accNo,
        accountHolderName: accName,
        ifsc,
        bankName: bank,
        branch,
      },
      docs: buildDocsPayload(),
    };
  }

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/settings/kyc", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save KYC");

      const snap = getSnapshot();
      setInitialSnapshot(snap);
      triggerBanner("saved");
    } catch (e: any) {
      setError(e?.message || "Failed to save KYC");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    const has = (t: KycFileType) => kyc.some((k) => k.type === t);

    const panOk = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase().trim());
    if (!panOk) return alert("Please enter a valid PAN (e.g., ABCDE1234F).");

    if (
      showGST &&
      gstin &&
      !/^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$/.test(gstin.toUpperCase().trim())
    ) {
      return alert("GSTIN format looks invalid.");
    }

    if (!accNo || !accName) {
      return alert("Please enter bank account number and account holder name.");
    }

    if (!/^[A-Z]{4}0[0-9A-Z]{6}$/.test(ifsc.toUpperCase().trim())) {
      return alert("Invalid IFSC code.");
    }

    if (!has("AADHAAR") || !has("PAN") || !has("CHEQUE")) {
      return alert("Please upload Aadhaar, PAN, and Cancelled Cheque.");
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/settings/kyc/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to submit KYC");

      setKycStatus("in_review");
      setSubmittedAt(data?.submittedAt || new Date().toISOString());

      const snap = JSON.stringify({
        ...JSON.parse(getSnapshot()),
        kycStatus: "in_review",
      });
      setInitialSnapshot(snap);

      triggerBanner("submitted");
    } catch (e: any) {
      setError(e?.message || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  }

  const statusPill = (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        approved
          ? "bg-emerald-100 text-emerald-700"
          : rejected
          ? "bg-red-100 text-red-700"
          : inReview
          ? "bg-indigo-100 text-indigo-700"
          : "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {kycStatus.replace("_", " ")}
    </span>
  );

  if (loading) {
    return <div className="text-sm text-slate-600">Loading KYC…</div>;
  }

  return (
    <>
      {banner && (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            {banner === "saved" ? "KYC draft saved successfully" : "KYC submitted for review"}
          </div>
        </div>
      )}

      <section className="max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          {statusPill}
          {submittedAt ? (
            <span className="text-xs text-slate-500">
              Submitted: {new Date(submittedAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        {inReview && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            KYC review is in progress. Settings remain accessible, but business modules stay locked until approval.
          </div>
        )}

        {approved && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Your KYC has been approved.
          </div>
        )}

        {rejected && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            Your KYC was rejected. Please review the details, update documents if needed, and submit again.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Business details</h3>
            <p className="text-[11px] text-slate-500">
              This information is used only for verification and KYC.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Business type</label>
              <select
                className={selectClass}
                value={bizType}
                onChange={(e) => setBizType(e.target.value as BizType)}
                disabled={readOnly}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="PROPRIETORSHIP">Proprietorship</option>
                <option value="LLP">LLP</option>
                <option value="PVT_LTD">Private Limited</option>
                <option value="PUBLIC_LTD">Public Limited</option>
                <option value="OPC">OPC</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">PAN *</label>
              <input
                className={inputClass}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                disabled={readOnly}
              />
            </div>
          </div>

          {showGST && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">GSTIN</label>
                <input
                  className={inputClass}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  disabled={readOnly}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Legal name</label>
                <input
                  className={inputClass}
                  value={gstLegal}
                  onChange={(e) => setGstLegal(e.target.value)}
                  placeholder="Legal name as per GST"
                  disabled={readOnly}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Trade name</label>
                <input
                  className={inputClass}
                  value={gstTrade}
                  onChange={(e) => setGstTrade(e.target.value)}
                  placeholder="Trade name (if any)"
                  disabled={readOnly}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Registered state</label>
                <input
                  className={inputClass}
                  value={gstState}
                  onChange={(e) => setGstState(e.target.value)}
                  placeholder="State as per GST registration"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Bank details</h3>
            <p className="text-[11px] text-slate-500">
              Used only for manual settlements and refunds.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Account number</label>
              <input className={inputClass} value={accNo} onChange={(e) => setAccNo(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Account holder name</label>
              <input className={inputClass} value={accName} onChange={(e) => setAccName(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">IFSC</label>
              <input
                className={inputClass}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0000001"
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Bank</label>
              <input className={inputClass} value={bank} onChange={(e) => setBank(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Branch</label>
              <input className={inputClass} value={branch} onChange={(e) => setBranch(e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
            <p className="text-[11px] text-slate-500">Upload clear images or PDFs.</p>
          </div>

          <DocRow title="Aadhaar" required type="AADHAAR" kyc={kyc} setKyc={setKyc} readOnly={readOnly} />
          <DocRow title="PAN" required type="PAN" kyc={kyc} setKyc={setKyc} readOnly={readOnly} />
          <DocRow title="Cancelled cheque" required type="CHEQUE" kyc={kyc} setKyc={setKyc} readOnly={readOnly} />
          <DocRow title="GST certificate (optional)" type="GST_CERT" kyc={kyc} setKyc={setKyc} readOnly={readOnly} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!readOnly && (
            <>
              <button type="button" onClick={save} className={secondaryBtnClass} disabled={!isDirty || saving}>
                {saving ? "Saving…" : "Save draft"}
              </button>

              <button type="button" onClick={submit} disabled={submitting} className={primaryBtnClass}>
                {submitting ? "Submitting…" : "Submit for approval"}
              </button>
            </>
          )}

          {!readOnly && !isDirty && <span className="text-xs text-emerald-600">All changes saved.</span>}
          {!readOnly && isDirty && <span className="text-xs text-amber-600">You have unsaved changes.</span>}
        </div>
      </section>
    </>
  );
}