"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useAccess } from "./useAccess";

export const PRODUCT = "interior-quote-generator";

const SetupContext = createContext(null);
const NOT_NEEDED = { status: "notNeeded", data: null };

/**
 * One-time setup status (GET /app/setup, #32, PRD 7.2 v0.6) for contractors with product
 * access. Loaded after login and when the tab becomes visible again, so a step finished
 * in another tab shows up. Users without the product (e.g. internal admins) have no setup.
 *
 * status: "notNeeded" | "loading" | "ready" | "error"; data: { steps, complete, startHere }
 */
export function SetupProvider({ children }) {
  const { status: authStatus, appFetch } = useAuth();
  const { hasProduct } = useAccess();
  const needed = authStatus === "signedIn" && hasProduct(PRODUCT);
  const [state, setState] = useState({ status: "loading", data: null });

  const fetchSetup = useCallback(async () => {
    try {
      const { ok, data } = await appFetch("setup");
      return ok ? { status: "ready", data } : { status: "error", data: null };
    } catch {
      return { status: "error", data: null };
    }
  }, [appFetch]);

  useEffect(() => {
    if (!needed) return undefined;
    let active = true;
    const reload = () => fetchSetup().then((next) => active && setState(next));
    reload();
    function onVisible() {
      if (document.visibilityState === "visible") reload();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [needed, fetchSetup]);

  const refresh = useCallback(() => fetchSetup().then(setState), [fetchSetup]);

  const value = needed ? { ...state, refresh } : { ...NOT_NEEDED, refresh };
  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>;
}

export function useSetup() {
  const value = useContext(SetupContext);
  if (!value) throw new Error("useSetup must be used inside <SetupProvider>");
  return value;
}

/** True only when we know setup is still to be finished. */
export function setupPending(setup) {
  return setup.status === "ready" && !setup.data?.complete;
}
