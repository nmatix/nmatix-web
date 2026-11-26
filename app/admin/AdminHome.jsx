"use client";

import RequireAdmin from "../auth/RequireAdmin";

export default function AdminHome() {
  return (
    <RequireAdmin>
      <section className="registration-card" aria-labelledby="admin-title">
        <h1 id="admin-title">Admin</h1>
        <p>
          User administration (finding users, deactivating accounts, admin rights and the audit log)
          is coming next.
        </p>
      </section>
    </RequireAdmin>
  );
}
