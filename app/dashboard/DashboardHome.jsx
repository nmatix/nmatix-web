"use client";

import Link from "next/link";
import { useAuth } from "../auth/AuthProvider";
import RequireAuth from "../auth/RequireAuth";

function Welcome() {
  const { user, signOut } = useAuth();
  return (
    <section className="registration-card" aria-labelledby="dashboard-title">
      <h1 id="dashboard-title">Welcome{user?.name ? `, ${user.name}` : ""}</h1>
      {user?.preview && (
        <p className="field-hint">Local preview: no account session was created.</p>
      )}
      <p>You are logged in{user?.isAdmin ? " as an internal admin" : ""}.</p>
      <p>
        Your dashboard is on its way: setup steps, your rate card and your estimates will appear
        here.
      </p>
      <div className="verify-actions">
        <Link href="/products/interior-quote-generator/">Explore products</Link>
        <button className="link-button" onClick={signOut} type="button">
          Log out
        </button>
      </div>
    </section>
  );
}

export default function DashboardHome() {
  return (
    <RequireAuth>
      <Welcome />
    </RequireAuth>
  );
}
