"use client";

import NotAvailable from "./NotAvailable";
import RequireAuth from "./RequireAuth";
import { useAccess } from "./useAccess";

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
  const { isAdmin } = useAccess();
  if (!isAdmin) return <NotAvailable message="This area is only for Nmatix admins." />;
  return children;
}
