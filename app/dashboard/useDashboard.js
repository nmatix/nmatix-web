"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

const ERROR = { status: "error", data: null };

/**
 * Loads GET /app/dashboard (#157) and reloads it when the tab becomes visible again, so a
 * step completed in another tab shows up on return.
 */
export function useDashboard() {
  const { appFetch } = useAuth();
  const [state, setState] = useState({ status: "loading", data: null });

  const fetchDashboard = useCallback(async () => {
    try {
      const { ok, data } = await appFetch("dashboard");
      return ok ? { status: "ready", data } : ERROR;
    } catch {
      return ERROR;
    }
  }, [appFetch]);

  useEffect(() => {
    let active = true;
    const reload = () => fetchDashboard().then((next) => active && setState(next));
    reload();
    function onVisible() {
      if (document.visibilityState === "visible") reload();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchDashboard]);

  const retry = useCallback(() => {
    setState({ status: "loading", data: null });
    fetchDashboard().then(setState);
  }, [fetchDashboard]);

  return { ...state, retry };
}
