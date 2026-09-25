"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Link2Off,
  MessageSquareText,
  Search,
  UploadCloud,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";

import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  PageHeader,
} from "@/components/ui/page-header";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import {
  formatImageBytes,
  optimizeContentImageForUpload,
} from "@/lib/clientImageOptimizer";
import type {
  CustomerFeedback,
  FeedbackOrderOption,
} from "@/lib/customerFeedbackApi";

import type {
  FeedbackActionState,
} from "./actions";

type FeedbackFormAction = (
  previousState:
    FeedbackActionState,
  formData: FormData
) => Promise<FeedbackActionState>;

type Props = {
  orders:
    FeedbackOrderOption[];
  feedback?:
    CustomerFeedback | null;
  action:
    FeedbackFormAction;
  mode:
    | "create"
    | "edit";
};

const INITIAL_ACTION_STATE:
  FeedbackActionState = {
  status: "idle",
  message: "",
};

const textareaClass =
  "ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70";

export default function FeedbackFormClient({
  orders,
  feedback,
  action,
  mode,
}: Props) {
  const router =
    useRouter();

  const initialOrder =
    orders.find(
      (order) => {
        if (!feedback) {
          return false;
        }

        return (
          String(
            order.id
          ) ===
            String(
              feedback.order_id ||
                ""
            ) ||
          String(
            order.number
          ) ===
            String(
              feedback.order_number ||
                ""
            )
        );
      }
    ) || null;

  const [
    linkedOrderId,
    setLinkedOrderId,
  ] =
    useState(
      String(
        initialOrder?.id ||
          feedback?.order_id ||
          ""
      )
    );

  const [
    linkedOrderNumber,
    setLinkedOrderNumber,
  ] =
    useState(
      String(
        initialOrder?.number ||
          feedback?.order_number ||
          ""
      )
    );

  const [
    selectedOrder,
    setSelectedOrder,
  ] =
    useState<FeedbackOrderOption | null>(
      initialOrder
    );

  const [
    customerName,
    setCustomerName,
  ] =
    useState(
      feedback?.customer_name ||
        initialOrder?.customer_name ||
        ""
    );

  const [
    customerMobile,
    setCustomerMobile,
  ] =
    useState(
      feedback?.customer_mobile ||
        initialOrder?.customer_mobile ||
        ""
    );

  const [
    customerMessage,
    setCustomerMessage,
  ] =
    useState(
      feedback?.customer_message ||
        ""
    );

  const [
    visibility,
    setVisibility,
  ] =
    useState<
      "show" | "hide"
    >(
      feedback?.status ===
        "hide"
        ? "hide"
        : "show"
    );

  const [
    previewImage,
    setPreviewImage,
  ] =
    useState(
      feedback?.image_url ||
        ""
    );

  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<File | null>(
      null
    );

  const [
    selectedFileMessage,
    setSelectedFileMessage,
  ] =
    useState("");

  const [
    imagePreparing,
    setImagePreparing,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    orderPickerOpen,
    setOrderPickerOpen,
  ] =
    useState(false);

  const [
    orderQuery,
    setOrderQuery,
  ] =
    useState("");

  const formRef =
    useRef<HTMLFormElement>(
      null
    );

  const previewObjectUrlRef =
    useRef("");

  const initialSnapshotRef =
    useRef(
      JSON.stringify({
        linkedOrderId:
          String(
            initialOrder?.id ||
              feedback?.order_id ||
              ""
          ),
        linkedOrderNumber:
          String(
            initialOrder?.number ||
              feedback?.order_number ||
              ""
          ),
        customerName:
          feedback?.customer_name ||
          initialOrder?.customer_name ||
          "",
        customerMobile:
          feedback?.customer_mobile ||
          initialOrder?.customer_mobile ||
          "",
        customerMessage:
          feedback?.customer_message ||
          "",
        visibility:
          feedback?.status ===
            "hide"
            ? "hide"
            : "show",
      })
    );

  const currentSnapshot =
    useMemo(
      () =>
        JSON.stringify({
          linkedOrderId,
          linkedOrderNumber,
          customerName,
          customerMobile,
          customerMessage,
          visibility,
        }),
      [
        linkedOrderId,
        linkedOrderNumber,
        customerName,
        customerMobile,
        customerMessage,
        visibility,
      ]
    );

  const dirty =
    currentSnapshot !==
      initialSnapshotRef.current ||
    Boolean(
      selectedImage
    );

  const filteredOrders =
    useMemo(() => {
      const query =
        orderQuery
          .trim()
          .toLowerCase();

      if (!query) {
        return orders.slice(
          0,
          12
        );
      }

      return orders
        .filter(
          (order) =>
            order.number
              .toLowerCase()
              .includes(
                query
              ) ||
            order.customer_name
              .toLowerCase()
              .includes(
                query
              ) ||
            order.customer_mobile
              .toLowerCase()
              .includes(
                query
              )
        )
        .slice(0, 20);
    }, [
      orderQuery,
      orders,
    ]);

  useEffect(() => {
    return () => {
      if (
        previewObjectUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewObjectUrlRef.current
        );
      }
    };
  }, []);

  function chooseOrder(
    order:
      FeedbackOrderOption
  ) {
    setSelectedOrder(
      order
    );

    setLinkedOrderId(
      String(
        order.id
      )
    );

    setLinkedOrderNumber(
      String(
        order.number
      )
    );

    if (
      order.customer_name
    ) {
      setCustomerName(
        order.customer_name
      );
    }

    if (
      order.customer_mobile
    ) {
      setCustomerMobile(
        order.customer_mobile
      );
    }

    setOrderPickerOpen(
      false
    );
    setOrderQuery("");
  }

  function clearOrder() {
    setSelectedOrder(
      null
    );
    setLinkedOrderId("");
    setLinkedOrderNumber(
      ""
    );
  }

  async function handleImageChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const input =
      event.currentTarget;

    const file =
      input.files?.[0];

    input.value = "";

    if (!file) {
      return;
    }

    setImagePreparing(
      true
    );
    setSelectedImage(
      null
    );
    setSelectedFileMessage(
      ""
    );

    actionFeedback.loading({
      id:
        "feedback-image-prepare",
      title:
        "Preparing image…",
    });

    try {
      const optimization =
        await optimizeContentImageForUpload(
          file
        );

      const optimized =
        optimization.file;

      if (
        previewObjectUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewObjectUrlRef.current
        );
      }

      const previewUrl =
        URL.createObjectURL(
          optimized
        );

      previewObjectUrlRef.current =
        previewUrl;

      setSelectedImage(
        optimized
      );
      setPreviewImage(
        previewUrl
      );

      const message =
        optimization.optimized
          ? `Optimized ${formatImageBytes(
              optimization.originalBytes
            )} → ${formatImageBytes(
              optimization.outputBytes
            )}`
          : `${file.name} · ${formatImageBytes(
              file.size
            )}`;

      setSelectedFileMessage(
        message
      );

      actionFeedback.success({
        id:
          "feedback-image-prepare",
        title:
          "Image ready",
        durationMs: 1800,
      });
    } catch (
      error: unknown
    ) {
      setSelectedImage(
        null
      );
      setPreviewImage(
        feedback?.image_url ||
          ""
      );

      actionFeedback.error({
        id:
          "feedback-image-prepare",
        title:
          "Could not prepare image",
        message:
          error instanceof
            Error
            ? error.message
            : "Please choose another image.",
        durationMs: 4200,
      });
    } finally {
      setImagePreparing(
        false
      );
    }
  }

  function buildFormData() {
    const form =
      formRef.current;

    if (!form) {
      return null;
    }

    const formData =
      new FormData(
        form
      );

    formData.delete(
      "image"
    );

    if (
      selectedImage
    ) {
      formData.set(
        "image",
        selectedImage,
        selectedImage.name
      );
    }

    return formData;
  }

  async function saveFeedback(
    navigateAfter:
      boolean
  ): Promise<boolean> {
    if (
      saving ||
      imagePreparing
    ) {
      return false;
    }

    if (
      !customerName.trim()
    ) {
      actionFeedback.warning({
        id:
          "feedback-validation",
        title:
          "Enter customer name",
        durationMs: 2800,
      });
      return false;
    }

    if (
      !customerMessage.trim()
    ) {
      actionFeedback.warning({
        id:
          "feedback-validation",
        title:
          "Enter customer message",
        durationMs: 2800,
      });
      return false;
    }

    const formData =
      buildFormData();

    if (!formData) {
      return false;
    }

    const feedbackId =
      mode === "create"
        ? "feedback-create"
        : "feedback-update";

    setSaving(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        mode === "create"
          ? "Saving feedback…"
          : "Updating feedback…",
    });

    try {
      const result =
        await action(
          INITIAL_ACTION_STATE,
          formData
        );

      if (
        result.status !==
        "success"
      ) {
        throw new Error(
          result.message ||
            "Unable to save feedback."
        );
      }

      initialSnapshotRef.current =
        currentSnapshot;

      setSelectedImage(
        null
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          mode === "create"
            ? "Feedback added"
            : "Feedback updated",
        message:
          result.message,
        durationMs: 2200,
      });

      if (
        navigateAfter
      ) {
        router.replace(
          result.redirectTo ||
            "/sales/feedback"
        );
      }

      return true;
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save feedback",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void saveFeedback(
      true
    );
  }

  useUnsavedChanges({
    id:
      mode === "create"
        ? "feedback-create"
        : `feedback-edit-${feedback?.id || "item"}`,
    dirty,
    label:
      "customer feedback changes",
    save: () =>
      saveFeedback(
        false
      ),
  });

  const linkedOrderLabel =
    linkedOrderNumber
      ? `Order #${linkedOrderNumber}`
      : "";

  const busy =
    saving ||
    imagePreparing;

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl pb-28 md:pb-8">
      <Link
        href="/sales/feedback"
        className="mb-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-1 text-sm font-semibold text-muted-foreground hover:text-heading md:mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Feedback
      </Link>

      <PageHeader
        className="hidden md:flex"
        eyebrow="Sales · Customer Feedback"
        icon={
          MessageSquareText
        }
        title={
          mode === "create"
            ? "Add Customer Feedback"
            : "Edit Customer Feedback"
        }
        description="Link an order, add the customer message and control storefront visibility."
      />

      <div className="mb-3 md:hidden">
        <h1 className="text-[21px] font-extrabold tracking-tight text-heading">
          {mode === "create"
            ? "Add Feedback"
            : "Edit Feedback"}
        </h1>
      </div>

      <form
        ref={formRef}
        onSubmit={
          handleSubmit
        }
        encType="multipart/form-data"
        aria-busy={busy}
        className="space-y-4 md:mt-5"
      >
        {feedback?.id ? (
          <input
            type="hidden"
            name="id"
            value={
              feedback.id
            }
          />
        ) : null}

        <input
          type="hidden"
          name="order_id"
          value={
            linkedOrderId
          }
        />

        <input
          type="hidden"
          name="order_number"
          value={
            linkedOrderNumber
          }
        />

        <input
          type="hidden"
          name="status"
          value={
            visibility
          }
        />

        <section className="rounded-xl border border-border bg-card md:rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-5">
            <div>
              <h2 className="text-sm font-extrabold text-heading">
                Order
              </h2>
              <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">
                Optional. Linking an order can fill customer details automatically.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setOrderPickerOpen(
                  true
                )
              }
            >
              {linkedOrderNumber
                ? "Change"
                : "Choose order"}
            </Button>
          </div>

          <div className="p-3 md:p-5">
            {linkedOrderNumber ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-soft px-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-heading">
                    {
                      linkedOrderLabel
                    }
                  </div>

                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {selectedOrder?.customer_name ||
                      customerName ||
                      "Customer"}
                    {selectedOrder?.total
                      ? ` · ₹${Number(
                          selectedOrder.total
                        ).toLocaleString(
                          "en-IN"
                        )}`
                      : ""}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove order link"
                  onClick={
                    clearOrder
                  }
                >
                  <Link2Off className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setOrderPickerOpen(
                    true
                  )
                }
                className="ls-focus-ring flex min-h-12 w-full items-center justify-center rounded-xl border border-dashed border-border bg-surface-soft px-3 text-sm font-semibold text-muted-foreground hover:text-heading"
              >
                Choose an order or continue without one
              </button>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card md:rounded-2xl">
          <div className="border-b border-border px-3 py-3 md:px-5">
            <h2 className="text-sm font-extrabold text-heading">
              Customer feedback
            </h2>
          </div>

          <div className="grid gap-3 p-3 md:grid-cols-2 md:gap-4 md:p-5">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-heading">
                Customer name
                <span className="ml-1 text-destructive">
                  *
                </span>
              </label>

              <Input
                name="customer_name"
                value={
                  customerName
                }
                onChange={(
                  event
                ) =>
                  setCustomerName(
                    event.target
                      .value
                  )
                }
                required
                disabled={
                  busy
                }
                placeholder="Customer name"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-heading">
                Mobile number
              </label>

              <Input
                name="customer_mobile"
                value={
                  customerMobile
                }
                onChange={(
                  event
                ) =>
                  setCustomerMobile(
                    event.target
                      .value
                  )
                }
                disabled={
                  busy
                }
                inputMode="tel"
                placeholder="Customer mobile"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-heading">
                Customer message
                <span className="ml-1 text-destructive">
                  *
                </span>
              </label>

              <textarea
                name="customer_message"
                value={
                  customerMessage
                }
                onChange={(
                  event
                ) =>
                  setCustomerMessage(
                    event.target
                      .value
                  )
                }
                required
                disabled={
                  busy
                }
                rows={5}
                placeholder="Loved the product and delivery..."
                className={
                  textareaClass
                }
              />
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card md:rounded-2xl">
            <div className="border-b border-border px-3 py-3 md:px-5">
              <h2 className="text-sm font-extrabold text-heading">
                Feedback image
              </h2>
            </div>

            <div className="p-3 md:p-5">
              <input
                id="feedback-image-upload"
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={
                  handleImageChange
                }
                disabled={
                  busy
                }
                className="sr-only"
              />

              <label
                htmlFor="feedback-image-upload"
                className={[
                  "flex min-h-36 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-soft text-center transition md:min-h-44",
                  busy
                    ? "pointer-events-none opacity-60"
                    : "hover:border-primary",
                ].join(" ")}
              >
                {previewImage ? (
                  <div className="relative h-40 w-full md:h-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        previewImage
                      }
                      alt="Feedback preview"
                      className="h-full w-full object-cover"
                    />

                    <span className="absolute bottom-2 right-2 rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-[11px] font-bold text-white">
                      Change
                    </span>
                  </div>
                ) : (
                  <div className="px-4 py-6">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-card text-primary">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                    <div className="mt-2 text-sm font-bold text-heading">
                      Add image
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      JPG, PNG, WebP or GIF
                    </div>
                  </div>
                )}
              </label>

              <label
                htmlFor="feedback-image-upload"
                className="ls-focus-ring mt-2 inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-3 text-xs font-semibold text-secondary-foreground"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                {imagePreparing
                  ? "Preparing…"
                  : previewImage
                    ? "Replace Image"
                    : "Upload Image"}
              </label>

              {selectedFileMessage ? (
                <div className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-700">
                  {
                    selectedFileMessage
                  }
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card md:rounded-2xl">
            <div className="border-b border-border px-3 py-3 md:px-5">
              <h2 className="text-sm font-extrabold text-heading">
                Website visibility
              </h2>
            </div>

            <div className="space-y-3 p-3 md:p-5">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value:
                        "show",
                      label:
                        "Show",
                    },
                    {
                      value:
                        "hide",
                      label:
                        "Hide",
                    },
                  ] as const
                ).map(
                  (
                    option
                  ) => {
                    const active =
                      visibility ===
                      option.value;

                    return (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        onClick={() =>
                          setVisibility(
                            option.value
                          )
                        }
                        disabled={
                          busy
                        }
                        className={[
                          "ls-focus-ring flex min-h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-bold transition",
                          active
                            ? "border-primary bg-secondary text-secondary-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-muted",
                        ].join(
                          " "
                        )}
                      >
                        {active ? (
                          <Check className="h-4 w-4" />
                        ) : null}
                        {
                          option.label
                        }
                      </button>
                    );
                  }
                )}
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                Show makes this feedback available to the storefront feedback section. Hide keeps it in the dashboard only.
              </p>
            </div>
          </section>
        </div>

        <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-[0_12px_28px_rgba(38,51,95,0.12)] backdrop-blur md:rounded-2xl md:p-2.5">
            <div className="hidden px-1 sm:block">
              <div className="text-xs font-bold text-heading">
                {dirty
                  ? "Unsaved feedback changes"
                  : "All changes saved"}
              </div>
            </div>

            <AsyncButton
              type="submit"
              loading={
                busy
              }
              loadingLabel={
                imagePreparing
                  ? "Preparing…"
                  : mode ===
                      "create"
                    ? "Saving…"
                    : "Updating…"
              }
              className="w-full sm:w-auto"
              disabled={
                !dirty
              }
            >
              {mode === "create"
                ? "Save Feedback"
                : "Update Feedback"}
            </AsyncButton>
          </div>
        </div>
      </form>

      <BottomSheet
        open={
          orderPickerOpen
        }
        onOpenChange={
          setOrderPickerOpen
        }
        title="Choose order"
        description="Search by order number, customer name or mobile."
        popupClassName="md:mx-auto md:max-w-2xl"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={
                orderQuery
              }
              onChange={(
                event
              ) =>
                setOrderQuery(
                  event.target
                    .value
                )
              }
              className="pl-9"
              placeholder="Search orders"
              autoFocus
            />
          </div>

          <div className="max-h-[52dvh] space-y-1 overflow-y-auto overscroll-contain">
            {filteredOrders.length ? (
              filteredOrders.map(
                (order) => {
                  const active =
                    String(
                      order.id
                    ) ===
                    linkedOrderId;

                  return (
                    <button
                      key={
                        order.id
                      }
                      type="button"
                      onClick={() =>
                        chooseOrder(
                          order
                        )
                      }
                      className={[
                        "ls-focus-ring flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                        active
                          ? "border-primary bg-secondary"
                          : "border-transparent bg-card hover:bg-muted",
                      ].join(
                        " "
                      )}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-xs font-extrabold text-primary">
                        #
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-heading">
                          Order #
                          {
                            order.number
                          }
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {order.customer_name ||
                            "Customer"}
                          {order.customer_mobile
                            ? ` · ${order.customer_mobile}`
                            : ""}
                          {order.total
                            ? ` · ₹${Number(
                                order.total
                              ).toLocaleString(
                                "en-IN"
                              )}`
                            : ""}
                        </span>
                      </span>

                      {active ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                    </button>
                  );
                }
              )
            ) : (
              <div className="rounded-xl bg-surface-soft px-3 py-6 text-center text-sm text-muted-foreground">
                No matching orders.
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              clearOrder();
              setOrderPickerOpen(
                false
              );
            }}
          >
            Continue without order
          </Button>
        </div>
      </BottomSheet>
    </main>
  );
}
