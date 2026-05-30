"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { useEffect } from "react";

export function useCustomer() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.customer.me, isAuthenticated ? {} : "skip");
  const ensure = useMutation(api.customer.ensureProfile);

  useEffect(() => {
    if (isAuthenticated && me === null) {
      ensure({}).catch(() => {});
    }
  }, [isAuthenticated, me, ensure]);

  return {
    me: me ?? null,
    clientId: (me?.clientId as string | undefined) ?? null,
    isAuthenticated,
    isLoading,
  };
}
