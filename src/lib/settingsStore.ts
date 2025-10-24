// src/lib/settingsStore.ts

/* ============== Shared & Existing Types ============== */
export type KycStatus = "not_started" | "in_review" | "approved" | "rejected";

/** Simple pages settings */
export interface PagesSettings {
  homeBannerUrl: string; // URL to banner image
  aboutText: string;     // plain paragraph(s)
}

/* ============== Main SettingsState ============== */
export interface SettingsState {
  profile: {
    // Personal
    personal: {
      name: string;
      mobile: string;
      email: string;
      address: string;
    };
    // Business
    business: {
      name: string;
      phone: string;
      email: string;
      address: string;
      logoUrl?: string; // logo we show on invoices/site
    };
    // Social / WhatsApp
    social: {
      instagram?: string;
      facebook?: string;
      youtube?: string;
      whatsappLink?: string;
      whatsappNumber?: string;
      showWhatsAppIcon?: boolean;
    };
  };

  kyc: {
    businessType: "individual" | "proprietorship" | "partnership" | "private_ltd" | "llp";

    // GST block (readonly fields after lookup)
    gstin?: string;
    gst_legal_name?: string;
    gst_trade_name?: string;
    gst_state?: string;

    // Bank block
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    branch?: string;

    // Documents (store URLs or filenames)
    docs: {
      aadhaarUrl?: string;
      panUrl?: string;
      gstCertUrl?: string;
      cancelledChequeUrl?: string;
      vendorAgreementUrl?: string;
    };

    notes?: string;
    kycStatus: KycStatus; // controlled by system
    submittedAt?: string;
  };

  /** CMS-like page bits we edit from “Pages” tab */
  pages: PagesSettings;

  /** general → product options */
  general: {
    products: {
      currency: string;                 // e.g., 'INR'
      priceDecimals: number;            // 0..4
      weightUnit: "kg" | "g" | "lb" | "oz";
      dimensionUnit: "cm" | "mm" | "m" | "in" | "yd";
      reviewsEnabled: boolean;
      manageStock: boolean;
      notifyLowStock: boolean;
      notifyNoStock: boolean;
      stockEmailRecipient: string;
      lowStockThreshold: number;
      hideOutOfStock: boolean;
      stockDisplayFormat: "no_amount" | "always" | "low_amount";
    };
  };
}

/* ============== In-memory defaults ============== */

/** Initial state */
let _settings: SettingsState = {
  profile: {
    personal: { name: "", mobile: "", email: "", address: "" },
    business: { name: "", phone: "", email: "", address: "", logoUrl: "" },
    social: { showWhatsAppIcon: false },
  },
  kyc: {
    businessType: "individual",
    docs: {},
    kycStatus: "not_started",
  },
  pages: {
    homeBannerUrl: "",
    aboutText: "",
  },
  general: {
    products: {
      currency: "INR",
      priceDecimals: 2,
      weightUnit: "kg",
      dimensionUnit: "cm",
      reviewsEnabled: true,
      manageStock: true,
      notifyLowStock: true,
      notifyNoStock: true,
      stockEmailRecipient: "",
      lowStockThreshold: 2,
      hideOutOfStock: true,
      stockDisplayFormat: "low_amount",
    },
  },
};

/* ============== Accessors & Deep Patch ============== */
export function getSettings() {
  return _settings;
}

/**
 * Deep(ish) merge that safely handles optional blocks.
 * - profile.personal / profile.business / profile.social merged
 * - kyc.docs merged
 * - pages shallow-merged
 * - general.products shallow-merged
 */
export function deepPatchSettings(patch: Partial<SettingsState>) {
  _settings = structuredClone({
    ..._settings,
    ...patch,

    profile: {
      ..._settings.profile,
      ...patch.profile,
      personal: { ..._settings.profile.personal, ...(patch.profile?.personal ?? {}) },
      business: { ..._settings.profile.business, ...(patch.profile?.business ?? {}) },
      social:   { ..._settings.profile.social,   ...(patch.profile?.social   ?? {}) },
    },

    kyc: {
      ..._settings.kyc,
      ...patch.kyc,
      docs: { ..._settings.kyc.docs, ...(patch.kyc?.docs ?? {}) },
    },

    pages: { ..._settings.pages, ...(patch.pages ?? {}) },

    general: {
      ..._settings.general, ...(patch.general ?? {}),
      products: { ..._settings.general.products, ...(patch.general?.products ?? {}) },
    },

      });
  return _settings;
}
