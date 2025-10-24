"use client";

import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";

type ProfileState = {
  personal: {
    name: string;
    mobile: string;
    email: string;
    address: string;
  };
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
    logo_url: string;
    banner_url: string;
  };
  social: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    whatsappLink?: string;
    whatsappNumber?: string;
    showWhatsAppIcon?: boolean;
  };
};

const STORAGE = "ls_profile_v1"; // keep same storage key you used before

export default function ProfileTab() {
  const [data, setData] = useState<ProfileState>({
    personal: { name: "", mobile: "", email: "", address: "" },
    business: {
      name: "",
      phone: "",
      email: "",
      address: "",
      logo_url: "",
      banner_url: "",
    },
    social: {
      instagram: "",
      facebook: "",
      youtube: "",
      whatsappLink: "",
      whatsappNumber: "",
      showWhatsAppIcon: false,
    },
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const v = JSON.parse(raw);
        setData((prev) => ({
          ...prev,
          // map old fields into new structure if needed
          personal: {
            name: `${v.business?.first_name || ""} ${v.business?.last_name || ""}`.trim() || prev.personal.name,
            mobile: prev.personal.mobile,
            email: prev.personal.email,
            address: prev.personal.address,
          },
          business: {
            name: v.business?.name ?? prev.business.name,
            phone: v.business?.phone ?? prev.business.phone,
            email: v.business?.email ?? prev.business.email,
            address: v.business?.address ?? prev.business.address,
            logo_url: v.business?.logo_url ?? prev.business.logo_url,
            banner_url: v.business?.banner_url ?? prev.business.banner_url,
          },
          social: { ...prev.social },
        }));
      }
    } catch {}
  }, []);

  const save = () => {
    // Persist back to same storage key so old data keeps working
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE) || "{}");
      } catch {
        return {};
      }
    })();
    const merged = {
      ...existing,
      business: {
        ...(existing.business || {}),
        name: data.business.name,
        phone: data.business.phone,
        email: data.business.email,
        address: data.business.address,
        logo_url: data.business.logo_url,
        banner_url: data.business.banner_url,
      },
    };
    localStorage.setItem(STORAGE, JSON.stringify(merged));
    alert("Saved.");
  };

  return (
    <section className="space-y-6 max-w-4xl">
      {/* Personal */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Personal</div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Your Name</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={data.personal.name}
              onChange={(e) => setData({ ...data, personal: { ...data.personal, name: e.target.value } })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Mobile</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={data.personal.mobile}
              onChange={(e) => setData({ ...data, personal: { ...data.personal, mobile: e.target.value } })}
              placeholder="+91…"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Personal email</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={data.personal.email}
              onChange={(e) => setData({ ...data, personal: { ...data.personal, email: e.target.value } })}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm mb-1">Personal address</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            value={data.personal.address}
            onChange={(e) => setData({ ...data, personal: { ...data.personal, address: e.target.value } })}
          />
        </div>
      </div>

      {/* Business */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Business</div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Business name</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={data.business.name}
                onChange={(e) => setData({ ...data, business: { ...data.business, name: e.target.value } })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Business phone</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={data.business.phone}
                onChange={(e) => setData({ ...data, business: { ...data.business, phone: e.target.value } })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Business email</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={data.business.email}
                onChange={(e) => setData({ ...data, business: { ...data.business, email: e.target.value } })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Business address</label>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                rows={3}
                value={data.business.address}
                onChange={(e) => setData({ ...data, business: { ...data.business, address: e.target.value } })}
              />
            </div>
          </div>

          {/* Branding: Logo with ImageUploader buttons and thumbnails */}
          <div className="space-y-6">
            <div>
              <div className="text-sm mb-1">Logo</div>
              {data.business.logo_url ? (
                <div className="flex items-center gap-3">
                  <img
                    src={data.business.logo_url}
                    className="h-16 w-16 object-cover rounded border"
                    alt="Logo"
                  />
                  <button
                    className="text-sm text-blue-600 underline"
                    onClick={() => setData({ ...data, business: { ...data.business, logo_url: "" } })}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <ImageUploader
                  onUploaded={(url) => setData({ ...data, business: { ...data.business, logo_url: url } })}
                />
              )}
              <p className="text-xs text-slate-500 mt-1">PNG/JPG up to 1 MB.</p>
            </div>
<div>
              <div className="text-sm mb-1">Homepage banner</div>
              {data.business.banner_url ? (
                <div className="flex items-center gap-3">
                  <img
                    src={data.business.banner_url}
                    className="h-16 w-28 object-cover rounded border"
                    alt="Banner"
                  />
                  <button
                    className="text-sm text-blue-600 underline"
                    onClick={() => setData({ ...data, business: { ...data.business, banner_url: "" } })}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <ImageUploader
                  onUploaded={(url) => setData({ ...data, business: { ...data.business, banner_url: url } })}
                />
              )}
              <p className="text-xs text-slate-500 mt-1">Recommended 1600×600px.</p>
            </div>
          </div>
        </div>
      </div>


      {/* Social / WhatsApp */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Social & WhatsApp</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Instagram URL"
            value={data.social.instagram || ""}
            onChange={(e) => setData({ ...data, social: { ...data.social, instagram: e.target.value } })}
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Facebook URL"
            value={data.social.facebook || ""}
            onChange={(e) => setData({ ...data, social: { ...data.social, facebook: e.target.value } })}
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="YouTube URL"
            value={data.social.youtube || ""}
            onChange={(e) => setData({ ...data, social: { ...data.social, youtube: e.target.value } })}
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="WhatsApp deep-link"
            value={data.social.whatsappLink || ""}
            onChange={(e) => setData({ ...data, social: { ...data.social, whatsappLink: e.target.value } })}
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="WhatsApp number"
            value={data.social.whatsappNumber || ""}
            onChange={(e) => setData({ ...data, social: { ...data.social, whatsappNumber: e.target.value } })}
          />
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!data.social.showWhatsAppIcon}
              onChange={(e) => setData({ ...data, social: { ...data.social, showWhatsAppIcon: e.target.checked } })}
            />
            Show WhatsApp icon in store footer
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} className="rounded bg-black text-white px-4 py-2 text-sm">
          Save
        </button>
      </div>
    </section>
  );
}
