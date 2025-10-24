"use client";

import { useEffect, useMemo, useState } from "react";
import DocumentUploader from "@/components/DocumentUploader";

type BizType = "INDIVIDUAL" | "PROPRIETORSHIP" | "LLP" | "PVT_LTD" | "PUBLIC_LTD" | "OPC";
type KycFileType = "AADHAAR" | "PAN" | "CHEQUE" | "AGREEMENT" | "GST_CERT";

type KycFile = { type: KycFileType; url: string; name?: string };

const STORAGE = "ls_profile_v1";

/* ---- Stub lookups (replace with real APIs later) ---- */

// Super-lite GST “lookup”
async function lookupGST(gstin: string): Promise<{
  legalName: string;
  tradeName: string;
  state: string;
} | null> {
  const clean = (gstin || "").toUpperCase().trim();
  // naive format check
  if (!/^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$/.test(clean)) return null;

  // TODO: call your real GST lookup API here
  // For now, stub with the last 4 as a seed
  const seed = clean.slice(-4);
  return {
    legalName: `Legal Name ${seed}`,
    tradeName: `Trade Name ${seed}`,
    state: "Telangana",
  };
}

// IFSC lookup (stub)
async function lookupIFSC(ifsc: string): Promise<{ bank: string; branch: string } | null> {
  const clean = (ifsc || "").toUpperCase().trim();
  if (!/^[A-Z]{4}0[0-9A-Z]{6}$/.test(clean)) return null;

  // TODO: wire to Razorpay IFSC / RBI / your service
  if (clean.startsWith("HDFC")) return { bank: "HDFC Bank", branch: "Chennai - Adyar" };
  if (clean.startsWith("ICIC")) return { bank: "ICICI Bank", branch: "Hyderabad - Jubilee Hills" };
  return { bank: "Sample Bank", branch: "Main Branch" };
}

/* ---------------- UI ---------------- */

function DocRow({
  title,
  required = false,
  type,
  kyc,
  setKyc,
  extraRight,
}: {
  title: string;
  required?: boolean;
  type: KycFileType;
  kyc: KycFile[];
  setKyc: (v: KycFile[]) => void;
  extraRight?: React.ReactNode;
}) {
  const current = useMemo(() => kyc.find((k) => k.type === type), [kyc, type]);

  const onUploaded = (url: string, name?: string) => {
    const others = kyc.filter((k) => k.type !== type);
    setKyc([...others, { type, url, name }]);
  };
  const clear = () => setKyc(kyc.filter((k) => k.type !== type));

  return (
    <div className="flex items-center justify-between border rounded-lg p-3 mb-2">
      <div>
        <div className="text-sm font-medium">
          {title} {required && <span className="text-red-500">*</span>}
        </div>
        {current ? (
          <div className="text-xs text-green-700 inline-flex items-center gap-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
            </svg>
            {current.name || current.url}
          </div>
        ) : (
          <div className="text-xs text-slate-500">Not uploaded</div>
        )}
        {required && !current && (
          <div className="text-[11px] text-red-500 mt-1">This document is required.</div>
        )}
        {type === "AGREEMENT" && (
          <div className="text-xs mt-1">
            <a
              className="text-blue-600 underline"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("Blank agreement download will be linked here.");
              }}
            >
              Download blank agreement
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {extraRight}
        {current ? (
          <>
            <a href={current.url} target="_blank" className="text-xs text-blue-600 underline">
              View
            </a>
            <button onClick={clear} className="text-xs rounded border px-2 py-1 hover:bg-gray-50">
              Remove
            </button>
          </>
        ) : (
          <DocumentUploader onUploaded={onUploaded} />
        )}
      </div>
    </div>
  );
}

export default function KycTab() {
  const [inReview, setInReview] = useState(false);

  // Business section
  const [bizType, setBizType] = useState<BizType>("INDIVIDUAL");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [gstLegal, setGstLegal] = useState("");
  const [gstTrade, setGstTrade] = useState("");
  const [gstState, setGstState] = useState("");

  // Bank section
  const [accNo, setAccNo] = useState("");
  const [accName, setAccName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bank, setBank] = useState("");
  const [branch, setBranch] = useState("");

  // Documents
  const [kyc, setKyc] = useState<KycFile[]>([]);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const v = JSON.parse(raw);
        setInReview(!!v.kyc_in_review);
        setKyc(v.kyc || []);
        setAgree(v.agree ?? false);

        // restore form if saved earlier
        if (v.kyc_form) {
          const f = v.kyc_form;
          setBizType(f.bizType || "INDIVIDUAL");
          setPan(f.pan || "");
          setGstin(f.gstin || "");
          setGstLegal(f.gstLegal || "");
          setGstTrade(f.gstTrade || "");
          setGstState(f.gstState || "");
          setAccNo(f.accNo || "");
          setAccName(f.accName || "");
          setIfsc(f.ifsc || "");
          setBank(f.bank || "");
          setBranch(f.branch || "");
        }
      }
    } catch {}
  }, []);

  const showGST = bizType !== "INDIVIDUAL";

  const save = () => {
    const raw = (() => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE) || "{}");
      } catch {
        return {};
      }
    })();

    const kyc_form = {
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
    };

    localStorage.setItem(
      STORAGE,
      JSON.stringify({ ...raw, kyc_form, kyc, agree, kyc_in_review: inReview })
    );
    alert("Saved.");
  };

  const submit = () => {
    // validations
    const has = (t: KycFileType) => kyc.some((k) => k.type === t);

    const panOk = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase().trim());
    if (!panOk) return alert("Please enter a valid PAN (e.g., ABCDE1234F).");

    if (showGST && gstin && !/^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$/.test(gstin.toUpperCase().trim())) {
      return alert("GSTIN format looks invalid.");
    }

    if (!accNo || !accName) return alert("Please enter bank account number and account holder name.");
    if (!/^[A-Z]{4}0[0-9A-Z]{6}$/.test(ifsc.toUpperCase().trim())) return alert("Invalid IFSC code.");

    if (!has("AADHAAR") || !has("PAN") || !has("CHEQUE") || !has("AGREEMENT")) {
      return alert("Please upload Aadhaar, PAN, Cancelled Cheque, and Signed Agreement.");
    }
    if (!agree) return alert("Please agree to the Vendor Agreement.");

    setInReview(true);
    const raw = (() => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE) || "{}");
      } catch {
        return {};
      }
    })();
    const kyc_form = {
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
    };
    localStorage.setItem(
      STORAGE,
      JSON.stringify({ ...raw, kyc_form, kyc, agree, kyc_in_review: true })
    );
    alert("KYC submitted for review.");
  };

  const doGSTLookup = async () => {
    const info = await lookupGST(gstin);
    if (!info) return alert("Unable to fetch GST details. Check GSTIN.");
    setGstLegal(info.legalName);
    setGstTrade(info.tradeName);
    setGstState(info.state);
  };

  const doIFSCLookup = async () => {
    const info = await lookupIFSC(ifsc);
    if (!info) return alert("IFSC not found.");
    setBank(info.bank);
    setBranch(info.branch);
  };

  return (
    <section className="space-y-6 max-w-3xl">
      {inReview && (
        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          KYC review in progress. Once approved, you can start using all services.
        </div>
      )}

      {/* Business Type & PAN / GST */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Business details</div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Business type</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={bizType}
              onChange={(e) => setBizType(e.target.value as BizType)}
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
            <label className="block text-sm mb-1">PAN *</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
            />
          </div>
        </div>

        {showGST && (
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">GSTIN</label>
              <div className="flex gap-2">
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                />
                <button type="button" onClick={doGSTLookup} className="border rounded px-3 text-sm">
                  Lookup
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Legal name</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={gstLegal}
                onChange={(e) => setGstLegal(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Trade name</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={gstTrade}
                onChange={(e) => setGstTrade(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Registered state</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={gstState}
                onChange={(e) => setGstState(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bank */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Bank details</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Account number</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={accNo}
              onChange={(e) => setAccNo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Account holder name</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">IFSC</label>
            <div className="flex gap-2">
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0000001"
              />
              <button type="button" onClick={doIFSCLookup} className="border rounded px-3 text-sm">
                Lookup
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Bank</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Branch</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Documents</div>
        <p className="text-xs text-slate-500 mb-3">
          Upload images or PDF. Max ~1–2MB recommended.
        </p>

        <DocRow title="Aadhaar" required type="AADHAAR" kyc={kyc} setKyc={setKyc} />
        <DocRow title="PAN" required type="PAN" kyc={kyc} setKyc={setKyc} />
        <DocRow title="Cancelled cheque" required type="CHEQUE" kyc={kyc} setKyc={setKyc} />
        <DocRow
          title="Signed vendor agreement (PDF)"
          required
          type="AGREEMENT"
          kyc={kyc}
          setKyc={setKyc}
        />
        <DocRow title="GST certificate (optional)" type="GST_CERT" kyc={kyc} setKyc={setKyc} />
      </div>

      {/* Agreement + actions */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-2">Vendor Agreement</div>
        <div className="border rounded-lg p-3 max-h-48 overflow-auto text-xs leading-5 text-slate-700 bg-slate-50">
          <p>
            <b>Summary:</b> By onboarding to LetzShopy, you agree to list permitted items,
            fulfill orders promptly, keep accurate inventory and pricing, honor returns per policy,
            and comply with laws (GST, invoicing, consumer protection).
          </p>
          <p className="mt-2">
            Full Agreement (sample). We’ll link the final PDF/HTML here.
          </p>
        </div>
        <label className="text-sm flex items-center gap-2 mt-3">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          I have read and agree to the Vendor Agreement.
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={save} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
          Save
        </button>
        <button
          onClick={submit}
          disabled={inReview}
          className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-60"
        >
          {inReview ? "Submitted" : "Submit for approval"}
        </button>
      </div>
    </section>
  );
}
