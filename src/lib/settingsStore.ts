export type KycStatus = "not_started" | "in_review" | "approved" | "rejected";

export interface SetupSiteSettings {
  branding: {
    topbarMessage: string;
    heroBannerUrl: string;
    heroTopText: string;
    heroHeading: string;
    heroBottomText: string;
    heroButtonText: string;
    heroButtonLink: string;
  };
  policies: {
    returnsAccepted: string;
    returnWindowDays: string;
    returnConditionNotes: string;
    refundProcessingDays: string;
    returnAddressSame: boolean;
    returnAddress: string;
  };
}

export interface SettingsState {
  profile: {
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
      logoUrl?: string;
      state?: string;
      city?: string;
      category?: string;
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

  kyc: {
    businessType:
      | "individual"
      | "proprietorship"
      | "partnership"
      | "private_ltd"
      | "llp";
    pan?: string;
    gstin?: string;
    gst_legal_name?: string;
    gst_trade_name?: string;
    gst_state?: string;

    accountNumber?: string;
    accountHolderName?: string;
    ifsc?: string;
    bankName?: string;
    branch?: string;

    docs: {
      aadhaarKey?: string;
      aadhaarName?: string;
      panKey?: string;
      panName?: string;
      gstCertKey?: string;
      gstCertName?: string;
      cancelledChequeKey?: string;
      cancelledChequeName?: string;
      vendorAgreementKey?: string;
      vendorAgreementName?: string;
    };

    notes?: string;
    kycStatus: KycStatus;
    submittedAt?: string;
  };

  setupSite: SetupSiteSettings;

  general: {
    products: {
      currency: string;
      priceDecimals: number;
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

let _settings: SettingsState = {
  profile: {
    personal: { name: "", mobile: "", email: "", address: "" },
    business: {
      name: "",
      phone: "",
      email: "",
      address: "",
      logoUrl: "",
      state: "",
      city: "",
      category: "",
    },
    social: {
      instagram: "",
      facebook: "",
      youtube: "",
      whatsappLink: "",
      whatsappNumber: "",
      showWhatsAppIcon: false,
    },
  },

  kyc: {
    businessType: "individual",
    docs: {},
    kycStatus: "not_started",
  },

  setupSite: {
    branding: {
      topbarMessage: "",
      heroBannerUrl: "",
      heroTopText: "",
      heroHeading: "",
      heroBottomText: "",
      heroButtonText: "",
      heroButtonLink: "",
    },
    policies: {
      returnsAccepted: "",
      returnWindowDays: "",
      returnConditionNotes: "",
      refundProcessingDays: "",
      returnAddressSame: true,
      returnAddress: "",
    },
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

export function getSettings() {
  return _settings;
}

export function deepPatchSettings(patch: Partial<SettingsState>) {
  _settings = structuredClone({
    ..._settings,
    ...patch,

    profile: {
      ..._settings.profile,
      ...patch.profile,
      personal: {
        ..._settings.profile.personal,
        ...(patch.profile?.personal ?? {}),
      },
      business: {
        ..._settings.profile.business,
        ...(patch.profile?.business ?? {}),
      },
      social: {
        ..._settings.profile.social,
        ...(patch.profile?.social ?? {}),
      },
    },

    kyc: {
      ..._settings.kyc,
      ...patch.kyc,
      docs: {
        ..._settings.kyc.docs,
        ...(patch.kyc?.docs ?? {}),
      },
    },

    setupSite: {
      ..._settings.setupSite,
      ...(patch.setupSite ?? {}),
      branding: {
        ..._settings.setupSite.branding,
        ...(patch.setupSite?.branding ?? {}),
      },
      policies: {
        ..._settings.setupSite.policies,
        ...(patch.setupSite?.policies ?? {}),
      },
    },

    general: {
      ..._settings.general,
      ...(patch.general ?? {}),
      products: {
        ..._settings.general.products,
        ...(patch.general?.products ?? {}),
      },
    },
  });

  return _settings;
}