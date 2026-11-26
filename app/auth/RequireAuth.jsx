"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

/** Renders children only for a signed-in user; others are sent to the login page. */
export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signedOut") router.replace("/login/");
  }, [status, router]);

  if (status !== "signedIn") {
    return (
      <p className="auth-loading" role="status" aria-live="polite">
        {status === "loading" ? "Loading your account..." : "Redirecting to login..."}
      </p>
    );
  }
  return children;
}
