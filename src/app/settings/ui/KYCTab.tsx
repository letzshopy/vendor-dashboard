// src/app/settings/ui/KYCTab.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Docs = {
  aadhaarUrl?: string;
  panUrl?: string;
  gstCertUrl?: string;
  cancelledChequeUrl?: string;
  vendorAgreementUrl?: string;
};

type KycData = {
  businessType: 'individual' | 'proprietorship' | 'partnership' | 'private_ltd' | 'llp';
  gstin?: string;
  gst_legal_name?: string;
  gst_trade_name?: string;
  gst_state?: string;

  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  branch?: string;

  docs: Docs;
  notes?: string;
  kycStatus: 'not_started' | 'in_review' | 'approved' | 'rejected';
};

function Uploader({
  label,
  accept,
  value,
  onUploaded,
  hint,
}: {
  label: string;
  accept: string;
  value?: string;
  onUploaded: (url: string, fileName: string) => void;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | undefined>();

  const pick = () => ref.current?.click();

  const onChange = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await fetch('/api/settings/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      setFileName(j.fileName);
      onUploaded(j.url, j.fileName);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-3">
        <button className="btn" type="button" onClick={pick} disabled={uploading}>
          {uploading ? 'Uploading…' : (value ? 'Replace file' : 'Upload file')}
        </button>
        { (fileName || value) && (
          <span className="text-sm text-green-600 inline-flex items-center gap-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
            {fileName || value?.split('/').pop()}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => onChange(e.target.files?.[0])} />
    </div>
  );
}

export default function KYCTab() {
  const [data, setData] = useState<KycData | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gstErr, setGstErr] = useState<string | undefined>();
  const [ifscErr, setIfscErr] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/settings/kyc', { cache: 'no-store' });
      const j = await r.json();
      setData(j);
    })();
  }, []);

  if (!data) return <div className="text-sm text-gray-500">Loading…</div>;

  const onChange = (k: keyof KycData, v: any) => setData(d => ({ ...(d as KycData), [k]: v }));

  const patchDocs = (p: Partial<Docs>) =>
    setData(d => ({ ...(d as KycData), docs: { ...(d as KycData).docs, ...p } }));

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/kyc', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await save();
      await fetch('/api/settings/kyc/submit', { method: 'POST' });
      const r = await fetch('/api/settings/kyc', { cache: 'no-store' });
      const j = await r.json();
      setData(j);
    } finally {
      setSubmitting(false);
    }
  };

  const lookupGST = async () => {
    setGstErr(undefined);
    try {
      const r = await fetch(`/api/kyc/gstin-lookup?gstin=${encodeURIComponent(data.gstin || '')}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Lookup failed');
      onChange('gst_legal_name', j.legalName);
      onChange('gst_trade_name', j.tradeName);
      onChange('gst_state', j.state);
    } catch (e: any) {
      setGstErr(e.message || 'Lookup failed');
    }
  };

  const lookupIFSC = async () => {
    setIfscErr(undefined);
    try {
      const r = await fetch(`/api/kyc/ifsc-lookup?ifsc=${encodeURIComponent(data.ifsc || '')}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Lookup failed');
      onChange('bankName', j.bankName);
      onChange('branch', j.branch);
    } catch (e: any) {
      setIfscErr(e.message || 'Lookup failed');
    }
  };

  const isGSTDisabled = data.businessType === 'individual';

  return (
    <div className="space-y-6">
      {data.kycStatus === 'in_review' && (
        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Your KYC is in review. Once approved, you can access all services.
        </div>
      )}

      {/* Business type */}
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Business type</h3>
        <select
          className="input max-w-xs"
          value={data.businessType}
          onChange={e => onChange('businessType', e.target.value as KycData['businessType'])}
        >
          <option value="individual">Individual</option>
          <option value="proprietorship">Proprietorship</option>
          <option value="partnership">Partnership</option>
          <option value="private_ltd">Private Ltd</option>
          <option value="llp">LLP</option>
        </select>
      </section>

      {/* GST */}
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">GST</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="input" placeholder="GSTIN"
            value={data.gstin || ''} onChange={e => onChange('gstin', e.target.value)}
            disabled={isGSTDisabled} />
          <button className="btn" type="button" onClick={lookupGST} disabled={isGSTDisabled}>Lookup</button>
          <div />
          <input className="input" placeholder="Legal name" value={data.gst_legal_name || ''} readOnly />
          <input className="input" placeholder="Trade name" value={data.gst_trade_name || ''} readOnly />
          <input className="input" placeholder="State" value={data.gst_state || ''} readOnly />
        </div>
        {isGSTDisabled && <p className="text-xs text-gray-500 mt-2">GST not required for Individual.</p>}
        {gstErr && <p className="text-xs text-red-600 mt-2">{gstErr}</p>}
      </section>

      {/* Bank */}
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Bank details</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <input className="input" placeholder="Account number"
            value={data.accountNumber || ''} onChange={e => onChange('accountNumber', e.target.value)} />
          <input className="input" placeholder="IFSC"
            value={data.ifsc || ''} onChange={e => onChange('ifsc', e.target.value)} />
          <button className="btn" type="button" onClick={lookupIFSC}>IFSC lookup</button>
          <div />
          <input className="input" placeholder="Bank name" value={data.bankName || ''} readOnly />
          <input className="input" placeholder="Branch" value={data.branch || ''} readOnly />
        </div>
        {ifscErr && <p className="text-xs text-red-600 mt-2">{ifscErr}</p>}
        <p className="text-xs text-gray-500 mt-2">Account holder name cannot be auto-fetched—please enter exactly as per bank records in documents.</p>
      </section>

      {/* Documents */}
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Documents</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <Uploader
            label="Aadhaar *"
            accept=".jpg,.jpeg,.png,.pdf"
            value={data.docs.aadhaarUrl}
            onUploaded={(url) => patchDocs({ aadhaarUrl: url })}
            hint="JPG/PNG/PDF up to 2 MB."
          />
          <Uploader
            label="PAN *"
            accept=".jpg,.jpeg,.png,.pdf"
            value={data.docs.panUrl}
            onUploaded={(url) => patchDocs({ panUrl: url })}
            hint="JPG/PNG/PDF up to 2 MB."
          />
          <Uploader
            label="GST Certificate"
            accept=".jpg,.jpeg,.png,.pdf"
            value={data.docs.gstCertUrl}
            onUploaded={(url) => patchDocs({ gstCertUrl: url })}
            hint="JPG/PNG/PDF up to 2 MB."
          />
          <Uploader
            label="Cancelled Cheque"
            accept=".jpg,.jpeg,.png,.pdf"
            value={data.docs.cancelledChequeUrl}
            onUploaded={(url) => patchDocs({ cancelledChequeUrl: url })}
            hint="JPG/PNG/PDF up to 2 MB."
          />
          <Uploader
            label="Signed Vendor Agreement"
            accept=".pdf,.jpg,.jpeg,.png"
            value={data.docs.vendorAgreementUrl}
            onUploaded={(url) => patchDocs({ vendorAgreementUrl: url })}
            hint={<>
              Upload signed copy. <a className="underline" href="/sample-agreement.pdf" target="_blank">Download blank agreement</a>
            </> as any}
          />
        </div>
      </section>

      {/* Review / Submit */}
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Review & Submit</h3>
        <textarea className="input" rows={3} placeholder="Notes (optional, visible to support)"
          value={data.notes || ''} onChange={e => onChange('notes', e.target.value)} />
        <div className="flex gap-3 mt-3">
          <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn" onClick={submit} disabled={submitting || data.kycStatus === 'in_review'}>
            {submitting ? 'Submitting…' : (data.kycStatus === 'in_review' ? 'Submitted' : 'Submit for approval')}
          </button>
        </div>
      </section>
    </div>
  );
}
