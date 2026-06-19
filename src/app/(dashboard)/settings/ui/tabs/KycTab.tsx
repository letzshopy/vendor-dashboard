"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileBadge2,
  FileCheck2,
  Landmark,
  XCircle,
  Clock3,
  Save,
} from "lucide-react";

type KycFileType = "AADHAAR" | "PAN" | "CHEQUE" | "GST_CERT";

type KycFile = { type: KycFileType; key: string; name?: string };
type KycStatus = "not_started" | "in_review" | "approved" | "rejected";

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm " +
  "text-slate-900 placeholder:text-slate-400 shadow-sm transition " +
  "focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500";

const selectClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm " +
  "text-slate-900 shadow-sm transition focus:border-indigo-400 " +
  "focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500";

function downloadUrlForKey(fileKey: string) {
  return `/api/settings/kyc/download?fileKey=${encodeURIComponent(fileKey)}`;
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
      <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
        {loading ? "Uploading..." : label}
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={loading}
        />
      </label>
      {err && <div className="text-xs text-rose-600">{err}</div>}
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
  helper,
}: {
  title: string;
  required?: boolean;
  type: KycFileType;
  kyc: KycFile[];
  setKyc: (v: KycFile[]) => void;
  readOnly?: boolean;
  helper?: string;
}) {
  const current = useMemo(() => kyc.find((k) => k.type === type), [kyc, type]);

  const onUploaded = (key: string, name?: string) => {
    const others = kyc.filter((k) => k.type !== type);
    setKyc([...others, { type, key, name }]);
  };

  const clear = () => setKyc(kyc.filter((k) => k.type !== type));

  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">
            {title} {required && <span className="text-rose-500">*</span>}
          </div>

          {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}

          {current ? (
            <div className="mt-1 inline-flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {current.name || current.key || "Uploaded"}
              </span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-500">Not uploaded</div>
          )}

          {required && !current && (
            <div className="mt-1 text-[11px] text-rose-500">
              This document is required.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {current ? (
            <>
              <a
                href={downloadUrlForKey(current.key)}
                target="_blank"
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                rel="noreferrer"
              >
                View
              </a>

              {!readOnly && (
                <button
                  onClick={clear}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100"
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
    </div>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/40 px-4 py-4 md:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
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

  const [pan, setPan] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [gstRegistered, setGstRegistered] = useState<"yes" | "no">("no");
  const [gstin, setGstin] = useState("");

  const [accNo, setAccNo] = useState("");
  const [confirmAccNo, setConfirmAccNo] = useState("");
  const [accName, setAccName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bank, setBank] = useState("");
  const [branch, setBranch] = useState("");

  const [kyc, setKyc] = useState<KycFile[]>([]);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState("");

  const inReview = kycStatus === "in_review";
  const approved = kycStatus === "approved";
  const readOnly = inReview || approved;
  const showGST = gstRegistered === "yes";

  const getSnapshot = () =>
    JSON.stringify({
      pan,
      aadhaarNumber,
      gstRegistered,
      gstin,
      accNo,
      confirmAccNo,
      accName,
      ifsc,
      bank,
      branch,
      kyc,
      declarationAccepted,
      kycStatus,
    });

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return initialSnapshot !== getSnapshot();
  }, [
    initialSnapshot,
    pan,
    aadhaarNumber,
    gstRegistered,
    gstin,
    accNo,
    confirmAccNo,
    accName,
    ifsc,
    bank,
    branch,
    kyc,
    declarationAccepted,
    kycStatus,
  ]);

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
      if (data?.docs?.aadhaarKey)
        files.push({
          type: "AADHAAR",
          key: data.docs.aadhaarKey,
          name: data.docs.aadhaarName,
        });
      if (data?.docs?.panKey)
        files.push({
          type: "PAN",
          key: data.docs.panKey,
          name: data.docs.panName,
        });
      if (data?.docs?.cancelledChequeKey)
        files.push({
          type: "CHEQUE",
          key: data.docs.cancelledChequeKey,
          name: data.docs.cancelledChequeName,
        });
      if (data?.docs?.gstCertKey)
        files.push({
          type: "GST_CERT",
          key: data.docs.gstCertKey,
          name: data.docs.gstCertName,
        });

      const nextKycStatus = (data?.kycStatus || "not_started") as KycStatus;
      const nextPan = data?.pan || "";
      const nextAadhaar = data?.aadhaarNumber || data?.aadhaar || "";
      const nextGstin = data?.gstin || "";
      const nextGstRegistered: "yes" | "no" =
        data?.gstRegistered === true || data?.gstRegistered === "yes" || nextGstin
          ? "yes"
          : "no";
      const nextAccNo = data?.bank?.accountNumber || "";
      const nextConfirmAccNo = data?.bank?.confirmAccountNumber || data?.bank?.accountNumber || "";
      const nextAccName = data?.bank?.accountHolderName || "";
      const nextIfsc = data?.bank?.ifsc || "";
      const nextBank = data?.bank?.bankName || "";
      const nextBranch = data?.bank?.branch || "";
      const nextDeclaration = !!data?.declarationAccepted;

      setKycStatus(nextKycStatus);
      setSubmittedAt(data?.submittedAt || null);
      setPan(nextPan);
      setAadhaarNumber(nextAadhaar);
      setGstRegistered(nextGstRegistered);
      setGstin(nextGstin);
      setAccNo(nextAccNo);
      setConfirmAccNo(nextConfirmAccNo);
      setAccName(nextAccName);
      setIfsc(nextIfsc);
      setBank(nextBank);
      setBranch(nextBranch);
      setDeclarationAccepted(nextDeclaration);
      setKyc(files);

      const snap = JSON.stringify({
        pan: nextPan,
        aadhaarNumber: nextAadhaar,
        gstRegistered: nextGstRegistered,
        gstin: nextGstin,
        accNo: nextAccNo,
        confirmAccNo: nextConfirmAccNo,
        accName: nextAccName,
        ifsc: nextIfsc,
        bank: nextBank,
        branch: nextBranch,
        kyc: files,
        declarationAccepted: nextDeclaration,
        kycStatus: nextKycStatus,
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
      pan,
      aadhaarNumber,
      gstRegistered: showGST,
      gstin: showGST ? gstin : "",
      bank: {
        accountNumber: accNo,
        confirmAccountNumber: confirmAccNo,
        accountHolderName: accName,
        ifsc,
        bankName: bank,
        branch,
      },
      docs: buildDocsPayload(),
      declarationAccepted,
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

    if (!aadhaarNumber.trim()) {
      return alert("Please enter Aadhaar / ID number.");
    }

    if (showGST) {
      if (!gstin.trim()) return alert("Please enter GST number.");
      if (!/^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$/.test(gstin.toUpperCase().trim())) {
        return alert("GSTIN format looks invalid.");
      }
    }

    if (!accNo || !confirmAccNo || !accName || !bank) {
      return alert("Please enter complete bank account details.");
    }

    if (accNo !== confirmAccNo) {
      return alert("Account number and confirm account number do not match.");
    }

    if (!/^[A-Z]{4}0[0-9A-Z]{6}$/.test(ifsc.toUpperCase().trim())) {
      return alert("Invalid IFSC code.");
    }

    if (!has("AADHAAR") || !has("PAN") || !has("CHEQUE")) {
      return alert("Please upload Aadhaar / ID proof, PAN card, and cancelled cheque leaf.");
    }

    if (!declarationAccepted) {
      return alert("Please accept the KYC declaration before submitting.");
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

  const statusConfig = {
    not_started: {
      label: "Not started",
      chip: "bg-slate-100 text-slate-700",
      icon: <Clock3 className="h-4 w-4" />,
      note: "",
      noteClass: "",
    },
    in_review: {
      label: "In review",
      chip: "bg-indigo-100 text-indigo-700",
      icon: <Clock3 className="h-4 w-4" />,
      note: "KYC review is in progress. Business modules stay locked until approval.",
      noteClass: "border-indigo-200 bg-indigo-50 text-indigo-900",
    },
    approved: {
      label: "Approved",
      chip: "bg-emerald-100 text-emerald-700",
      icon: <CheckCircle2 className="h-4 w-4" />,
      note: "Your KYC has been approved.",
      noteClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    rejected: {
      label: "Rejected",
      chip: "bg-rose-100 text-rose-700",
      icon: <XCircle className="h-4 w-4" />,
      note: "Your KYC was rejected. Please update details and submit again.",
      noteClass: "border-rose-200 bg-rose-50 text-rose-900",
    },
  }[kycStatus];

  if (loading) {
    return (
      <div className="p-4 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading KYC...
        </div>
      </div>
    );
  }

  return (
    <>
      {banner && (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            {banner === "saved"
              ? "KYC draft saved successfully"
              : "KYC submitted for review"}
          </div>
        </div>
      )}

      <div className="space-y-4 p-3 md:space-y-5 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BadgeCheck className="h-5 w-5" />
              </div>

              <div>
                <div className="text-base font-semibold text-slate-900">
                  KYC verification
                </div>
                <div className="mt-1 text-xs text-slate-500 md:text-sm">
                  Upload identity documents and bank details for verification.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${statusConfig.chip}`}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </span>

              {submittedAt ? (
                <span className="text-xs text-slate-500">
                  Submitted: {new Date(submittedAt).toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>

          {statusConfig.note ? (
            <div
              className={`mt-4 rounded-[18px] border px-4 py-3 text-sm ${statusConfig.noteClass}`}
            >
              {statusConfig.note}
            </div>
          ) : null}

          {error && (
            <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <SectionCard
          icon={<Building2 className="h-5 w-5" />}
          title="Identity details"
          description="PAN, Aadhaar/ID and optional GST details used only for verification."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="PAN number *">
              <input
                className={inputClass}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                disabled={readOnly}
              />
            </Field>

            <Field label="Aadhaar / ID number *">
              <input
                className={inputClass}
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                placeholder="Enter Aadhaar or valid ID proof number"
                disabled={readOnly}
              />
            </Field>

            <Field label="GST registered? *">
              <select
                className={selectClass}
                value={gstRegistered}
                onChange={(e) => setGstRegistered(e.target.value as "yes" | "no")}
                disabled={readOnly}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </Field>

            {showGST && (
              <Field label="GST number *">
                <input
                  className={inputClass}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  disabled={readOnly}
                />
              </Field>
            )}
          </div>
        </SectionCard>

        <SectionCard
          icon={<Landmark className="h-5 w-5" />}
          title="Bank details"
          description="Used only for settlements, refunds and verification."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Account holder name *">
              <input
                className={inputClass}
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Bank name *">
              <input
                className={inputClass}
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Account number *">
              <input
                className={inputClass}
                value={accNo}
                onChange={(e) => setAccNo(e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Confirm account number *">
              <input
                className={inputClass}
                value={confirmAccNo}
                onChange={(e) => setConfirmAccNo(e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="IFSC code *">
              <input
                className={inputClass}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0000001"
                disabled={readOnly}
              />
            </Field>

            <Field label="Branch name">
              <input
                className={inputClass}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={readOnly}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<FileBadge2 className="h-5 w-5" />}
          title="Documents"
          description="Upload clear JPG, PNG or PDF copies. Mandatory documents are marked with *."
        >
          <DocRow
            title="PAN card upload"
            required
            type="PAN"
            kyc={kyc}
            setKyc={setKyc}
            readOnly={readOnly}
          />
          <DocRow
            title="Aadhaar / ID proof upload"
            required
            type="AADHAAR"
            kyc={kyc}
            setKyc={setKyc}
            readOnly={readOnly}
          />
          {showGST && (
            <DocRow
              title="GST certificate upload"
              helper="Optional, but recommended if GST registered."
              type="GST_CERT"
              kyc={kyc}
              setKyc={setKyc}
              readOnly={readOnly}
            />
          )}
          <DocRow
            title="Cancelled cheque leaf upload"
            required
            helper="Upload cancelled cheque leaf for bank verification."
            type="CHEQUE"
            kyc={kyc}
            setKyc={setKyc}
            readOnly={readOnly}
          />
        </SectionCard>

        {!readOnly && (
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={declarationAccepted}
                onChange={(e) => setDeclarationAccepted(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  KYC declaration <span className="text-rose-500">*</span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500 md:text-sm">
                  I confirm that the submitted KYC documents and bank details are valid and belong to my business.
                </span>
              </span>
            </label>
          </div>
        )}

        {!readOnly && (
          <div className="sticky bottom-3 z-10 md:bottom-4">
            <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {isDirty ? "Unsaved changes" : "All changes saved"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Save draft before submitting for approval.
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={save}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                    disabled={!isDirty || saving}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save draft"}
                  </button>

                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit for approval"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {readOnly && (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
            {approved
              ? "KYC is approved. Editing is locked."
              : "KYC is currently under review. Editing is locked until review is completed."}
          </div>
        )}
      </div>
    </>
  );
}
