"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { appRequest, getJson, postJson } from "../signup/authApi";

/**
 * Session state for the whole site (#130).
 *
 * - The id token lives only in memory (never in storage) and is sent as
 *   X-Session-Token; API Gateway's Cognito authorizer checks it.
 * - The refresh token is an HttpOnly cookie set by the auth API; this code never sees
 *   it. POST /auth/session/refresh exchanges it for a new id token.
 * - A non-secret hint in localStorage ("signed in on this browser") decides whether a
 *   page load should try to restore the session, so anonymous visitors make no call.
 *
 * status: "loading" | "signedIn" | "signedOut"
 */

const AuthContext = createContext(null);
export const SIGNED_IN_HINT = "nmx.signedIn";
const REFRESH_EARLY_SECONDS = 60;
const MIN_REFRESH_DELAY_SECONDS = 30;

function readHint() {
  try {
    return window.localStorage.getItem(SIGNED_IN_HINT) === "1";
  } catch {
    return false;
  }
}

function writeHint(on) {
  try {
    if (on) window.localStorage.setItem(SIGNED_IN_HINT, "1");
    else window.localStorage.removeItem(SIGNED_IN_HINT);
  } catch {
    // Storage blocked: the session still works for this page view
  }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null });
  const tokenRef = useRef(null);
  const timerRef = useRef(null);
  const refreshRef = useRef(null);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    clearTimeout(timerRef.current);
    writeHint(false);
    setState({ status: "signedOut", user: null });
  }, []);

  const scheduleRefresh = useCallback((expiresIn) => {
    clearTimeout(timerRef.current);
    const delay = Math.max(
      MIN_REFRESH_DELAY_SECONDS,
      Number(expiresIn || 0) - REFRESH_EARLY_SECONDS
    );
    timerRef.current = setTimeout(() => refreshRef.current?.(), delay * 1000);
  }, []);

  // New id token from the session cookie. Returns true when the session is still valid.
  const refresh = useCallback(async () => {
    try {
      const { ok, data } = await postJson("session/refresh", {});
      if (!ok || !data.idToken) {
        clearSession();
        return false;
      }
      tokenRef.current = data.idToken;
      scheduleRefresh(data.expiresIn);
      return true;
    } catch {
      return false; // network blip: keep the current state and try again later
    }
  }, [clearSession, scheduleRefresh]);
  // The refresh timer calls the latest refresh(); keep the ref current outside render
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Sends a request with the session token; refreshes the token once on 401.
  const withSession = useCallback(
    async (send) => {
      const headers = () => ({ "X-Session-Token": tokenRef.current || "" });
      let result = await send(headers());
      if (result.status === 401 && (await refresh())) result = await send(headers());
      if (result.status === 401) clearSession();
      return result;
    },
    [refresh, clearSession]
  );

  // An auth API route (/auth/*) with the session token.
  const authFetch = useCallback(
    (path, { method = "GET", body } = {}) =>
      withSession((headers) =>
        method === "GET" ? getJson(path, { headers }) : postJson(path, body, { headers })
      ),
    [withSession]
  );

  // A product API route (/app/*, #157) with the session token.
  const appFetch = useCallback(
    (path, { method = "GET", body } = {}) =>
      withSession((headers) => appRequest(path, { method, body, headers })),
    [withSession]
  );

  // Restore the session after a page load, only if this browser signed in before
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!readHint() || !(await refresh())) {
        if (!cancelled)
          setState((s) => (s.status === "loading" ? { status: "signedOut", user: null } : s));
        return;
      }
      const { ok, data } = await getJson("session", {
        headers: { "X-Session-Token": tokenRef.current },
      });
      if (cancelled) return;
      if (ok) setState({ status: "signedIn", user: data });
      else clearSession();
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, [refresh, clearSession]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const signIn = useCallback(
    (session) => {
      tokenRef.current = session.idToken;
      writeHint(true);
      scheduleRefresh(session.expiresIn);
      setState({ status: "signedIn", user: session.user });
    },
    [scheduleRefresh]
  );

  // Local preview only (no API, no tokens): see LoginFlow
  const signInPreview = useCallback((email) => {
    setState({
      status: "signedIn",
      user: {
        id: "preview",
        name: "Preview user",
        email,
        isAdmin: false,
        products: [],
        preview: true,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    const wasPreview = state.user?.preview;
    clearSession();
    if (!wasPreview) {
      try {
        await postJson("session/logout", {});
      } catch {
        // The cookie expires on its own; the local session is already gone
      }
    }
  }, [clearSession, state.user]);

  const value = useMemo(
    () => ({ ...state, signIn, signInPreview, signOut, authFetch, appFetch, refresh }),
    [state, signIn, signInPreview, signOut, authFetch, appFetch, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
