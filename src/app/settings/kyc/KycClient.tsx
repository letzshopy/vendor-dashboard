"use client";

import { useEffect, useMemo, useState } from "react";
import Upload from "../ui/Upload";

type KycState = {
  submittedAt?: string | null;  // used for the blue stripe
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
    aadhaar?: string;  // uploaded URL (existing file)
    pan?: string;
    gstCert?: string;
    cancelCheque?: string;
    vendorAgreement?: string;
  };
};

function ExistingBadge({ label, url }: { label: string; url?: string }) {
  if (!url) return null;
  const name = url.split("/").pop() || "file";
  return (
    <div className="flex items-center gap-2 text-xs text-gray-700 mt-1">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-600">
        <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
      </svg>
      <span className="font-medium">{label}:</span>
      <a href={url} target="_blank" className="underline">{name}</a>
    </div>
  );
}

export default function KycClient() {
  const [data, setData] = useState<KycState | null>(null);
  const [uploading, setUploading] = useState(false);

  // local picked files
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);

  const isIndividual = useMemo(() => data?.businessType === "individual", [data?.businessType]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings/kyc");
      const json = await res.json();
      setData(json);
    })();
  }, []);

  async function fileToUrl(file: File | null) {
    if (!file) return undefined;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/media/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    const { url } = await res.json();
    return url as string;
  }

  async function submit() {
    if (!data) return;
    setUploading(true);
    try {
      const merged: KycState = {
        ...data,
        docs: {
          aadhaar: (await fileToUrl(aadhaarFile)) ?? data.docs.aadhaar,
          pan: (await fileToUrl(panFile)) ?? data.docs.pan,
          gstCert: (await fileToUrl(gstFile)) ?? data.docs.gstCert,
          cancelCheque: (await fileToUrl(chequeFile)) ?? data.docs.cancelCheque,
          vendorAgreement: (await fileToUrl(agreementFile)) ?? data.docs.vendorAgreement,
        },
        submittedAt: new Date().toISOString(),  // IN REVIEW
      };

      await fetch("/api/settings/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });

      await fetch("/api/notify/kyc-submitted", { method: "POST" });

      setData(merged);
      setAadhaarFile(null);
      setPanFile(null);
      setGstFile(null);
      setChequeFile(null);
      setAgreementFile(null);
      alert("KYC submitted. We’ll review and approve shortly.");
    } catch (e: any) {
      alert(e.message ?? "Failed to submit");
    } finally {
      setUploading(false);
    }
  }

  async function lookupGSTIN() {
    if (!data?.gstin) return;
    const res = await fetch(`/api/lookup/gstin?gstin=${encodeURIComponent(data.gstin)}`);
    const js = await res.json();
    if (js?.ok) {
      setData({ ...data, legalName: js.legalName, tradeName: js.tradeName, state: js.state });
    } else {
      alert(js?.error ?? "GSTIN lookup failed");
    }
  }

  async function lookupIFSC() {
    if (!data?.bank.ifsc) return;
    const res = await fetch(`/api/lookup/ifsc?code=${encodeURIComponent(data.bank.ifsc)}`);
    const js = await res.json();
    if (js?.ok) {
      setData({ ...data, bank: { ...data.bank, bankName: js.bank, branch: js.branch } });
    } else {
      alert(js?.error ?? "IFSC lookup failed");
    }
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
              onChange={e => setData({ ...data, businessType: e.target.value as KycState["businessType"] })}
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
                onChange={e => setData({ ...data, gstin: e.target.value.toUpperCase() })}
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
              onChange={e => setData({ ...data, legalName: e.target.value })}
              disabled={isIndividual}
            />
          </div>
          <div>
            <label className="text-sm">Trade name</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.tradeName ?? ""}
              onChange={e => setData({ ...data, tradeName: e.target.value })}
              disabled={isIndividual}
            />
          </div>
          <div>
            <label className="text-sm">State</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.state ?? ""}
              onChange={e => setData({ ...data, state: e.target.value })}
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
              onChange={e => setData({ ...data, bank: { ...data.bank, accountNumber: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-sm">IFSC</label>
            <div className="mt-1 flex gap-2">
              <input
                className="w-full border rounded px-3 py-2 uppercase"
                placeholder="HDFC0000123"
                value={data.bank.ifsc ?? ""}
                onChange={e => setData({ ...data, bank: { ...data.bank, ifsc: e.target.value.toUpperCase() } })}
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
              onChange={e => setData({ ...data, bank: { ...data.bank, bankName: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-sm">Branch</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.bank.branch ?? ""}
              onChange={e => setData({ ...data, bank: { ...data.bank, branch: e.target.value } })}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">IFSC lookup fills Bank name and Branch. Account holder name can’t be auto-fetched — please enter it exactly as per bank records.</p>
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
            <ExistingBadge label="Existing" url={data.docs.aadhaar} />
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
            <ExistingBadge label="Existing" url={data.docs.pan} />
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
            <ExistingBadge label="Existing" url={data.docs.gstCert} />
          </div>

          <div>
            <Upload
              label="Cancelled cheque"
              buttonText="Upload file"
              accept="image/*,application/pdf"
              maxSizeMB={4}
              helper="PNG/JPG/PDF up to 4MB."
              value={chequeFile as any}
              onChange={setChequeFile}
            />
            <ExistingBadge label="Existing" url={data.docs.cancelCheque} />
          </div>

          <div className="md:col-span-2">
            <Upload
              label={<span>Signed vendor agreement <a className="underline text-blue-600" href="/vendor-blank-agreement.pdf" target="_blank">(download blank)</a></span> as any as unknown as string}
              buttonText="Upload file"
              accept="application/pdf,image/*"
              maxSizeMB={6}
              helper="PDF preferred; up to 6MB."
              value={agreementFile as any}
              onChange={setAgreementFile}
            />
            <ExistingBadge label="Existing" url={data.docs.vendorAgreement} />
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" required />
          <span>
            I agree to the <a className="underline" href="/terms" target="_blank">Terms & Conditions</a>
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
