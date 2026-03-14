"use client";

import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import DocumentUploader from "@/components/DocumentUploader";

type KycFile = {
  type: "AADHAAR" | "PAN" | "BANK" | "CANCELLED_CHEQUE" ;
  url: string;
  name?: string;
};

const STORAGE = "ls_profile_v1";

export default function ProfileSetupPage() {
  const [tab, setTab] = useState<"PROFILE" | "KYC">("PROFILE");

  // Profile fields
  const [business, setBusiness] = useState<any>({
    first_name: "",
    last_name: "",
    name: "",
    whatsapp: "",
    phone: "",
    email: "",
    address: "",
    about: "",
    logo_url: "",
    banner_url: "",
  });

  // KYC
  const [kyc, setKyc] = useState<KycFile[]>([]);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const v = JSON.parse(raw);
        setBusiness({ ...business, ...(v.business || {}) });
        setKyc(v.kyc || []);
        setAgree(v.agree ?? false);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save() {
    localStorage.setItem(
      STORAGE,
      JSON.stringify({ business, kyc, agree })
    );
    alert("Saved locally. (Server sync will come next.)");
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-4">Setup Profile</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("PROFILE")}
          className={`rounded px-3 py-1.5 text-sm border ${tab === "PROFILE" ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}
        >
          Profile
        </button>
        <button
          onClick={() => setTab("KYC")}
          className={`rounded px-3 py-1.5 text-sm border ${tab === "KYC" ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}
        >
          KYC
        </button>
      </div>

      {tab === "PROFILE" ? (
        <section className="space-y-6 max-w-3xl">
          {/* Business details */}
          <div className="border rounded-lg p-4">
            <div className="font-medium mb-3">Business details</div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">First name</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={business.first_name}
                  onChange={(e) =>
                    setBusiness({ ...business, first_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Last name</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={business.last_name}
                  onChange={(e) =>
                    setBusiness({ ...business, last_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Business name</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={business.name}
                  onChange={(e) =>
                    setBusiness({ ...business, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  WhatsApp support number
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={business.whatsapp}
                  onChange={(e) =>
                    setBusiness({ ...business, whatsapp: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={business.phone}
                  onChange={(e) =>
                    setBusiness({ ...business, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={business.email}
                  onChange={(e) =>
                    setBusiness({ ...business, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm mb-1">Address</label>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                rows={3}
                value={business.address}
                onChange={(e) =>
                  setBusiness({ ...business, address: e.target.value })
                }
              />
            </div>
          </div>

          {/* Branding */}
          <div className="border rounded-lg p-4">
            <div className="font-medium mb-3">Branding</div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <div className="text-sm mb-1">Logo</div>
                {business.logo_url ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={business.logo_url}
                      className="h-16 w-16 object-cover rounded border"
                    />
                    <button
                      className="text-sm text-blue-600 underline"
                      onClick={() =>
                        setBusiness({ ...business, logo_url: "" })
                      }
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <ImageUploader
                    onUploaded={(url) =>
                      setBusiness({ ...business, logo_url: url })
                    }
                  />
                )}
              </div>
              <div>
                <div className="text-sm mb-1">Homepage banner</div>
                {business.banner_url ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={business.banner_url}
                      className="h-16 w-28 object-cover rounded border"
                    />
                    <button
                      className="text-sm text-blue-600 underline"
                      onClick={() =>
                        setBusiness({ ...business, banner_url: "" })
                      }
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <ImageUploader
                    onUploaded={(url) =>
                      setBusiness({ ...business, banner_url: url })
                    }
                  />
                )}
              </div>
            </div>
          </div>

          {/* About */}
          <div className="border rounded-lg p-4">
            <div className="font-medium mb-3">About us content</div>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={6}
              value={business.about}
              onChange={(e) =>
                setBusiness({ ...business, about: e.target.value })
              }
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={save}
              className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE);
                alert("Cleared saved data.");
              }}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-6 max-w-3xl">
          <div className="border rounded-lg p-4">
            <div className="font-medium mb-3">KYC documents</div>
            <p className="text-xs text-slate-500 mb-3">
              Upload images or PDF. (We’ll store privately later; for now they
              go to WP Media.)
            </p>

            <KycRow title="Aadhaar" type="AADHAAR" kyc={kyc} setKyc={setKyc} />
            <KycRow title="PAN" type="PAN" kyc={kyc} setKyc={setKyc} />
            <KycRow
              title="Bank account details"
              type="BANK"
              kyc={kyc}
              setKyc={setKyc}
            />
            <KycRow
              title="Cancelled cheque"
              type="CANCELLED_CHEQUE"
              kyc={kyc}
              setKyc={setKyc}
            />
            

            {/* Vendor Agreement text + confirm */}
            <div className="mt-4">
              <div className="font-medium mb-2">Vendor Agreement</div>
              <div className="border rounded-lg p-3 max-h-48 overflow-auto text-xs leading-5 text-slate-700 bg-slate-50">
                <p>
                  <b>Summary:</b> By onboarding to LetzShopy, you agree to list
                  permitted items, fulfill orders promptly, keep accurate
                  inventory and pricing, honor returns per policy, and comply
                  with laws (GST, invoicing, consumer protection). Payouts are
                  settled per your plan after applicable fees and returns.
                </p>
                <p className="mt-2">
                  Full Agreement (sample): This is a placeholder. We’ll link the
                  final PDF/HTML here. By checking the box below you confirm
                  you’ve read, understood, and agree to be bound by the full
                  agreement.
                </p>
              </div>

              <label className="text-sm flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                I have read and agree to the Vendor Agreement.
              </label>

              <div className="mt-3">
                <button
                  type="button"
                  disabled={!agree || kyc.length < 5}
                  onClick={() => {
                    window.location.href = "/checkout/subscription";
                  }}
                  className="rounded px-4 py-2 text-sm text-white disabled:opacity-50 bg-green-600 hover:bg-green-700"
                  title={
                    !agree
                      ? "Please read & agree to proceed"
                      : kyc.length < 5
                      ? "Upload all KYC documents"
                      : ""
                  }
                >
                  Proceed to Subscription Checkout
                </button>
            </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={save}
              className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function KycRow({
  title,
  type,
  kyc,
  setKyc,
}: {
  title: string;
  type: KycFile["type"];
  kyc: KycFile[];
  setKyc: (v: KycFile[]) => void;
}) {
  const current = kyc.find((k) => k.type === type);

  function onUploaded(url: string, name?: string) {
    const others = kyc.filter((k) => k.type !== type);
    setKyc([...others, { type, url, name }]);
  }
  function clear() {
    const others = kyc.filter((k) => k.type !== type);
    setKyc(others);
  }

  return (
    <div className="flex items-center justify-between border rounded-lg p-3 mb-2">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {current ? (
          <div className="text-xs text-slate-600 break-all max-w-[50ch]">
            {current.name || current.url}
          </div>
        ) : (
          <div className="text-xs text-slate-500">Not uploaded</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {current && (
          <a
            href={current.url}
            target="_blank"
            className="text-xs text-blue-600 underline"
          >
            View
          </a>
        )}
        {current ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs rounded border px-2 py-1 hover:bg-gray-50"
          >
            Remove
          </button>
        ) : (
          <DocumentUploader onUploaded={onUploaded} />
        )}
      </div>
    </div>
  );
}
