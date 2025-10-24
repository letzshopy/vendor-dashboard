// src/app/settings/ui/ProfileTab.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type ProfileData = {
  personal: { name: string; mobile: string; email: string; address: string };
  business: { name: string; phone: string; email: string; address: string; logoUrl?: string };
  social: { instagram?: string; facebook?: string; youtube?: string; whatsappLink?: string; whatsappNumber?: string; showWhatsAppIcon?: boolean };
};

export default function ProfileTab() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/settings/profile', { cache: 'no-store' });
      const s = await res.json();
      setData(s);
    })();
  }, []);

  if (!data) return <div className="text-sm text-gray-500">Loading…</div>;

  const onChange = (path: string, value: any) => {
    setData(prev => {
      const clone: any = structuredClone(prev);
      const segs = path.split('.');
      let ptr: any = clone;
      for (let i = 0; i < segs.length - 1; i++) ptr = ptr[segs[i]];
      ptr[segs.at(-1)!] = value;
      return clone;
    });
  };

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/settings/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      onChange('business.logoUrl', j.url);
    } finally {
      setLogoUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Personal */}
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Personal</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="input" placeholder="Owner / Contact person"
            value={data.personal.name} onChange={e => onChange('personal.name', e.target.value)} />
          <input className="input" placeholder="+91…" value={data.personal.mobile}
            onChange={e => onChange('personal.mobile', e.target.value)} />
          <input className="input" placeholder="Personal email" value={data.personal.email}
            onChange={e => onChange('personal.email', e.target.value)} />
        </div>
        <textarea className="input mt-3" rows={3} placeholder="Optional (used for KYC or internal contact)"
          value={data.personal.address} onChange={e => onChange('personal.address', e.target.value)} />
      </section>

      {/* Business */}
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Business</h3>

        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div className="space-y-3">
            <input className="input" placeholder="Business name"
              value={data.business.name} onChange={e => onChange('business.name', e.target.value)} />
            <input className="input" placeholder="Business phone"
              value={data.business.phone} onChange={e => onChange('business.phone', e.target.value)} />
            <input className="input" placeholder="Business email"
              value={data.business.email} onChange={e => onChange('business.email', e.target.value)} />
            <textarea className="input" rows={3} placeholder="Shown on invoices"
              value={data.business.address} onChange={e => onChange('business.address', e.target.value)} />
          </div>

          {/* Logo upload */}
          <div>
            <div className="mb-2 text-sm font-medium">Logo</div>
            {data.business.logoUrl ? (
              <div className="flex items-center gap-3">
                <img src={data.business.logoUrl} alt="Logo" className="h-16 w-16 object-contain border rounded" />
                <button
                  className="btn btn-secondary"
                  onClick={() => fileRef.current?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? 'Uploading…' : 'Replace logo'}
                </button>
                <button className="btn btn-ghost text-red-600" onClick={() => onChange('business.logoUrl', '')}>Remove</button>
              </div>
            ) : (
              <button
                className="btn"
                onClick={() => fileRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? 'Uploading…' : 'Upload logo'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">PNG/JPG up to 1 MB. Shown on invoices and store.</p>
          </div>
        </div>
      </section>

      {/* Social */}
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Social & WhatsApp</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Instagram URL" value={data.social.instagram || ''} onChange={e => onChange('social.instagram', e.target.value)} />
          <input className="input" placeholder="Facebook URL" value={data.social.facebook || ''} onChange={e => onChange('social.facebook', e.target.value)} />
          <input className="input" placeholder="YouTube URL" value={data.social.youtube || ''} onChange={e => onChange('social.youtube', e.target.value)} />
          <input className="input" placeholder="WhatsApp deep link" value={data.social.whatsappLink || ''} onChange={e => onChange('social.whatsappLink', e.target.value)} />
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <input className="input" placeholder="WhatsApp number" value={data.social.whatsappNumber || ''} onChange={e => onChange('social.whatsappNumber', e.target.value)} />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!data.social.showWhatsAppIcon}
              onChange={e => onChange('social.showWhatsAppIcon', e.target.checked)} />
            Show WhatsApp icon on store page footer
          </label>
        </div>
      </section>

      <div className="flex gap-3">
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}
