"use client";

import { useEffect, useState } from "react";
import Upload from "../ui/Upload";

type ProfileState = {
  personal: {
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
    personalAddress: string;
  };
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
    whatsapp: string;
    showWhatsapp: boolean;
    logoUrl?: string;
  };
  social: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    whatsappDeep?: string;
  };
};

export default function ProfileClient() {
  const [data, setData] = useState<ProfileState | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings/profile");
      const json = await res.json();
      setData(json);
    })();
  }, []);

  async function uploadLogoIfAny(): Promise<string | undefined> {
    if (!logoFile) return data?.business.logoUrl;

    const fd = new FormData();
    fd.append("file", logoFile);
    const res = await fetch("/api/media/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Logo upload failed");
    const { url } = await res.json();
    return url as string;
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const logoUrl = await uploadLogoIfAny();
      const payload = { ...data, business: { ...data.business, logoUrl } };

      await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await fetch("/api/wp/sync-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl,
          businessName: payload.business.name,
          businessAddress: payload.business.address,
          phone: payload.business.phone,
          email: payload.business.email,
          whatsapp: payload.business.whatsapp,
          showWhatsapp: payload.business.showWhatsapp,
          social: payload.social,
        }),
      });

      setData(payload);
      setLogoFile(null);
      alert("Profile saved.");
    } catch (e: any) {
      alert(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <div className="text-sm text-gray-600">Loading…</div>;

  return (
    <form
      className="space-y-8"
      onSubmit={e => { e.preventDefault(); void save(); }}
    >
      {/* Personal */}
      <section className="p-4 border rounded-lg bg-white">
        <h3 className="font-semibold mb-3">Personal</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Owner / Contact person</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.personal.ownerName}
              onChange={e => setData({ ...data, personal: { ...data.personal, ownerName: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-sm">Personal phone</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="+91…"
              value={data.personal.ownerPhone}
              onChange={e => setData({ ...data, personal: { ...data.personal, ownerPhone: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-sm">Personal email</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={data.personal.ownerEmail}
              onChange={e => setData({ ...data, personal: { ...data.personal, ownerEmail: e.target.value } })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Personal address</label>
            <textarea
              rows={3}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="Optional (used for KYC or internal contact)"
              value={data.personal.personalAddress}
              onChange={e => setData({ ...data, personal: { ...data.personal, personalAddress: e.target.value } })}
            />
          </div>
        </div>
      </section>

      {/* Business */}
      <section className="p-4 border rounded-lg bg-white">
        <h3 className="font-semibold mb-3">Business</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm">Business name</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={data.business.name}
                onChange={e => setData({ ...data, business: { ...data.business, name: e.target.value } })}
              />
            </div>

            <div>
              <label className="text-sm">Business phone</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={data.business.phone}
                onChange={e => setData({ ...data, business: { ...data.business, phone: e.target.value } })}
              />
            </div>

            <div>
              <label className="text-sm">Business email</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={data.business.email}
                onChange={e => setData({ ...data, business: { ...data.business, email: e.target.value } })}
              />
            </div>

            <div>
              <label className="text-sm">Business address</label>
              <textarea
                rows={4}
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="Shown on invoices"
                value={data.business.address}
                onChange={e => setData({ ...data, business: { ...data.business, address: e.target.value } })}
              />
            </div>
          </div>

          {/* Logo + WhatsApp */}
          <div className="space-y-4">
            <Upload
              label="Logo"
              buttonText="Upload logo"
              accept="image/*"
              imagePreview
              helper="PNG/JPG, up to 5 MB."
              value={logoFile as any}
              onChange={setLogoFile}
            />
            {data.business.logoUrl && !logoFile && (
              <div className="text-xs text-gray-600 flex items-center gap-2">
                <img src={data.business.logoUrl} className="h-12 w-12 rounded object-cover border" />
                <span>Existing logo in use</span>
              </div>
            )}

            <div>
              <label className="text-sm">WhatsApp number</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="+91…"
                value={data.business.whatsapp}
                onChange={e => setData({ ...data, business: { ...data.business, whatsapp: e.target.value } })}
              />
              <label className="flex items-center gap-2 mt-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.business.showWhatsapp}
                  onChange={e => setData({ ...data, business: { ...data.business, showWhatsapp: e.target.checked } })}
                />
                <span>Show WhatsApp icon on store page footer</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Social */}
      <section className="p-4 border rounded-lg bg-white">
        <h3 className="font-semibold mb-3">Social links</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Instagram</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="https://instagram.com/…"
              value={data.social.instagram ?? ""}
              onChange={e => setData({ ...data, social: { ...data.social, instagram: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-sm">Facebook</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="https://facebook.com/…"
              value={data.social.facebook ?? ""}
              onChange={e => setData({ ...data, social: { ...data.social, facebook: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-sm">YouTube</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="https://youtube.com/…"
              value={data.social.youtube ?? ""}
              onChange={e => setData({ ...data, social: { ...data.social, youtube: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-sm">WhatsApp deep-link</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="https://wa.me/91XXXXXXXXXX"
              value={data.social.whatsappDeep ?? ""}
              onChange={e => setData({ ...data, social: { ...data.social, whatsappDeep: e.target.value } })}
            />
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <button disabled={saving} className="px-4 py-2 rounded bg-black text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
