"use client";

import { createContext, useContext } from "react";

export type DashboardSubscription = {
  status: string;
  nextPaymentDate: string;
};

type SubscriptionContextValue = {
  subscription: DashboardSubscription | null;
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
});

export function SubscriptionProvider({
  subscription,
  children,
}: {
  subscription: DashboardSubscription | null;
  children: React.ReactNode;
}) {
  return (
    <SubscriptionContext.Provider value={{ subscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useDashboardSubscription() {
  return useContext(SubscriptionContext);
}