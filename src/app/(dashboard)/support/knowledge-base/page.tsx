import {
  BookOpen,
  ChevronDown,
} from "lucide-react";

import {
  PageHeader,
} from "@/components/ui/page-header";

type KBCard = {
  title: string;
  points: string[];
};

type KBSection = {
  id: string;
  heading: string;
  cards: KBCard[];
};

const QUICK_ACTIONS = [
  {
    label: "Add a product",
    href: "#products",
  },
  {
    label: "Process an order",
    href: "#orders",
  },
  {
    label: "Verify Manual UPI",
    href: "#payments",
  },
  {
    label: "Ship an order",
    href: "#shipping",
  },
  {
    label: "Download packing slips",
    href: "#shipping",
  },
  {
    label: "Send a WhatsApp update",
    href: "#notifications",
  },
  {
    label: "Create an offer",
    href: "#offers",
  },
  {
    label: "Change store settings",
    href: "#settings",
  },
  {
    label: "Renew subscription",
    href: "#subscription",
  },
  {
    label: "Fix a problem",
    href: "#troubleshooting",
  },
] as const;

const SECTIONS: KBSection[] = [
  {
    id: "start-here",
    heading: "Start here",
    cards: [
      {
        title: "1. Store website vs Business Dashboard",
        points: [
          "Your Store Website is customer-facing: customers browse products, use cart and checkout, and view your public store content.",
          "The LetzShopy Business Dashboard is your operating workspace for products, orders, customers, payments, shipping, offers, reports, billing and settings.",
          "LetzShopy manages the underlying store technology, hosting, security and platform integrations. Use the dashboard for normal business operations.",
          "Changes saved in supported dashboard modules are synchronized to the connected store or its operational data.",
        ],
      },
      {
        title: "2. First-login checklist",
        points: [
          "Confirm the store name shown in the dashboard is your correct store before changing any data.",
          "Open Settings → Profile & Account and verify owner, business, contact and customer-facing information.",
          "Review Store Settings, Shipping & Delivery, Payments, Website Setup and KYC before accepting real orders.",
          "Add at least one test product, check it on the storefront and complete a test checkout using each payment method you plan to enable.",
          "Enable new-order notifications on your phone or installed PWA so you do not miss incoming orders.",
        ],
      },
      {
        title: "3. Your 7-day trial and onboarding work",
        points: [
          "The onboarding trial is designed for completing profile, website inputs, KYC, subscription, sample products and transaction settings.",
          "Use the trial to learn product creation, order handling, payment verification and shipping before launch.",
          "Your storefront preparation and your dashboard setup can happen in parallel; you do not need to wait for a full catalogue before learning the dashboard.",
        ],
      },
      {
        title: "4. What you manage vs what LetzShopy manages",
        points: [
          "You manage business data such as products, stock, orders, customer handling, payment settings, shipping, offers, feedback, reports and supported website settings.",
          "LetzShopy manages platform infrastructure, WordPress administration, security boundaries, integration credentials and technical maintenance.",
          "Do not share passwords, OTPs, payment credentials or KYC documents through informal channels. Use the dashboard and official support flow.",
        ],
      },
    ],
  },
  {
    id: "products",
    heading: "Products & catalogue",
    cards: [
      {
        title: "5. Product Wizard — choose the correct product type",
        points: [
          "Go to Catalog → Add Product.",
          "Choose Simple Product when the item has one selling price and one stock quantity.",
          "Choose Size Variations when customers choose a size and each size needs its own price and quantity.",
          "Choose Colour Variations when customers choose a colour and each colour needs its own price, quantity and colour-specific images.",
          "The wizard changes its steps automatically after you choose the product type.",
        ],
      },
      {
        title: "6. Add a Simple Product — step by step",
        points: [
          "Step 1 — Category: select an existing product category or create one if needed.",
          "Step 2 — Product Type: choose Simple Product — One price and stock.",
          "Step 3 — Identity: enter a clear product name and the available identity fields.",
          "Step 4 — Description: add a useful short description; the wizard requires meaningful content before continuing.",
          "Step 5 — Images: upload the product gallery and arrange the images in the order you want customers to see them.",
          "Step 6 — Price & Quantity: enter a valid selling price and available stock quantity.",
          "Step 7 — Shipping & Product Details: add positive product weight; add dimensions when enabled, plus relevant tags/attributes.",
          "Step 8 — Review & Create: choose Draft or Publish and Visible or Hidden, review everything, then create the product.",
        ],
      },
      {
        title: "7. Add a Size Variation Product — step by step",
        points: [
          "Choose the product category, then select Size Variations.",
          "Enter the product identity. Variable products require a base SKU, and the dashboard checks that the SKU is not already in use.",
          "Add the description, then create the required size rows. Common choices include XS, S, M, L, XL, XXL and Free Size.",
          "Every size row needs a valid price and stock quantity before you can continue.",
          "Upload the shared product gallery. Size variations use the common product images rather than a separate gallery for every size.",
          "Enter shipping weight and any enabled dimensions, then review Draft/Publish and Visible/Hidden before creating.",
          "Variation SKUs are built from the base SKU plus the size option, so use a clean and meaningful base SKU.",
        ],
      },
      {
        title: "8. Add a Colour Variation Product — step by step",
        points: [
          "Choose the category, then select Colour Variations.",
          "Enter the product identity and a unique base SKU.",
          "Add the product description, then create each colour option with its own price and stock quantity.",
          "The next step is Colour Images. Every colour must have at least one image before the wizard can continue.",
          "Use images that clearly represent the actual colour so the customer understands which option they are selecting.",
          "Add shipping weight and any enabled dimensions, then review the product status and visibility before creating.",
        ],
      },
      {
        title: "9. Product images, image order and variation galleries",
        points: [
          "Use clear product photos with the product filling the frame and avoid misleading edits that change colour or design.",
          "For shared product galleries, the first image acts as the primary storefront image. Reorder images before creating when needed.",
          "Colour variation products use images attached to each colour row, so make sure no colour is left without an image.",
          "If an image upload fails, retry with a supported image and stable connection. Keep the original product photo available until the product is published and checked.",
        ],
      },
      {
        title: "10. Product visibility, Draft and Publish",
        points: [
          "Publish makes the product available to the storefront subject to its visibility, stock and category settings.",
          "Draft keeps the product in the dashboard without making it a live customer product.",
          "Visible allows normal catalogue display; Hidden is useful when you want to keep the product record without normal storefront browsing.",
          "If a product is not visible, check status, visibility, price, stock and category before opening a support ticket.",
        ],
      },
    ],
  },
  {
    id: "categories-menu",
    heading: "Categories & website menu",
    cards: [
      {
        title: "11. Create or select a product category",
        points: [
          "Categories group products into customer-friendly collections such as Sarees, Bags or Home Textiles.",
          "The Add Product wizard lets you search existing categories and can create a new category when the required one does not exist.",
          "Avoid creating duplicate categories with slightly different spelling. Search first, then create only when necessary.",
        ],
      },
      {
        title: "12. Category and Website Menu are different",
        points: [
          "A product category controls product grouping. Creating a category does not automatically decide where it appears in your website navigation.",
          "Menu Layout controls the links shown in the Website Menu and footer menus.",
          "You can add an existing category to the menu without changing or duplicating the category itself.",
        ],
      },
      {
        title: "13. Add a product category to the Website Menu",
        points: [
          "Open Menu Layout and choose Website Menu.",
          "Choose Add Item, then select the Category tab.",
          "Search for the required category and tap/click it to add it to the menu.",
          "Place it in the correct position or under the correct menu group, then save the menu.",
          "Open the storefront on desktop and mobile and confirm the category link opens the correct product category.",
        ],
      },
      {
        title: "14. Arrange, move or nest menu items",
        points: [
          "Use Menu Layout to change the sequence of items and organize categories under suitable parent/group items.",
          "Keep navigation based on words your customers already understand rather than internal product terminology.",
          "After rearranging, save the menu and verify both desktop navigation and mobile/off-canvas navigation.",
        ],
      },
      {
        title: "15. Remove a category from the menu without deleting it",
        points: [
          "Removing a menu item removes only the navigation link.",
          "The underlying category and the products assigned to it remain in the catalogue.",
          "Use this when a category should stay in the system but should not be directly shown in the main menu.",
        ],
      },
    ],
  },
  {
    id: "orders",
    heading: "Orders & customers",
    cards: [
      {
        title: "16. Understand the main order statuses",
        points: [
          "Pending Payment means payment has not yet been confirmed.",
          "On Hold is commonly used when the order exists but payment or another check still needs confirmation, including Manual UPI verification.",
          "Processing means the order is confirmed and should move through packing/fulfilment.",
          "Completed means the order has finished the fulfilment workflow.",
          "Cancelled, Failed and Refunded describe orders that should not continue through normal fulfilment.",
        ],
      },
      {
        title: "17. New order workflow",
        points: [
          "Open Sales → Orders when a new order arrives.",
          "Check order number, customer, products, quantities, total, payment method and payment/order status before packing.",
          "For Manual UPI, do not treat an On Hold order as paid until you have verified the payment.",
          "For confirmed orders, prepare the items, download packing slips when useful, then continue with the selected fulfilment method.",
        ],
      },
      {
        title: "18. Find a specific order",
        points: [
          "Use the Orders search and filters to narrow by order information and status.",
          "The order tools support common searches such as order number, customer information, SKU and product details.",
          "Open the full order to review addresses, line items, payment information and shipment information before making an important status change.",
        ],
      },
      {
        title: "19. Bulk order actions",
        points: [
          "Select one or more orders in Sales → Orders to reveal bulk actions.",
          "Available bulk status actions include Processing, Completed, On Hold and Cancelled, plus moving selected orders to Trash.",
          "Use bulk status changes only when every selected order genuinely belongs in the same status.",
          "Packing-slip PDF generation also uses the selected orders.",
        ],
      },
      {
        title: "20. Customer handling from an order",
        points: [
          "Confirm the customer's name, phone, email, billing address and shipping address before dispatch.",
          "Use the order's stored customer details for fulfilment; do not copy customer data into unrelated systems unless it is required for the shipment or support case.",
          "If the customer needs an order update, use the built-in WhatsApp draft option or the store's normal transactional email workflow.",
        ],
      },
    ],
  },
  {
    id: "notifications",
    heading: "Notifications & customer communication",
    cards: [
      {
        title: "21. Enable new-order push notifications for the vendor",
        points: [
          "The dashboard can send new-order push alerts to a supported browser or installed LetzShopy PWA.",
          "When prompted, choose Enable order notifications and allow notification permission in the browser/phone settings.",
          "The feature is designed to alert you even when the installed PWA is closed.",
          "If notifications were blocked at browser or phone level, re-enable permission in device/browser settings before retrying.",
        ],
      },
      {
        title: "22. Send an order-status update through WhatsApp",
        points: [
          "Go to Sales → Orders and open the action menu for the required order.",
          "Choose Notify status in WhatsApp.",
          "LetzShopy creates a store-branded draft using the current order status and available order information such as order number, items, total and payment method.",
          "For completed orders with shipment information, the draft can also include shipment details.",
          "WhatsApp opens with the draft ready. Review it and press Send yourself; this is a vendor-triggered WhatsApp draft, not automatic WhatsApp API messaging.",
        ],
      },
      {
        title: "23. Customer transactional emails",
        points: [
          "The store's transactional email system sends customer-facing order emails according to the configured WooCommerce order workflow.",
          "When shipment information exists and the order completes, LetzShopy adds customer-safe shipment details to the completed-order email.",
          "Shipment information can include courier, tracking number, shipped date and a Track Shipment link when available.",
          "Before relying on email alone, keep the customer's email correct on the order and test live delivery during onboarding/launch.",
        ],
      },
      {
        title: "24. Recent Order Notification on the storefront",
        points: [
          "This feature is social proof shown to storefront visitors; it is not the vendor's new-order push alert.",
          "Go to Settings → Website Setup → Enable recent order notifications.",
          "The feature uses genuine WooCommerce order information in a privacy-safe storefront notification.",
          "You control whether the feature is enabled; LetzShopy manages its visual design, position and timing.",
        ],
      },
      {
        title: "25. Know which notification you are using",
        points: [
          "Vendor Push Notification — alerts you that a new order arrived.",
          "WhatsApp Status Draft — lets you manually send an order update to the customer.",
          "Transactional Email — store-generated order email to the customer.",
          "Recent Order Notification — privacy-safe social proof displayed to storefront visitors.",
          "These channels have different purposes, so enabling one does not automatically enable all the others.",
        ],
      },
    ],
  },
  {
    id: "payments",
    heading: "Payments",
    cards: [
      {
        title: "26. Payment methods available to your store",
        points: [
          "Open Settings → Payments to review the payment methods available for the connected store.",
          "Current supported dashboard methods include PayGlocal online payments, Manual UPI, Direct Bank Transfer and Cash on Delivery.",
          "Enable only the methods your business has approved and can fulfil correctly.",
          "After changing payment settings, perform a real checkout test for each enabled method before promoting the store.",
        ],
      },
      {
        title: "27. How PayGlocal online payment works",
        points: [
          "PayGlocal is the online gateway option managed through LetzShopy's integration.",
          "Gateway credentials and technical secrets are managed securely by LetzShopy and are not exposed in the vendor dashboard.",
          "A successful gateway flow is designed to confirm payment and update the WooCommerce order automatically.",
          "Use the order's Payment Information or Sales → Payments to inspect payment information instead of relying only on a customer screenshot.",
        ],
      },
      {
        title: "28. Read PayGlocal payment information",
        points: [
          "PayGlocal orders can expose live gateway information in the dashboard.",
          "Key fields include the PayGlocal GID, provider status, friendly payment status, reason code and identity check where returned by the gateway.",
          "The dashboard also shows the WooCommerce order status so you can compare gateway payment state with store order state.",
          "Use Refresh when you need to request the latest available gateway status.",
        ],
      },
      {
        title: "29. PayGlocal settlement time and charges",
        points: [
          "Gateway transaction charges, GST on gateway fees and settlement timing are commercial terms and can change based on the approved PayGlocal merchant arrangement.",
          "Use the latest PayGlocal/LetzShopy commercial communication for the exact transaction fee and settlement cycle applicable to your store.",
          "Do not assume a generic T+1/T+2 settlement or a percentage shown in an old document unless it matches your current approved terms.",
          "If the expected settlement is missing after the applicable settlement window, keep the order number, PayGlocal GID, amount and payment date ready and contact support.",
        ],
      },
      {
        title: "30. Set up Manual UPI",
        points: [
          "Open Settings → Payments → Manual UPI.",
          "Configure the UPI ID, UPI payment/mobile number, payee name and payment time limit used for checkout.",
          "Upload the approved QR image when QR is enabled and add clear customer instructions.",
          "Save the settings, refresh them and complete a test checkout to confirm that the customer sees the intended UPI information.",
        ],
      },
      {
        title: "31. Verify a Manual UPI payment",
        points: [
          "Manual UPI orders normally remain On Hold until the vendor verifies payment.",
          "Open the UPI payment/order information and review the transaction number or UTR.",
          "If payment proof is required for that order, open and review the protected proof before verification.",
          "Choose Verify & Confirm Payment only after you have genuinely checked the payment.",
          "Verification completes the payment record and moves the order into the configured successful order flow, normally ready for fulfilment.",
          "The system blocks verification when required transaction details or proof are missing.",
        ],
      },
      {
        title: "32. Direct Bank Transfer and Cash on Delivery",
        points: [
          "Bank Transfer settings include account holder, account number, IFSC, bank, branch and customer instructions.",
          "COD lets the customer place the order for payment at delivery and supports a customer-facing instruction.",
          "For both methods, understand that order status and actual money receipt are separate checks; update the order only when the business event has really happened.",
        ],
      },
      {
        title: "33. Customer says PayGlocal succeeded but order is not Processing",
        points: [
          "Open the order and compare Payment Status, live PayGlocal status and Woo order status.",
          "Record the order number, amount, PayGlocal GID, provider status, reason code and approximate payment time.",
          "Do not manually mark the order paid only because the customer shows a success screen if the gateway/store state is still inconsistent.",
          "Refresh the live status once; if the state remains inconsistent, open a support ticket with the collected evidence.",
        ],
      },
    ],
  },
  {
    id: "shipping",
    heading: "Shipping, fulfilment & packing",
    cards: [
      {
        title: "34. Choose Shift Logistics or Self Shipping",
        points: [
          "Open Settings → Shipping & Delivery → Delivery Setup.",
          "Shift Logistics uses the LetzShopy shipment-booking flow with the saved pickup information where that service is available.",
          "Self Shipping means you use your own courier and later enter the courier and tracking information in the dashboard.",
          "Choose the mode that matches your real fulfilment process before processing live orders.",
        ],
      },
      {
        title: "35. Self Shipping — end-to-end workflow",
        points: [
          "Start with a confirmed Processing order.",
          "Prepare the product and use the order's shipping address or packing slip for packing/dispatch.",
          "Book the shipment with your preferred courier and obtain the courier name and tracking number.",
          "Open Sales → Shipment Details and choose Add Details for the order.",
          "Enter courier name and tracking number. Add the tracking URL when the courier provides a valid http/https tracking link.",
          "Save only after dispatch details are correct. The current Shipment Details workflow marks the order Completed after a successful save.",
        ],
      },
      {
        title: "36. Download packing slips / address printouts",
        points: [
          "Go to Sales → Orders and select the order or orders you want to pack.",
          "On desktop, choose Download Pack Slips. On mobile, the selected-order action bar shows the Slip action.",
          "The dashboard generates the packing-slip PDF for the selected orders.",
          "Use the slip for packing and address handling, then verify the address again before handing the parcel to the courier.",
        ],
      },
      {
        title: "37. Configure the Packing Slip Sender / Return Address",
        points: [
          "Open Settings → Shipping & Delivery → Delivery Setup → Self Shipping.",
          "Under Packing Slip Sender Address, choose whether to use the Store Profile address or another sender/return address.",
          "If you choose another address, enter the complete address that should print on self-shipping packing slips.",
          "Save and generate a test packing slip before using it for real dispatches.",
        ],
      },
      {
        title: "38. Add shipment information",
        points: [
          "Sales → Shipment Details shows Processing orders that are ready for courier information.",
          "Courier Name is required.",
          "Tracking Number is required.",
          "Tracking Link is optional but, when entered, it must be a valid http or https URL.",
          "After saving, the order is marked Completed by the current shipment workflow, so verify the details before pressing Save.",
        ],
      },
      {
        title: "39. What the customer receives after shipment",
        points: [
          "When a completed order has shipment metadata, LetzShopy can add the shipment information to the customer's completed-order email.",
          "The email can show Courier, Tracking Number, Shipped Date and a Track Shipment button/link when those values are available.",
          "You may also send a WhatsApp status draft from the Orders action menu when you want an additional direct customer update.",
        ],
      },
      {
        title: "40. Shipping charge setup",
        points: [
          "Settings → Shipping & Delivery → Shipping Charges supports Free Shipping and weight-based shipping rules.",
          "Free Shipping can apply to the whole store or selected categories.",
          "Weight-based shipping uses zones/regions and weight slabs, with optional category-specific overrides.",
          "Test representative customer addresses and product weights before launch so checkout charges match your policy.",
        ],
      },
    ],
  },
  {
    id: "offers",
    heading: "Offers & discounts",
    cards: [
      {
        title: "41. Understand the three promotion methods",
        points: [
          "Sale Event changes sale pricing or shipping behaviour for selected categories/products during a date range.",
          "Automatic Coupon Offer applies when its eligibility conditions pass; the customer does not need to type the internal managed code.",
          "Welcome Offer is intended for the first eligible customer order within its validity rules.",
          "Independent eligible discounts can stack when their configured rules allow them.",
        ],
      },
      {
        title: "42. Create a Sale Event",
        points: [
          "Open Offers & Discounts → Offer Sale and create a new offer.",
          "Enter the offer title, start date and end date. Status becomes Scheduled, Live or Ended automatically from these dates.",
          "Choose categories and/or individual products to define the products affected by the event.",
          "Choose the pricing method, review the price preview where available, decide Homepage Visibility and review Promotional Copy before creating.",
        ],
      },
      {
        title: "43. Sale Event pricing methods",
        points: [
          "Percentage Discount — reduces eligible prices by the entered percentage.",
          "Fixed Amount Discount — reduces eligible prices by the entered rupee amount.",
          "Manual Sale Price — lets you enter the intended sale price per selected product.",
          "Free Shipping — keeps regular product prices and gives eligible event products free shipping while the offer is live.",
          "Always check the preview and the storefront before promoting the sale.",
        ],
      },
      {
        title: "44. Choose categories, products and exclusions",
        points: [
          "Category selection is useful when a whole product family should participate in an offer.",
          "Product selection is useful for specific items or for fine-tuning category selection.",
          "Review the effective product count before saving so the offer does not accidentally include or exclude the wrong products.",
        ],
      },
      {
        title: "45. Generate and edit promotional/ad copy",
        points: [
          "Sale Event Promotional Copy is generated from the offer name, selected categories, discount method/value and dates.",
          "The text is editable, so correct the wording to match your business voice before using it.",
          "Choose Regenerate to cycle to another prepared copy variation when you want an alternative.",
          "The generated copy is a convenience for promotion; confirm the real offer conditions before posting the text to Instagram, WhatsApp or other channels.",
        ],
      },
      {
        title: "46. Homepage visibility and customer display",
        points: [
          "Enable Homepage Visibility only when the offer should appear in the storefront Current Offers area while live.",
          "Sale Event, Coupon Offer and Welcome Offer can have different customer journeys, so review the CTA destination and checkout behaviour.",
          "Checkout should clearly reflect eligible discounts; internal managed coupon codes should not be treated as public promo codes.",
        ],
      },
      {
        title: "47. Test an offer before advertising it",
        points: [
          "Use a representative product/cart and confirm the offer is Scheduled or Live when expected.",
          "Check product price, cart discount, shipping effect and checkout total.",
          "Test minimum-order, usage, expiry and eligibility rules where relevant.",
          "Only publish the promotion externally after the storefront and checkout show the intended result.",
        ],
      },
    ],
  },
  {
    id: "content-social-proof",
    heading: "Shoppable videos & customer feedback",
    cards: [
      {
        title: "48. Add a Shoppable Video",
        points: [
          "Open Shoppable Videos and choose Add Video.",
          "Select a supported MP4 video. The dashboard validates the selected file before upload.",
          "Tag at least one product or category; a video cannot be published with no shoppable destination.",
          "Add a thumbnail/cover when you want a controlled preview image, then publish.",
          "Newest videos appear first on the dashboard/storefront flow.",
        ],
      },
      {
        title: "49. Edit or replace a Shoppable Video",
        points: [
          "Open the video editor to update the title, replace the MP4, replace/remove the thumbnail or change tagged products/categories.",
          "Out-of-stock products may be unavailable for new tagging, so keep tags connected to products customers can actually buy.",
          "Save and then verify the storefront video card and its linked shopping destinations.",
        ],
      },
      {
        title: "50. Shoppable Video lifecycle",
        points: [
          "The storefront runtime manages the shoppable video section and keeps the newest content prioritized.",
          "The platform also has lifecycle/retention behaviour for managed videos, so do not use the video area as permanent raw-file storage.",
          "Delete a video only when it should be removed from both the dashboard-managed list and storefront experience.",
        ],
      },
      {
        title: "51. Add Customer Feedback",
        points: [
          "Open Sales → Customer Feedback and choose Add Feedback.",
          "You may link an existing order or continue without an order.",
          "Linking an order can fill customer details automatically, after which you add the feedback message and optional image.",
          "Use a genuine customer message and do not create misleading testimonials.",
        ],
      },
      {
        title: "52. Show or Hide Customer Feedback",
        points: [
          "Show makes the feedback available to the storefront feedback section.",
          "Hide keeps the feedback in the dashboard only.",
          "You can edit the content later or delete the feedback completely when it should no longer be retained.",
          "After changing visibility, check the storefront section when you need to confirm the customer-facing result.",
        ],
      },
    ],
  },
  {
    id: "settings",
    heading: "Settings — field guide",
    cards: [
      {
        title: "53. Profile & Account — what each area is for",
        points: [
          "Personal Contact: owner/contact name, mobile, personal email and address used for business/account communication.",
          "Business Profile: business/store name, business phone/email/address, business type and brand tagline used as the store identity source.",
          "Customer Contact & Social: Instagram, Facebook, YouTube and Customer WhatsApp used for supported customer-facing contact/social areas.",
          "Product Categories describes the main product families for the business profile/onboarding context.",
          "Account Contact and Login Email control account communication and login identity. Use Access & Security to change the dashboard password.",
        ],
      },
      {
        title: "54. Store Settings — display, measurements and stock",
        points: [
          "Currency and Price Decimals control how product prices are represented.",
          "Reviews Enabled controls product-review availability where supported by the storefront.",
          "Weight Unit and Dimensions Unit must match the units you use while creating products and shipping rules.",
          "Manage Stock enables stock tracking. Low-stock / no-stock alerts and Alert Email help the business react before items sell out.",
          "Low-stock Threshold determines when stock becomes low; Stock Display controls how stock is presented; Hide Out-of-Stock removes unavailable products from normal catalogue browsing.",
        ],
      },
      {
        title: "55. Store Settings — GST / Tax fields",
        points: [
          "Enable GST only when your business should calculate GST for store orders.",
          "Product Prices tells the system whether entered prices include tax or exclude tax.",
          "Calculate Tax From controls the address basis used by the store's tax calculation.",
          "Storefront Price Display and Checkout Price Display control whether customers see tax-inclusive or tax-exclusive pricing in those locations.",
          "Store State supports place-of-supply behaviour. GSTIN, GST Slab, Legal Name and Trade/Brand Name should match your business/tax setup.",
          "If you are unsure about tax treatment, confirm with your tax professional before enabling GST rules.",
        ],
      },
      {
        title: "56. Shipping & Delivery — Shipping Charges fields",
        points: [
          "Free Shipping can be enabled for all products or selected categories.",
          "Weight-Based Shipping — All Categories defines zones/regions and weight slabs that apply broadly.",
          "Weight-Based Shipping — Specific Categories creates category-level overrides when some products need different shipping.",
          "Zone Name is your internal label; Regions control where the rule applies; slab weights/prices determine the charge.",
          "Save and test with representative customer addresses before relying on the rule in production.",
        ],
      },
      {
        title: "57. Shipping & Delivery — Delivery Setup fields",
        points: [
          "Choose Shift Logistics when using the supported LetzShopy booking workflow and pickup information.",
          "Choose Self Shipping when you book your own courier and later enter tracking information in Sales → Shipment Details.",
          "Pickup Contact, Phone and Address fields are used by the supported fulfilment flow.",
          "Packing Slip Sender Address controls the From/Return address printed on self-shipping packing slips.",
        ],
      },
      {
        title: "58. Payments — field guide",
        points: [
          "PayGlocal: online gateway; credentials/integration remain LetzShopy-managed.",
          "Manual UPI: UPI ID, payment number, payee name, payment time limit, QR option and customer instructions.",
          "Bank Transfer: account holder, account number, IFSC, bank, branch and customer instructions.",
          "Cash on Delivery: enable/disable and enter the customer-facing COD instruction.",
          "A saved setting is not enough—complete a checkout test for every method you enable.",
        ],
      },
      {
        title: "59. Website Setup — field guide",
        points: [
          "Topbar Message controls the store announcement text used by the storefront topbar.",
          "Homepage section controls include New Arrivals, Our Collections, Best Sellers, Offer Sale and Customer Feedback.",
          "Enable Recent Order Notifications controls the privacy-safe storefront social-proof notification feature.",
          "Brand Story supports About-page content; Approximate Number of Products and Expected Dispatch Time support store planning/customer expectations.",
          "Return, Exchange & Refund inputs cover eligibility, request window, unboxing-video requirement, return-shipping responsibility, pickup, refund time/method and return address.",
          "Cancellation inputs define whether cancellation is allowed, its time window, post-dispatch handling and any special policy rules.",
        ],
      },
      {
        title: "60. KYC — details, documents and status",
        points: [
          "Identity details include PAN, Aadhaar/ID and GST information where applicable.",
          "Bank details include account holder, bank, account number confirmation, IFSC and branch.",
          "Document uploads include PAN Card, Aadhaar/ID Proof, GST Certificate where applicable and Cancelled Cheque.",
          "KYC moves through statuses such as Not Started, In Review, Approved or Rejected depending on the review flow.",
          "Upload only genuine documents belonging to the business/owner and use the dashboard's protected upload flow.",
        ],
      },
    ],
  },
  {
    id: "subscription",
    heading: "Subscription, KYC & billing",
    cards: [
      {
        title: "61. Trial, KYC and first subscription activation",
        points: [
          "New vendor onboarding normally begins with a 7-day trial.",
          "Complete the required business/KYC information and use the trial to validate operations.",
          "Subscription activation/payment status is handled through the dashboard and LetzShopy verification workflow rather than by editing store settings manually.",
        ],
      },
      {
        title: "62. Subscription renewal reminders",
        points: [
          "The current subscription policy has reminder points at 7 days before renewal, 3 days before renewal and the due date.",
          "The dashboard can show an upcoming/due renewal notice with a link to Billing → Subscription.",
          "Do not wait until the last day when your business depends on the storefront; submit renewal payment/reference early enough for verification.",
        ],
      },
      {
        title: "63. What happens when renewal is overdue",
        points: [
          "The current policy gives a 5-day grace period after the renewal due date.",
          "During grace, the dashboard warns that payment must be completed to avoid dashboard and storefront suspension.",
          "After the grace period, an expired/suspended subscription uses restricted dashboard access, storefront suspension and disabled checkout.",
          "Restricted vendors are directed to subscription/settings/billing areas needed to resolve access rather than normal day-to-day business modules.",
        ],
      },
      {
        title: "64. Submit subscription payment / UTR",
        points: [
          "Open Billing → Subscription and review the current plan/cycle/status shown for your store.",
          "When payment submission is required, enter the valid transaction/UTR reference and submit it through the subscription page.",
          "Payment Submitted means the reference is awaiting LetzShopy verification; it does not mean you should create another payment immediately.",
          "After verification/activation, the subscription page should reflect the active status and next renewal date.",
        ],
      },
      {
        title: "65. Subscription invoices",
        points: [
          "Open Subscription Invoices to view paid subscription billing records available to your vendor account.",
          "Open an invoice to review the service, amount/date/cycle details and use its Print/PDF actions when needed.",
          "Keep subscription invoices separate from Order Invoices, which belong to customer sales orders.",
        ],
      },
      {
        title: "66. Domain renewal is a separate service",
        points: [
          "Domain renewal is separate from the normal LetzShopy subscription and can have its own domain, annual amount, renewal date, payment status and invoice.",
          "Paying or missing domain renewal should not be confused with the regular platform subscription lifecycle.",
          "Follow the domain-specific notice and payment-reference workflow when a domain renewal action appears.",
        ],
      },
    ],
  },
  {
    id: "reports",
    heading: "Reports & analytics",
    cards: [
      {
        title: "67. Reports overview",
        points: [
          "Reports converts operational store data into business views for Orders, Customers, Stock and Website Analytics.",
          "Use filters/date ranges before comparing periods so you are looking at the same business window.",
          "Reports are decision-support tools; verify important financial/payment questions against the underlying orders/payment records.",
        ],
      },
      {
        title: "68. Orders Report — what to look for",
        points: [
          "Use Orders reporting to understand sales/order movement across the selected period and supported groupings such as product/category.",
          "Review values such as gross sales, order count, items, shipping and refunds where shown.",
          "Use the report to identify strong products/categories and unusual refund/shipping patterns, then open the underlying orders when you need operational detail.",
        ],
      },
      {
        title: "69. Customers Report — what to look for",
        points: [
          "Customer reporting helps you understand the customer base and order activity.",
          "Compare registered and guest customer behaviour where shown.",
          "Use it to spot repeat-customer opportunities, but use the Customers module for individual customer details and order history.",
        ],
      },
      {
        title: "70. Stock Report — what to look for",
        points: [
          "Review product counts and stock states such as In Stock, Low Stock and Out of Stock.",
          "Low-stock items should be checked before running an offer that could increase demand.",
          "Use Catalog/Inventory or Product editing for the actual stock correction after the report identifies a problem.",
        ],
      },
      {
        title: "71. Website Analytics — understand the metrics",
        points: [
          "Live Users shows current/recent active traffic when realtime analytics is available.",
          "Active Users, Page Views, Sessions and Events describe different kinds of website activity and should not be treated as the same metric.",
          "Top Pages and Top Category Views help identify what visitors are browsing.",
          "Device Split shows how traffic is distributed across device types; this is especially useful when evaluating mobile shopping behaviour.",
          "Use Refresh when you need the latest available analytics response.",
        ],
      },
      {
        title: "72. A simple weekly reporting routine",
        points: [
          "Check Orders: sales/order movement and refunds.",
          "Check Stock: low-stock and out-of-stock products before promotions.",
          "Check Customers: guest/registered activity and repeat opportunities.",
          "Check Website Analytics: traffic, top pages/categories and device mix.",
          "Write down one action from the data—for example restock a popular item, improve a high-traffic page or promote a strong category.",
        ],
      },
    ],
  },
  {
    id: "website",
    heading: "Website & customer experience",
    cards: [
      {
        title: "73. Control homepage sections",
        points: [
          "Open Settings → Website Setup to review supported homepage section controls.",
          "New Arrivals, Our Collections, Best Sellers, Offer Sale and Customer Feedback can be part of the storefront presentation depending on the template/runtime.",
          "Change only the sections that are useful to your store and verify the mobile storefront after saving.",
        ],
      },
      {
        title: "74. Topbar announcement message",
        points: [
          "Use Website Setup → Topbar Message for short store announcements such as a shipping message or campaign line.",
          "Keep the message short enough to remain understandable while scrolling in the storefront ticker.",
          "Do not use the topbar as a replacement for full return, shipping or payment policy content.",
        ],
      },
      {
        title: "75. Store policies and dispatch expectations",
        points: [
          "Website Setup collects structured inputs for dispatch time, returns, exchanges, refunds and cancellations.",
          "Use values that reflect your real operating policy; the customer experience becomes difficult when the website promises something the business cannot fulfil.",
          "Review return address, refund time, cancellation window and special rules after any operational policy change.",
        ],
      },
      {
        title: "76. Test the customer journey after important changes",
        points: [
          "After changes to payments, shipping, tax, menu, offers or major website settings, test the storefront rather than assuming the save alone is enough.",
          "Check mobile navigation, product page, cart, shipping charge, payment methods, checkout total, order creation and customer communication.",
          "For payment/shipping changes, use a realistic address and product because rules can depend on location, weight, category or payment method.",
        ],
      },
    ],
  },
  {
    id: "troubleshooting",
    heading: "Troubleshooting & support",
    cards: [
      {
        title: "77. Product or category is not showing",
        points: [
          "Product: check Publish/Draft, Visible/Hidden, price, stock and category.",
          "Category navigation: confirm the category exists, then check Menu Layout because a category does not automatically become a menu link.",
          "After a menu change, save the menu and verify the actual storefront on desktop and mobile.",
        ],
      },
      {
        title: "78. New-order notification did not arrive",
        points: [
          "Confirm notifications were enabled in the LetzShopy dashboard prompt.",
          "Check browser/phone notification permission and make sure notifications are not blocked for the installed PWA/browser.",
          "Open the dashboard with a stable connection and retry the notification setup/test flow when available.",
          "If the problem continues, include device model, browser/PWA, screenshot of permission state and an example order number in the support ticket.",
        ],
      },
      {
        title: "79. WhatsApp status action is missing or cannot open",
        points: [
          "The WhatsApp action depends on a usable customer phone number on the order.",
          "Use the Orders action menu and choose Notify status in WhatsApp.",
          "If the customer number is missing or invalid, correct the order/customer contact details before retrying.",
          "Remember that LetzShopy prepares the draft; WhatsApp itself must open successfully for you to send it.",
        ],
      },
      {
        title: "80. Manual UPI cannot be verified",
        points: [
          "Confirm the order uses the Manual UPI payment method and is still awaiting verification.",
          "Check that a valid transaction number/UTR exists.",
          "If the order requires payment proof, confirm the proof was uploaded and can be opened.",
          "The system intentionally blocks verification when the required evidence is missing.",
        ],
      },
      {
        title: "81. Shipment cannot be saved",
        points: [
          "Courier Name and Tracking Number are mandatory in Shipment Details.",
          "If you entered a tracking link, it must be a valid http/https URL.",
          "Only proceed when the order is genuinely dispatched because successful save marks the order Completed in the current workflow.",
        ],
      },
      {
        title: "82. Shoppable Video or Feedback is not visible",
        points: [
          "Shoppable Video: verify publish succeeded and the video still has at least one valid tagged product/category.",
          "Customer Feedback: verify its visibility is set to Show rather than Hide.",
          "For both, refresh the storefront after the dashboard save and verify the relevant homepage/storefront section is enabled.",
        ],
      },
      {
        title: "83. Dashboard is restricted",
        points: [
          "Check Billing → Subscription for trial, renewal, grace, expired or suspended state.",
          "An expired/suspended subscription can restrict normal dashboard modules and suspend storefront/checkout according to the current access policy.",
          "Submit the required payment/reference or follow the displayed subscription action rather than repeatedly logging in/out.",
        ],
      },
      {
        title: "84. What to include in a support ticket",
        points: [
          "Store URL and the dashboard page where the issue occurs.",
          "Order number, product name/SKU, payment GID/UTR or other record ID when relevant.",
          "A screenshot or short screen recording showing the problem and any visible message.",
          "What you expected, what actually happened and the approximate time of the event.",
          "Do not send passwords, OTPs, gateway secrets or other credentials in the ticket description.",
        ],
      },
    ],
  },
];

function Article({
  title,
  points,
}: KBCard) {
  return (
    <details className="group rounded-xl border border-border bg-card md:rounded-2xl">
      <summary className="ls-focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-3 text-left md:rounded-2xl md:px-4">
        <span className="text-sm font-bold leading-5 text-heading">
          {title}
        </span>

        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-border px-3 pb-3 pt-3 md:px-4 md:pb-4">
        <ul className="space-y-2 text-sm leading-6 text-foreground">
          {points.map((point) => (
            <li
              key={point}
              className="flex gap-2.5"
            >
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function KnowledgeBasePage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Support"
        icon={BookOpen}
        title="Knowledge Base"
        description="Step-by-step operating guides for your LetzShopy store and business dashboard."
      />

      <div className="space-y-5 md:mt-5 md:space-y-7">
        <section className="rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-5">
          <div>
            <h2 className="text-base font-extrabold text-heading md:text-lg">
              What do you need help with?
            </h2>
            <p className="mt-1 hidden text-sm text-muted-foreground md:block">
              Jump directly to the most common vendor tasks.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {QUICK_ACTIONS.map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="ls-focus-ring flex min-h-12 items-center rounded-xl border border-border bg-surface-soft px-3 py-2.5 text-sm font-bold leading-5 text-heading transition hover:border-primary/30 hover:bg-secondary"
              >
                {action.label}
              </a>
            ))}
          </div>
        </section>

        <nav
          aria-label="Knowledge base topics"
          className="touch-scroll -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={"#" + section.id}
              className="ls-focus-ring inline-flex min-h-10 shrink-0 items-center rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground hover:bg-muted"
            >
              {section.heading}
            </a>
          ))}
        </nav>

        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 space-y-2.5 md:space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-heading md:text-lg">
                {section.heading}
              </h2>

              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                {section.cards.length}
              </span>
            </div>

            <div className="grid gap-2 md:grid-cols-2 md:gap-3">
              {section.cards.map((card) => (
                <Article
                  key={card.title}
                  {...card}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
