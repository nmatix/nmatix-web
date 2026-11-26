"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import RequireAuth from "./RequireAuth";

/**
 * Renders children only for platform admins (#29, #133). This only decides what the page
 * shows: every admin API call is checked on the server (authz.require_admin, #23).
 */
export default function RequireAdmin({ children }) {
  return (
    <RequireAuth>
      <AdminGate>{children}</AdminGate>
    </RequireAuth>
  );
}

function AdminGate({ children }) {
  const { user } = useAuth();
  if (!user?.isAdmin) {
    return (
      <section className="registration-card" aria-labelledby="admin-denied-title">
        <h1 id="admin-denied-title">Not available</h1>
        <p>This area is only for Nmatix admins.</p>
        <Link href="/dashboard/">Back to your dashboard</Link>
      </section>
    );
  }
  return children;
}
