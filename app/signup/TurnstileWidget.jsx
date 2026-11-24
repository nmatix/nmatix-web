"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TURNSTILE_SCRIPT_URL, TURNSTILE_SITE_KEY } from "../../data/turnstile";

let scriptPromise = null;

// Load Cloudflare's script once per page, however many widgets mount.
export function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () =>
        window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing"));
      script.onerror = () => {
        scriptPromise = null; // allow a retry on the next mount
        reject(new Error("turnstile script failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Cloudflare Turnstile check. Reports state changes through onChange:
 *   { status: "pending" }            loading or checking
 *   { status: "ready", token }       passed; send token with the form
 *   { status: "error" }              could not load or run (the server decides)
 * Tokens are single use: call ref.current.reset() after every submission.
 */
const TurnstileWidget = forwardRef(function TurnstileWidget({ onChange, action }, ref) {
  const container = useRef(null);
  const widgetId = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetId.current !== null && window.turnstile) {
        onChangeRef.current({ status: "pending" });
        window.turnstile.reset(widgetId.current);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    onChangeRef.current({ status: "pending" });

    function renderWidget(turnstile) {
      if (cancelled || !container.current) return;
      widgetId.current = turnstile.render(container.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        theme: "dark",
        callback: (token) => onChangeRef.current({ status: "ready", token }),
        "expired-callback": () => onChangeRef.current({ status: "pending" }),
        "error-callback": () => {
          onChangeRef.current({ status: "error" });
        },
      });
    }

    if (window.turnstile) {
      // Script already on the page (e.g. returning to the form): render straight away
      renderWidget(window.turnstile);
    } else {
      loadTurnstile()
        .then(renderWidget)
        .catch(() => {
          if (!cancelled) onChangeRef.current({ status: "error" });
        });
    }
    return () => {
      cancelled = true;
      if (widgetId.current !== null && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [action]);

  return <div className="turnstile-widget" ref={container} />;
});

export default TurnstileWidget;
