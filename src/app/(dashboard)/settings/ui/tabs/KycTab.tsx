"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import DocumentUploader from "@/components/DocumentUploader";

type BizType =
  | "INDIVIDUAL"
  | "PROPRIETORSHIP"
  | "LLP"
  | "PVT_LTD"
  | "PUBLIC_LTD"
  | "OPC";

type KycFileType = "AADHAAR" | "PAN" | "CHEQUE" | "AGREEMENT" | "GST_CERT";

type KycFile = { type: KycFileType; url: string; name?: string };

const KYC_STORAGE = "ls_profile_v1";
const PROFILE_STORAGE = "letz_profile_settings";

/* ---------- Small helpers ---------- */

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
  "text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50";

const bizTypeLabel: Record<BizType, string> = {
  INDIVIDUAL: "Individual",
  PROPRIETORSHIP: "Proprietorship",
  LLP: "LLP",
  PVT_LTD: "Private Limited",
  PUBLIC_LTD: "Public Limited",
  OPC: "OPC",
};

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
  const current = useMemo(
    () => kyc.find((k) => k.type === type),
    [kyc, type]
  );

  const onUploaded = (url: string, name?: string) => {
    const others = kyc.filter((k) => k.type !== type);
    setKyc([...others, { type, url, name }]);
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0"
            >
              <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
            </svg>
            <span className="truncate">
              {current.name || current.url || "Uploaded"}
            </span>
          </div>
        ) : (
          <div className="mt-0.5 text-xs text-slate-500">Not uploaded</div>
        )}
        {required && !current && (
          <div className="mt-1 text-[11px] text-red-500">
            This document is required.
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 whitespace-nowrap">
        {extraRight}
        {current ? (
          <>
            <a
              href={current.url}
              target="_blank"
              className="text-xs text-indigo-600 underline"
            >
              View
            </a>
            <button
              onClick={clear}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
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

/* ---------------- MAIN TAB ---------------- */

export default function KycTab() {
  const [inReview, setInReview] = useState(false);
  const [banner, setBanner] = useState<null | "saved" | "submitted">(null);

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

  // Profile business name from Profile tab
  const [profileBizName, setProfileBizName] = useState("");

  // snapshot for unsaved changes
  const snapshotRef = useRef<string | null>(null);

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
      agree,
      inReview,
    });

  // Load from localStorage (KYC + Profile)
  useEffect(() => {
    try {
      // KYC data
      const raw = localStorage.getItem(KYC_STORAGE);
      if (raw) {
        const v = JSON.parse(raw);
        setInReview(!!v.kyc_in_review);
        setKyc(v.kyc || []);
        setAgree(v.agree ?? false);

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

      // Profile business name
      const rawProfile = localStorage.getItem(PROFILE_STORAGE);
      if (rawProfile) {
        const p = JSON.parse(rawProfile);
        const nameFromProfile =
          p?.business?.name || p?.personal?.name || p?.social?.tradeName || "";
        setProfileBizName(nameFromProfile || "");
      }
    } catch {
      // ignore parsing errors
    }
  }, []);

  // Initialize snapshot once after initial data is hydrated
  useEffect(() => {
    if (snapshotRef.current === null) {
      snapshotRef.current = getSnapshot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
    agree,
    inReview,
  ]);

  const isDirty = useMemo(() => {
    if (!snapshotRef.current) return false;
    return snapshotRef.current !== getSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
    agree,
    inReview,
  ]);

  // Unsaved changes: browser refresh / close
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    if (isDirty) {
      window.addEventListener("beforeunload", onBeforeUnload);
    }
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Unsaved changes: browser back button
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (!isDirty) return;
      const leave = window.confirm(
        "You have unsaved KYC changes. Leave this page without saving?"
      );
      if (!leave) {
        e.preventDefault();
        window.history.go(1);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty]);

  const persistToStorage = (flagInReview: boolean) => {
    const raw = (() => {
      try {
        return JSON.parse(localStorage.getItem(KYC_STORAGE) || "{}");
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
      KYC_STORAGE,
      JSON.stringify({
        ...raw,
        kyc_form,
        kyc,
        agree,
        kyc_in_review: flagInReview,
      })
    );
    snapshotRef.current = getSnapshot();
  };

  const triggerBanner = (kind: "saved" | "submitted") => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setBanner(kind);
    setTimeout(() => setBanner(null), 2600);
  };

  const save = () => {
    persistToStorage(inReview);
    triggerBanner("saved");
  };

  const submit = () => {
    const has = (t: KycFileType) => kyc.some((k) => k.type === t);

    const panOk = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase().trim());
    if (!panOk) {
      alert("Please enter a valid PAN (e.g., ABCDE1234F).");
      return;
    }

    if (
      showGST &&
      gstin &&
      !/^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$/.test(gstin.toUpperCase().trim())
    ) {
      alert("GSTIN format looks invalid.");
      return;
    }

    if (!accNo || !accName) {
      alert("Please enter bank account number and account holder name.");
      return;
    }

    if (!/^[A-Z]{4}0[0-9A-Z]{6}$/.test(ifsc.toUpperCase().trim())) {
      alert("Invalid IFSC code.");
      return;
    }

    if (!has("AADHAAR") || !has("PAN") || !has("CHEQUE") || !has("AGREEMENT")) {
      alert(
        "Please upload Aadhaar, PAN, Cancelled Cheque, and Signed Agreement."
      );
      return;
    }

    if (!agree) {
      alert("Please agree to the Vendor Agreement.");
      return;
    }

    setInReview(true);
    persistToStorage(true);
    triggerBanner("submitted");
  };

  // Generate pre-filled vendor agreement as a downloadable PDF (text-based)
  const generateAgreement = () => {
    // Always save latest snapshot first
    persistToStorage(inReview);

    // Read KYC from storage to be 100% in sync with saved draft
    let savedBizType: BizType = bizType;
    let savedPan = pan;
    let savedGstin = gstin;
    let savedBank = bank;
    let savedBranch = branch;
    let savedAccNo = accNo;
    let savedIfsc = ifsc;

    try {
      const raw = localStorage.getItem(KYC_STORAGE);
      if (raw) {
        const v = JSON.parse(raw);
        const f = v.kyc_form || {};
        savedBizType = (f.bizType as BizType) || savedBizType;
        savedPan = f.pan || savedPan;
        savedGstin = f.gstin || savedGstin;
        savedBank = f.bank || savedBank;
        savedBranch = f.branch || savedBranch;
        savedAccNo = f.accNo || savedAccNo;
        savedIfsc = f.ifsc || savedIfsc;
      }
    } catch {
      // ignore
    }

    // Business / Trade Name from Profile
    let savedBizName = profileBizName;
    try {
      const rawProfile = localStorage.getItem(PROFILE_STORAGE);
      if (rawProfile) {
        const p = JSON.parse(rawProfile);
        const nameFromProfile =
          p?.business?.name || p?.personal?.name || p?.social?.tradeName || "";
        if (nameFromProfile) savedBizName = nameFromProfile;
      }
    } catch {
      // ignore
    }

    // Fallback if still empty
    if (!savedBizName) {
      savedBizName = gstTrade || gstLegal || "Vendor";
    }

    if (!savedPan) {
      alert(
        "Please fill and save PAN and other KYC details before downloading the agreement."
      );
      return;
    }

    const today = new Date().toLocaleDateString("en-IN");

    const displayBizType = bizTypeLabel[savedBizType] || "Vendor";
    const displayGstin =
      savedBizType === "INDIVIDUAL"
        ? "Nil"
        : savedGstin || "Not provided (Vendor to ensure GST compliance)";

    const doc = new jsPDF({
      orientation: "p",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;
    const marginTop = 50;
    const marginBottom = 50;
    const maxWidth = pageWidth - marginX * 2;
    const lineHeight = 14;

    let cursorY = marginTop;

    const addLine = (text = "", bold = false) => {
      if (cursorY > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }
      if (bold) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }
      const lines = doc.splitTextToSize(text, maxWidth) as string[];
lines.forEach((line: string) => {
  if (cursorY > pageHeight - marginBottom) {
    doc.addPage();
    cursorY = marginTop;
  }
  doc.text(line, marginX, cursorY);
  cursorY += lineHeight;
});
      cursorY += 4; // small extra spacing between blocks
    };

    // Title
    doc.setFontSize(16);
    addLine("LetzShopy Vendor Agreement", true);

    doc.setFontSize(11);
    addLine(`Date: ${today}`);

    // Vendor Details
    addLine("Vendor Details", true);
    addLine(`Business / Trade Name: ${savedBizName}`);
    addLine(`Business Type: ${displayBizType}`);
    addLine(`PAN: ${savedPan}`);
    addLine(`GSTIN: ${displayGstin}`);
    addLine(`Bank: ${savedBank}`);
    addLine(`Branch: ${savedBranch}`);
    addLine(`Account No.: ${savedAccNo}`);
    addLine(`IFSC: ${savedIfsc}`);

    // 1. Parties & Scope
    addLine("1. Parties & Scope", true);
    addLine(
      `This Agreement is between "${savedBizName}" ("Vendor") and "LetzShopy" ("Platform"). The Vendor will use the Platform to list and sell products to end customers.`
    );

    // 2. Vendor Obligations
    addLine("2. Vendor Obligations", true);
    addLine(
      "a) List only genuine and permitted products with accurate descriptions, prices, and stock levels."
    );
    addLine(
      "b) Pack products securely and dispatch orders within the timelines communicated to customers."
    );
    addLine(
      "c) Issue tax invoices where applicable and comply with all applicable laws, including GST, income tax and consumer protection laws."
    );
    addLine(
      "d) Respond to customer queries and complaints in a reasonable time and cooperate with the Platform for dispute resolution."
    );
    addLine(
      "e) Not list prohibited items (counterfeit, illegal, or restricted products) and follow all Platform policies."
    );

    // 3. Platform Obligations
    addLine("3. Platform Obligations", true);
    addLine(
      "a) Provide the Vendor with an online storefront and basic tools to manage products, orders, and settings."
    );
    addLine(
      "b) Provide reasonable technical support related to the functioning of the Platform."
    );
    addLine(
      "c) Where applicable, route payments to the Vendor in accordance with the payout schedule and after necessary adjustments (refunds, chargebacks, fees, etc.)."
    );

    // 4. Payments & Settlements
    addLine("4. Payments & Settlements", true);
    addLine(
      "a) All settlements to the Vendor will be made only to the bank account mentioned in this Agreement or as updated and verified later."
    );
    addLine(
      "b) The Vendor is responsible for reconciling sales and payouts and for reporting any discrepancies within a reasonable time."
    );
    addLine(
      "c) The Platform may hold or delay settlements in case of suspected fraud, chargebacks, or regulatory requirements."
    );

    // 5. Taxes & Invoicing
    addLine("5. Taxes & Invoicing", true);
    addLine(
      "a) The Vendor is solely responsible for correct tax classification of products, charging applicable taxes, and timely filing of returns."
    );
    addLine(
      "b) Where GSTIN is not provided (for individuals), the Vendor understands that sales may be treated under applicable laws for unregistered persons."
    );
    addLine(
      "c) The Platform is not responsible for the Vendor's non-compliance with tax laws."
    );

    // 6. Returns, Refunds & Customer Experience
    addLine("6. Returns, Refunds & Customer Experience", true);
    addLine(
      "a) The Vendor agrees to honor the Platform's return and refund policies as communicated to customers."
    );
    addLine(
      "b) In case of defective, wrong or damaged products, the Vendor will cooperate to resolve the issue quickly, including replacement or refund as required."
    );

    // 7. Suspension & Termination
    addLine("7. Suspension & Termination", true);
    addLine(
      "a) The Platform may temporarily suspend or permanently disable the Vendor's store in case of repeated complaints, fraud, fake orders, or policy violations."
    );
    addLine(
      "b) Either party may terminate this Agreement with prior written notice. Outstanding settlements (post adjustments) will be processed as per standard timelines."
    );

    // 8. Limitation of Liability
    addLine("8. Limitation of Liability", true);
    addLine(
      "To the extent permitted by law, the Platform's liability is limited to the service fees charged. The Platform is not liable for indirect, incidental or consequential damages arising from the Vendor's use of the Platform."
    );

    // 9. Governing Law
    addLine("9. Governing Law", true);
    addLine(
      "This Agreement is governed by the laws applicable in India. Any disputes will be subject to the jurisdiction of the competent courts where LetzShopy operates its principal office."
    );

    // 10. Acceptance
    addLine("10. Acceptance", true);
    addLine(
      "By signing below, both parties confirm that they have read and agree to the terms of this Agreement."
    );

    // Signature lines
    if (cursorY > pageHeight - marginBottom - 80) {
      doc.addPage();
      cursorY = marginTop;
    }

    cursorY += 20;
    doc.setFont("helvetica", "normal");
    doc.text("Vendor Signature:", marginX, cursorY);
    doc.text("For LetzShopy:", marginX + maxWidth / 2, cursorY);
    cursorY += 40;
    doc.text(`Name: ${savedBizName}`, marginX, cursorY);
    doc.text("Name: ____________________", marginX + maxWidth / 2, cursorY);

    // Footer note
    cursorY = pageHeight - marginBottom;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This document is system-generated based on details submitted in your LetzShopy KYC profile.",
      marginX,
      cursorY
    );

    doc.save(`LetzShopy-Vendor-Agreement-${Date.now()}.pdf`);
  };

  return (
    <>
      {/* Top banner */}
      {banner && (
        <div className="fixed top-[72px] left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            {banner === "saved"
              ? "KYC draft saved successfully"
              : "KYC submitted for review"}
          </div>
        </div>
      )}

      <section className="max-w-4xl space-y-6">
        {inReview && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            KYC review is in progress. Once approved, you’ll be able to use all
            services.
          </div>
        )}

        {/* Business Type & PAN / GST */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Business details
              </h3>
              <p className="text-[11px] text-slate-500">
                This information is used only for verification and KYC.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Business type
              </label>
              <select
                className={selectClass}
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
              <label className="mb-1 block text-xs font-medium text-slate-700">
                PAN *
              </label>
              <input
                className={inputClass}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
              />
            </div>
          </div>

          {showGST && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  GSTIN
                </label>
                <input
                  className={inputClass}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Enter GSTIN exactly as per your GST certificate. Our team will
                  verify these details manually.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Legal name
                </label>
                <input
                  className={inputClass}
                  value={gstLegal}
                  onChange={(e) => setGstLegal(e.target.value)}
                  placeholder="Legal name as per GST"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Trade name
                </label>
                <input
                  className={inputClass}
                  value={gstTrade}
                  onChange={(e) => setGstTrade(e.target.value)}
                  placeholder="Trade name (if any)"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Registered state
                </label>
                <input
                  className={inputClass}
                  value={gstState}
                  onChange={(e) => setGstState(e.target.value)}
                  placeholder="State as per GST registration"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bank */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Bank details
            </h3>
            <p className="text-[11px] text-slate-500">
              Used only for manual settlements and refunds (if applicable).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Account number
              </label>
              <input
                className={inputClass}
                value={accNo}
                onChange={(e) => setAccNo(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Account holder name
              </label>
              <input
                className={inputClass}
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                IFSC
              </label>
              <input
                className={inputClass}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0000001"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Enter IFSC from your bank passbook / cheque. We will cross-check
                this during verification.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Bank
              </label>
              <input
                className={inputClass}
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="Bank name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Branch
              </label>
              <input
                className={inputClass}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Branch name / location"
              />
            </div>
          </div>
        </div>

        {/* Save draft after all fields (before documents) */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            className={secondaryBtnClass}
            disabled={!isDirty}
          >
            Save draft
          </button>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
            <p className="text-[11px] text-slate-500">
              Upload clear images or PDFs. Max size ~1–2MB per file.
            </p>
          </div>

          <DocRow
            title="Aadhaar"
            required
            type="AADHAAR"
            kyc={kyc}
            setKyc={setKyc}
          />
          <DocRow
            title="PAN"
            required
            type="PAN"
            kyc={kyc}
            setKyc={setKyc}
          />
          <DocRow
            title="Cancelled cheque"
            required
            type="CHEQUE"
            kyc={kyc}
            setKyc={setKyc}
          />
          <DocRow
            title="Signed vendor agreement (PDF)"
            required
            type="AGREEMENT"
            kyc={kyc}
            setKyc={setKyc}
            extraRight={
              <button
                type="button"
                onClick={generateAgreement}
                className="text-xs text-indigo-600 underline"
              >
                Download agreement
              </button>
            }
          />
          <DocRow
            title="GST certificate (optional)"
            type="GST_CERT"
            kyc={kyc}
            setKyc={setKyc}
          />
        </div>

        {/* Agreement + actions */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Vendor Agreement
          </h3>
          <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
            <p>
              <b>Summary:</b> By onboarding to LetzShopy, you agree to list
              permitted items, fulfill orders promptly, keep accurate inventory
              and pricing, honor returns per policy, and comply with laws (GST,
              invoicing, consumer protection).
            </p>
            <p className="mt-2">
              The downloaded PDF will contain your filled KYC details for
              signing.
            </p>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            I have read and agree to the Vendor Agreement.
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            className={secondaryBtnClass}
            disabled={!isDirty}
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={inReview}
            className={primaryBtnClass}
          >
            {inReview ? "Submitted for approval" : "Submit for approval"}
          </button>
          {!isDirty && (
            <span className="text-xs text-emerald-600">
              All changes saved.
            </span>
          )}
          {isDirty && (
            <span className="text-xs text-amber-600">
              You have unsaved changes.
            </span>
          )}
        </div>
      </section>
    </>
  );
}
