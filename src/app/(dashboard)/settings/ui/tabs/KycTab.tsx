"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  FileBadge2,
  FileCheck2,
  Landmark,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";

import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
  buttonClassName,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

type KycFileType =
  | "AADHAAR"
  | "PAN"
  | "CHEQUE"
  | "GST_CERT";

type KycFile = {
  type: KycFileType;
  key: string;
  name?: string;
};

type KycStatus =
  | "not_started"
  | "in_review"
  | "approved"
  | "rejected";

function downloadUrlForKey(
  fileKey: string
) {
  return `/api/settings/kyc/download?fileKey=${encodeURIComponent(
    fileKey
  )}`;
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 md:px-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          {icon}
        </span>

        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-heading">
            {title}
          </h2>

          {description ? (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="p-4 md:p-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-heading">
        {label}
        {required ? (
          <span className="ml-1 text-destructive">
            *
          </span>
        ) : null}
      </label>

      {children}
    </div>
  );
}

function KycPrivateUploader({
  onUploaded,
  docType,
  label = "Upload",
  accept = "image/*,.pdf,application/pdf",
}: {
  onUploaded: (
    key: string,
    filename?: string
  ) => void;
  docType: KycFileType;
  label?: string;
  accept?: string;
}) {
  const [
    loading,
    setLoading,
  ] =
    useState(false);

  async function handleChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    setLoading(true);

    const feedbackId =
      `kyc-upload-${docType}`;

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Uploading document…",
      message: file.name,
    });

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file,
        file.name
      );

      formData.append(
        "doc_type",
        docType
      );

      const response =
        await fetch(
          "/api/settings/kyc/upload",
          {
            method:
              "POST",
            body: formData,
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Upload failed"
        );
      }

      const key =
        payload?.fileKey ||
        payload?.key;

      if (!key) {
        throw new Error(
          "Upload completed but the document reference is missing."
        );
      }

      onUploaded(
        key,
        payload?.filename ||
          file.name
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Document uploaded",
        durationMs: 2000,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not upload document",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <label
      className={buttonClassName({
        variant:
          "secondary",
        size: "sm",
        className:
          loading
            ? "pointer-events-none opacity-60"
            : "",
      })}
    >
      <UploadCloud className="h-3.5 w-3.5" />
      {loading
        ? "Uploading…"
        : label}

      <input
        type="file"
        accept={accept}
        onChange={
          handleChange
        }
        className="hidden"
        disabled={
          loading
        }
      />
    </label>
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
  setKyc: (
    value: KycFile[]
  ) => void;
  readOnly?: boolean;
  helper?: string;
}) {
  const current =
    useMemo(
      () =>
        kyc.find(
          (item) =>
            item.type ===
            type
        ),
      [kyc, type]
    );

  function onUploaded(
    key: string,
    name?: string
  ) {
    const others =
      kyc.filter(
        (item) =>
          item.type !== type
      );

    setKyc([
      ...others,
      {
        type,
        key,
        name,
      },
    ]);
  }

  function clear() {
    setKyc(
      kyc.filter(
        (item) =>
          item.type !== type
      )
    );
  }

  return (
    <div className="flex min-h-[76px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 md:px-5">
      <span
        className={[
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          current
            ? "bg-emerald-50 text-emerald-700"
            : "bg-secondary text-secondary-foreground",
        ].join(" ")}
      >
        {current ? (
          <CheckCircle2 className="h-4.5 w-4.5" />
        ) : (
          <FileBadge2 className="h-4.5 w-4.5" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-heading">
          {title}
          {required ? (
            <span className="ml-1 text-destructive">
              *
            </span>
          ) : null}
        </div>

        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {current
            ? current.name ||
              "Uploaded"
            : helper ||
              "Not uploaded"}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {current ? (
          <>
            <a
              href={downloadUrlForKey(
                current.key
              )}
              target="_blank"
              rel="noreferrer"
              className={buttonClassName({
                variant:
                  "ghost",
                size: "sm",
              })}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                View
              </span>
            </a>

            {!readOnly ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={clear}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  Remove
                </span>
              </Button>
            ) : null}
          </>
        ) : readOnly ? null : (
          <KycPrivateUploader
            onUploaded={
              onUploaded
            }
            docType={type}
          />
        )}
      </div>
    </div>
  );
}

export default function KycTab() {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    kycStatus,
    setKycStatus,
  ] =
    useState<KycStatus>(
      "not_started"
    );

  const [
    submittedAt,
    setSubmittedAt,
  ] =
    useState<
      string | null
    >(null);

  const [
    pan,
    setPan,
  ] =
    useState("");

  const [
    aadhaarNumber,
    setAadhaarNumber,
  ] =
    useState("");

  const [
    gstRegistered,
    setGstRegistered,
  ] =
    useState<
      "yes" | "no"
    >("no");

  const [
    gstin,
    setGstin,
  ] =
    useState("");

  const [
    accNo,
    setAccNo,
  ] =
    useState("");

  const [
    confirmAccNo,
    setConfirmAccNo,
  ] =
    useState("");

  const [
    accName,
    setAccName,
  ] =
    useState("");

  const [
    ifsc,
    setIfsc,
  ] =
    useState("");

  const [
    bank,
    setBank,
  ] =
    useState("");

  const [
    branch,
    setBranch,
  ] =
    useState("");

  const [
    kyc,
    setKyc,
  ] =
    useState<KycFile[]>(
      []
    );

  const [
    declarationAccepted,
    setDeclarationAccepted,
  ] =
    useState(false);

  const [
    initialSnapshot,
    setInitialSnapshot,
  ] =
    useState("");

  const inReview =
    kycStatus ===
    "in_review";

  const approved =
    kycStatus ===
    "approved";

  const readOnly =
    inReview ||
    approved;

  const showGST =
    gstRegistered ===
    "yes";

  function getSnapshot() {
    return JSON.stringify({
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
  }

  const isDirty =
    useMemo(
      () =>
        Boolean(
          initialSnapshot
        ) &&
        initialSnapshot !==
          getSnapshot(),
      [
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
      ]
    );

  async function loadKyc() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/settings/kyc",
          {
            cache:
              "no-store",
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Failed to load KYC"
        );
      }

      const files:
        KycFile[] = [];

      if (
        payload?.docs
          ?.aadhaarKey
      ) {
        files.push({
          type: "AADHAAR",
          key:
            payload.docs
              .aadhaarKey,
          name:
            payload.docs
              .aadhaarName,
        });
      }

      if (
        payload?.docs?.panKey
      ) {
        files.push({
          type: "PAN",
          key:
            payload.docs
              .panKey,
          name:
            payload.docs
              .panName,
        });
      }

      if (
        payload?.docs
          ?.cancelledChequeKey
      ) {
        files.push({
          type: "CHEQUE",
          key:
            payload.docs
              .cancelledChequeKey,
          name:
            payload.docs
              .cancelledChequeName,
        });
      }

      if (
        payload?.docs
          ?.gstCertKey
      ) {
        files.push({
          type:
            "GST_CERT",
          key:
            payload.docs
              .gstCertKey,
          name:
            payload.docs
              .gstCertName,
        });
      }

      const nextKycStatus =
        (
          payload?.kycStatus ||
          "not_started"
        ) as KycStatus;

      const nextPan =
        payload?.pan || "";

      const nextAadhaar =
        payload?.aadhaarNumber ||
        payload?.aadhaar ||
        "";

      const nextGstin =
        payload?.gstin || "";

      const nextGstRegistered:
        "yes" | "no" =
        payload?.gstRegistered ===
          true ||
        payload?.gstRegistered ===
          "yes" ||
        Boolean(nextGstin)
          ? "yes"
          : "no";

      const nextAccNo =
        payload?.bank
          ?.accountNumber ||
        "";

      const nextConfirmAccNo =
        payload?.bank
          ?.confirmAccountNumber ||
        payload?.bank
          ?.accountNumber ||
        "";

      const nextAccName =
        payload?.bank
          ?.accountHolderName ||
        "";

      const nextIfsc =
        payload?.bank?.ifsc ||
        "";

      const nextBank =
        payload?.bank
          ?.bankName || "";

      const nextBranch =
        payload?.bank?.branch ||
        "";

      const nextDeclaration =
        Boolean(
          payload?.declarationAccepted
        );

      setKycStatus(
        nextKycStatus
      );
      setSubmittedAt(
        payload?.submittedAt ||
          null
      );
      setPan(nextPan);
      setAadhaarNumber(
        nextAadhaar
      );
      setGstRegistered(
        nextGstRegistered
      );
      setGstin(nextGstin);
      setAccNo(nextAccNo);
      setConfirmAccNo(
        nextConfirmAccNo
      );
      setAccName(
        nextAccName
      );
      setIfsc(nextIfsc);
      setBank(nextBank);
      setBranch(nextBranch);
      setDeclarationAccepted(
        nextDeclaration
      );
      setKyc(files);

      setInitialSnapshot(
        JSON.stringify({
          pan: nextPan,
          aadhaarNumber:
            nextAadhaar,
          gstRegistered:
            nextGstRegistered,
          gstin: nextGstin,
          accNo: nextAccNo,
          confirmAccNo:
            nextConfirmAccNo,
          accName:
            nextAccName,
          ifsc: nextIfsc,
          bank: nextBank,
          branch:
            nextBranch,
          kyc: files,
          declarationAccepted:
            nextDeclaration,
          kycStatus:
            nextKycStatus,
        })
      );
    } catch (
      error: unknown
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Failed to load KYC";

      setError(message);

      actionFeedback.error({
        id:
          "kyc-load",
        title:
          "Could not load KYC",
        message,
        durationMs: 4200,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKyc();
  }, []);

  function buildDocsPayload() {
    const doc = (
      type: KycFileType
    ) =>
      kyc.find(
        (item) =>
          item.type ===
          type
      );

    return {
      aadhaarKey:
        doc("AADHAAR")
          ?.key || "",
      aadhaarName:
        doc("AADHAAR")
          ?.name || "",
      panKey:
        doc("PAN")?.key ||
        "",
      panName:
        doc("PAN")?.name ||
        "",
      cancelledChequeKey:
        doc("CHEQUE")
          ?.key || "",
      cancelledChequeName:
        doc("CHEQUE")
          ?.name || "",
      gstCertKey:
        doc("GST_CERT")
          ?.key || "",
      gstCertName:
        doc("GST_CERT")
          ?.name || "",
    };
  }

  function buildPayload() {
    return {
      pan,
      aadhaarNumber,
      gstRegistered:
        showGST,
      gstin:
        showGST
          ? gstin
          : "",
      bank: {
        accountNumber:
          accNo,
        confirmAccountNumber:
          confirmAccNo,
        accountHolderName:
          accName,
        ifsc,
        bankName: bank,
        branch,
      },
      docs:
        buildDocsPayload(),
      declarationAccepted,
    };
  }

  async function save():
    Promise<boolean> {
    if (
      saving ||
      readOnly
    ) {
      return false;
    }

    const feedbackId =
      "kyc-save";

    setSaving(true);
    setError(null);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving KYC draft…",
    });

    try {
      const response =
        await fetch(
          "/api/settings/kyc",
          {
            method:
              "PATCH",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify(
                buildPayload()
              ),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Failed to save KYC"
        );
      }

      setInitialSnapshot(
        getSnapshot()
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "KYC draft saved",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Failed to save KYC";

      setError(message);

      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save KYC",
        message,
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  function warn(
    title: string
  ) {
    actionFeedback.warning({
      id:
        "kyc-validation",
      title,
      durationMs: 3200,
    });
  }

  async function submit() {
    const has = (
      type: KycFileType
    ) =>
      kyc.some(
        (item) =>
          item.type ===
          type
      );

    const panOk =
      /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
        pan
          .toUpperCase()
          .trim()
      );

    if (!panOk) {
      warn(
        "Enter a valid PAN"
      );
      return;
    }

    if (
      !aadhaarNumber.trim()
    ) {
      warn(
        "Enter Aadhaar / ID number"
      );
      return;
    }

    if (showGST) {
      if (!gstin.trim()) {
        warn(
          "Enter GST number"
        );
        return;
      }

      if (
        !/^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$/.test(
          gstin
            .toUpperCase()
            .trim()
        )
      ) {
        warn(
          "Check the GSTIN format"
        );
        return;
      }
    }

    if (
      !accNo ||
      !confirmAccNo ||
      !accName ||
      !bank
    ) {
      warn(
        "Complete the bank details"
      );
      return;
    }

    if (
      accNo !==
      confirmAccNo
    ) {
      warn(
        "Account numbers do not match"
      );
      return;
    }

    if (
      !/^[A-Z]{4}0[0-9A-Z]{6}$/.test(
        ifsc
          .toUpperCase()
          .trim()
      )
    ) {
      warn(
        "Enter a valid IFSC code"
      );
      return;
    }

    if (
      !has("AADHAAR") ||
      !has("PAN") ||
      !has("CHEQUE")
    ) {
      warn(
        "Upload all required documents"
      );
      return;
    }

    if (
      !declarationAccepted
    ) {
      warn(
        "Accept the KYC declaration"
      );
      return;
    }

    const feedbackId =
      "kyc-submit";

    setSubmitting(true);
    setError(null);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Submitting KYC…",
    });

    try {
      const response =
        await fetch(
          "/api/settings/kyc/submit",
          {
            method:
              "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify(
                buildPayload()
              ),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Failed to submit KYC"
        );
      }

      const nextStatus:
        KycStatus =
        "in_review";

      setKycStatus(
        nextStatus
      );

      setSubmittedAt(
        payload?.submittedAt ||
          new Date().toISOString()
      );

      setInitialSnapshot(
        JSON.stringify({
          ...JSON.parse(
            getSnapshot()
          ),
          kycStatus:
            nextStatus,
        })
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "KYC submitted for review",
        durationMs: 2600,
      });
    } catch (
      error: unknown
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Failed to submit KYC";

      setError(message);

      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not submit KYC",
        message,
        durationMs: 4200,
      });
    } finally {
      setSubmitting(false);
    }
  }

  useUnsavedChanges({
    id:
      "settings-kyc",
    dirty:
      isDirty &&
      !readOnly,
    label:
      "KYC changes",
    save,
  });

  const statusConfig = {
    not_started: {
      label:
        "Not started",
      chip:
        "bg-slate-100 text-slate-700",
      icon:
        <Clock3 className="h-4 w-4" />,
      note:
        "Complete the details below and submit them for verification.",
      noteClass:
        "bg-surface-soft text-muted-foreground",
    },
    in_review: {
      label:
        "In review",
      chip:
        "bg-indigo-50 text-indigo-700",
      icon:
        <Clock3 className="h-4 w-4" />,
      note:
        "Your KYC is under review. Editing is locked until the review is completed.",
      noteClass:
        "bg-indigo-50 text-indigo-800",
    },
    approved: {
      label:
        "Approved",
      chip:
        "bg-emerald-50 text-emerald-700",
      icon:
        <CheckCircle2 className="h-4 w-4" />,
      note:
        "Your KYC has been approved.",
      noteClass:
        "bg-emerald-50 text-emerald-800",
    },
    rejected: {
      label:
        "Rejected",
      chip:
        "bg-rose-50 text-rose-700",
      icon:
        <XCircle className="h-4 w-4" />,
      note:
        "Update the required details and submit again.",
      noteClass:
        "bg-rose-50 text-rose-800",
    },
  }[kycStatus];

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-3 xl:grid-cols-2">
          <Skeleton className="h-60 w-full rounded-2xl" />
          <Skeleton className="h-60 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card px-4 py-3.5 md:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <BadgeCheck className="h-4.5 w-4.5" />
            </span>

            <div className="min-w-0">
              <div className="text-sm font-extrabold text-heading">
                Verification status
              </div>

              <div className="mt-0.5 text-xs text-muted-foreground">
                Identity and settlement verification for this store.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${statusConfig.chip}`}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>

            {submittedAt ? (
              <span className="text-xs text-muted-foreground">
                Submitted{" "}
                {new Date(
                  submittedAt
                ).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={`mt-3 rounded-xl px-3 py-2.5 text-xs leading-5 ${statusConfig.noteClass}`}
        >
          {statusConfig.note}
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          icon={
            <Building2 className="h-4.5 w-4.5" />
          }
          title="Identity details"
          description="PAN, Aadhaar / ID and GST information."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="PAN number"
              required
            >
              <Input
                value={pan}
                onChange={(
                  event
                ) =>
                  setPan(
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="ABCDE1234F"
                disabled={
                  readOnly
                }
              />
            </Field>

            <Field
              label="Aadhaar / ID number"
              required
            >
              <Input
                value={
                  aadhaarNumber
                }
                onChange={(
                  event
                ) =>
                  setAadhaarNumber(
                    event.target.value
                  )
                }
                placeholder="Enter valid ID number"
                disabled={
                  readOnly
                }
              />
            </Field>

            <div className="sm:col-span-2">
              <div className="mb-1.5 text-xs font-bold text-heading">
                GST registered?
                <span className="ml-1 text-destructive">
                  *
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value:
                        "no",
                      label: "No",
                    },
                    {
                      value:
                        "yes",
                      label: "Yes",
                    },
                  ] as const
                ).map(
                  (
                    option
                  ) => {
                    const active =
                      gstRegistered ===
                      option.value;

                    return (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        disabled={
                          readOnly
                        }
                        onClick={() =>
                          setGstRegistered(
                            option.value
                          )
                        }
                        className={[
                          "ls-focus-ring min-h-11 rounded-xl border text-sm font-bold transition",
                          active
                            ? "border-primary bg-secondary text-secondary-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-muted",
                        ].join(
                          " "
                        )}
                      >
                        {
                          option.label
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {showGST ? (
              <div className="sm:col-span-2">
                <Field
                  label="GST number"
                  required
                >
                  <Input
                    value={
                      gstin
                    }
                    onChange={(
                      event
                    ) =>
                      setGstin(
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="22AAAAA0000A1Z5"
                    disabled={
                      readOnly
                    }
                  />
                </Field>
              </div>
            ) : null}
          </div>
        </Section>

        <Section
          icon={
            <Landmark className="h-4.5 w-4.5" />
          }
          title="Bank details"
          description="Used for settlement, refunds and verification."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Account holder name"
              required
            >
              <Input
                value={
                  accName
                }
                onChange={(
                  event
                ) =>
                  setAccName(
                    event.target.value
                  )
                }
                disabled={
                  readOnly
                }
              />
            </Field>

            <Field
              label="Bank name"
              required
            >
              <Input
                value={bank}
                onChange={(
                  event
                ) =>
                  setBank(
                    event.target.value
                  )
                }
                disabled={
                  readOnly
                }
              />
            </Field>

            <Field
              label="Account number"
              required
            >
              <Input
                value={accNo}
                onChange={(
                  event
                ) =>
                  setAccNo(
                    event.target.value
                  )
                }
                inputMode="numeric"
                disabled={
                  readOnly
                }
              />
            </Field>

            <Field
              label="Confirm account number"
              required
            >
              <Input
                value={
                  confirmAccNo
                }
                onChange={(
                  event
                ) =>
                  setConfirmAccNo(
                    event.target.value
                  )
                }
                inputMode="numeric"
                disabled={
                  readOnly
                }
              />
            </Field>

            <Field
              label="IFSC code"
              required
            >
              <Input
                value={ifsc}
                onChange={(
                  event
                ) =>
                  setIfsc(
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="HDFC0000001"
                disabled={
                  readOnly
                }
              />
            </Field>

            <Field label="Branch name">
              <Input
                value={
                  branch
                }
                onChange={(
                  event
                ) =>
                  setBranch(
                    event.target.value
                  )
                }
                disabled={
                  readOnly
                }
              />
            </Field>
          </div>
        </Section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 md:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <FileBadge2 className="h-4.5 w-4.5" />
          </span>

          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-heading">
              Documents
            </h2>

            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Upload clear JPG, PNG or PDF copies.
            </p>
          </div>
        </div>

        <div>
          <DocRow
            title="PAN card"
            required
            type="PAN"
            kyc={kyc}
            setKyc={setKyc}
            readOnly={
              readOnly
            }
            helper="Required document"
          />

          <DocRow
            title="Aadhaar / ID proof"
            required
            type="AADHAAR"
            kyc={kyc}
            setKyc={setKyc}
            readOnly={
              readOnly
            }
            helper="Required document"
          />

          {showGST ? (
            <DocRow
              title="GST certificate"
              type="GST_CERT"
              kyc={kyc}
              setKyc={setKyc}
              readOnly={
                readOnly
              }
              helper="Optional"
            />
          ) : null}

          <DocRow
            title="Cancelled cheque"
            required
            type="CHEQUE"
            kyc={kyc}
            setKyc={setKyc}
            readOnly={
              readOnly
            }
            helper="Required for bank verification"
          />
        </div>
      </section>

      {!readOnly ? (
        <section className="rounded-2xl border border-border bg-card px-4 py-4 md:px-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={
                declarationAccepted
              }
              onChange={(
                event
              ) =>
                setDeclarationAccepted(
                  event.target.checked
                )
              }
              className="mt-0.5 h-5 w-5 rounded border-border text-primary focus:ring-ring"
            />

            <span className="min-w-0">
              <span className="block text-sm font-bold text-heading">
                KYC declaration
                <span className="ml-1 text-destructive">
                  *
                </span>
              </span>

              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                I confirm that the submitted documents and bank details are valid and belong to my business.
              </span>
            </span>
          </label>
        </section>
      ) : null}

      {!readOnly ? (
        <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_14px_36px_rgba(38,51,95,0.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 px-1">
              <div className="text-xs font-bold text-heading">
                {isDirty
                  ? "Unsaved KYC changes"
                  : "KYC draft saved"}
              </div>

              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Save a draft or submit when all required details are ready.
              </div>
            </div>

            <div className="flex gap-2">
              <AsyncButton
                type="button"
                variant="outline"
                loading={saving}
                loadingLabel="Saving…"
                disabled={
                  !isDirty
                }
                onClick={() =>
                  void save()
                }
              >
                Save draft
              </AsyncButton>

              <AsyncButton
                type="button"
                loading={
                  submitting
                }
                loadingLabel="Submitting…"
                onClick={() =>
                  void submit()
                }
              >
                <FileCheck2 className="h-4 w-4" />
                Submit for review
              </AsyncButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted-foreground">
          {approved
            ? "KYC is approved. Editing is locked."
            : "KYC is under review. Editing is locked until the review is completed."}
        </div>
      )}
    </div>
  );
}
