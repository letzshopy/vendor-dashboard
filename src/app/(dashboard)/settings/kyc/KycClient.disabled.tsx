// src/app/(dashboard)/settings/kyc/KycClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Upload from "../ui/Upload";

type KycState = {
  submittedAt?: string | null;
  notes?: string;

  businessType: "individual" | "proprietorship" | "partnership" | "private_ltd";
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  state?: string;

  bank: {
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    branch?: string;
  };

  docs: {
    aadhaarKey?: string;
    panKey?: string;
    gstCertKey?: string;
    cancelledChequeKey?: string;
  };
};

function ExistingBadge({ label, fileKey }: { label: string; fileKey?: string }) {
  if (!fileKey) return null;
  const href = `/api/settings/kyc/download?fileKey=${encodeURIComponent(fileKey)}`;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-700 mt-1">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-600">
        <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
      </svg>
      <span className="font-medium">{label}:</span>
      <a href={href} target="_blank" rel="noreferrer" className="underline">
        {fileKey}
      </a>
    </div>
  );
}

export default function KycClient() {
  const [data, setData] = useState<KycState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [agree, setAgree] = useState(false);

  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [chequeFile, setChequeFile] = useState<File | null>(null);

  const isIndividual = useMemo(() => data?.businessType === "individual", [data?.businessType]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings/kyc", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    })();
  }, []);

  async function fileToKey(file: File | null, doc_type: string) {
    if (!file) return undefined;

    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("doc_type", doc_type);

    const res = await fetch("/api/settings/kyc/upload", { method: "POST", body: fd });
    const js = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(js?.error || `KYC upload failed (${res.status})`);
    }

    const fileKey = js?.fileKey || js?.key;
    if (!fileKey) throw new Error("Upload ok but fileKey missing");

    return String(fileKey);
  }

  async function submit() {
    if (!data) return;

    // ✅ enforce terms checkbox (since we are not using <form>)
    if (!agree) {
      alert("Please accept Terms & Conditions to continue.");
      return;
    }

    setUploading(true);

    try {
      const merged: KycState = {
        ...data,
        docs: {
          aadhaarKey: (await fileToKey(aadhaarFile, "aadhaar")) ?? data.docs.aadhaarKey,
          panKey: (await fileToKey(panFile, "pan")) ?? data.docs.panKey,
          gstCertKey: (await fileToKey(gstFile, "gst")) ?? data.docs.gstCertKey,
          cancelledChequeKey: (await fileToKey(chequeFile, "cheque")) ?? data.docs.cancelledChequeKey,
        },
        submittedAt: new Date().toISOString(),
      };

      // save KYC data
      await fetch("/api/settings/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });

      // ✅ mark KYC in_review + onboarding flag (server-side)
      await fetch("/api/settings/kyc/submit", { method: "POST" });

      // notify (optional)
      await fetch("/api/notify/kyc-submitted", { method: "POST" }).catch(() => {});

      setData(merged);
      setAadhaarFile(null);
      setPanFile(null);
      setGstFile(null);
      setChequeFile(null);

      alert("KYC submitted. We’ll review and approve shortly.");
    } catch (e: any) {
      alert(e?.message ?? "Failed to submit");
    } finally {
      setUploading(false);
    }
  }

  async function lookupGSTIN() {
    if (!data?.gstin) return;
    const res = await fetch(`/api/lookup/gstin?gstin=${encodeURIComponent(data.gstin)}`);
    const js = await res.json();
    if (js?.ok) setData({ ...data, legalName: js.legalName, tradeName: js.tradeName, state: js.state });
    else alert(js?.error ?? "GSTIN lookup failed");
  }

  async function lookupIFSC() {
    if (!data?.bank.ifsc) return;
    const res = await fetch(`/api/lookup/ifsc?code=${encodeURIComponent(data.bank.ifsc)}`);
    const js = await res.json();
    if (js?.ok) setData({ ...data, bank: { ...data.bank, bankName: js.bank, branch: js.branch } });
    else alert(js?.error ?? "IFSC lookup failed");
  }

  if (!data) return <div className="text-sm text-gray-600">Loading…</div>;

  return (
    <div className="space-y-8">
      {data.submittedAt && (
        <div className="px-3 py-2 rounded bg-blue-50 border text-blue-800 text-sm">
          KYC submitted — <b>in review</b>. Once approved, you can start using our services.
        </div>
      )}

      {/* Business type + GST */}
      <section className="p-4 border rounded-lg bg-white space-y-4">
        <h3 className="font-semibold">Business details</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Business type</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.businessType}
              onChange={(e) => setData({ ...data, businessType: e.target.value as KycState["businessType"] })}
            >
              <option value="individual">Individual</option>
              <option value="proprietorship">Sole Proprietorship</option>
              <option value="partnership">Partnership / LLP</option>
              <option value="private_ltd">Private Ltd / Company</option>
            </select>
          </div>

          <div className={`${isIndividual ? "opacity-50 pointer-events-none" : ""}`}>
            <label className="text-sm">GSTIN</label>
            <div className="mt-1 flex gap-2">
              <input
                className="w-full border rounded px-3 py-2 uppercase"
                placeholder="27ABCDE1234F1Z5"
                value={data.gstin ?? ""}
                onChange={(e) => setData({ ...data, gstin: e.target.value.toUpperCase() })}
              />
              <button type="button" onClick={lookupGSTIN} className="px-3 py-2 border rounded bg-white hover:bg-gray-50 text-sm">
                Lookup
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">If you’re Individual (unregistered), GST fields stay disabled.</p>
          </div>
          <div />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Legal name</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.legalName ?? ""}
              onChange={(e) => setData({ ...data, legalName: e.target.value })}
              disabled={isIndividual}
            />
          </div>
          <div>
            <label className="text-sm">Trade name</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.tradeName ?? ""}
              onChange={(e) => setData({ ...data, tradeName: e.target.value })}
              disabled={isIndividual}
            />
          </div>
          <div>
            <label className="text-sm">State</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.state ?? ""}
              onChange={(e) => setData({ ...data, state: e.target.value })}
              disabled={isIndividual}
            />
          </div>
        </div>
      </section>

      {/* Bank */}
      <section className="p-4 border rounded-lg bg-white space-y-4">
        <h3 className="font-semibold">Bank details</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm">Account number</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.bank.accountNumber ?? ""}
              onChange={(e) => setData({ ...data, bank: { ...data.bank, accountNumber: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-sm">IFSC</label>
            <div className="mt-1 flex gap-2">
              <input
                className="w-full border rounded px-3 py-2 uppercase"
                placeholder="HDFC0000123"
                value={data.bank.ifsc ?? ""}
                onChange={(e) => setData({ ...data, bank: { ...data.bank, ifsc: e.target.value.toUpperCase() } })}
              />
              <button type="button" onClick={lookupIFSC} className="px-3 py-2 border rounded bg-white hover:bg-gray-50 text-sm">
                Lookup
              </button>
            </div>
          </div>
          <div />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Bank name</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.bank.bankName ?? ""}
              onChange={(e) => setData({ ...data, bank: { ...data.bank, bankName: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-sm">Branch</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.bank.branch ?? ""}
              onChange={(e) => setData({ ...data, bank: { ...data.bank, branch: e.target.value } })}
            />
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="p-4 border rounded-lg bg-white space-y-6">
        <h3 className="font-semibold">Documents</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Upload
              label="Aadhaar *"
              buttonText="Upload file"
              accept="image/*,application/pdf"
              maxSizeMB={4}
              helper="PNG/JPG/PDF up to 4MB."
              value={aadhaarFile as any}
              onChange={setAadhaarFile}
            />
            <ExistingBadge label="Existing" fileKey={data.docs.aadhaarKey} />
          </div>

          <div>
            <Upload
              label="PAN *"
              buttonText="Upload file"
              accept="image/*,application/pdf"
              maxSizeMB={4}
              helper="PNG/JPG/PDF up to 4MB."
              value={panFile as any}
              onChange={setPanFile}
            />
            <ExistingBadge label="Existing" fileKey={data.docs.panKey} />
          </div>

          <div>
            <Upload
              label="GST Certificate (if GST registered)"
              buttonText="Upload file"
              accept="image/*,application/pdf"
              maxSizeMB={4}
              helper="PNG/JPG/PDF up to 4MB."
              value={gstFile as any}
              onChange={setGstFile}
            />
            <ExistingBadge label="Existing" fileKey={data.docs.gstCertKey} />
          </div>

          <div>
            <Upload
              label="Cancelled cheque *"
              buttonText="Upload file"
              accept="image/*,application/pdf"
              maxSizeMB={4}
              helper="PNG/JPG/PDF up to 4MB."
              value={chequeFile as any}
              onChange={setChequeFile}
            />
            <ExistingBadge label="Existing" fileKey={data.docs.cancelledChequeKey} />
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            I agree to the{" "}
            <a className="underline" href="/terms" target="_blank" rel="noreferrer">
              Terms & Conditions
            </a>
          </span>
        </label>
      </section>

      <div className="flex gap-3">
        <button
          onClick={() => submit()}
          disabled={uploading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {uploading ? "Submitting…" : "Submit for approval"}
        </button>
      </div>
    </div>
  );
}