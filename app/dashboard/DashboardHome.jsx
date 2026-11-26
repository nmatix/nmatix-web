"use client";

import Link from "next/link";
import { useAuth } from "../auth/AuthProvider";
import RequireAuth from "../auth/RequireAuth";
import SetupChecklist from "./SetupChecklist";
import { useDashboard } from "./useDashboard";

/**
 * The contractor's home page after every login (#158, PRD 7.4). This first slice shows the
 * setup checklist; rate card status, estimate counts and recent estimates fill in as those
 * features are built.
 */
function Dashboard() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const firstName = (user?.name || "").trim().split(/\s+/)[0];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 id="dashboard-title">{firstName ? `Welcome, ${firstName}` : "Welcome"}</h1>
        {user?.preview && (
          <p className="field-hint">Local preview: no account session was created.</p>
        )}
      </header>

      {dashboard.status === "loading" && (
        <p className="auth-loading" role="status" aria-live="polite">
          Loading your dashboard...
        </p>
      )}

      {dashboard.status === "error" && (
        <section className="dashboard-panel" role="alert">
          <h2>We couldn&apos;t load your dashboard</h2>
          <p>Check your connection and try again.</p>
          <button className="link-button" onClick={dashboard.retry} type="button">
            Try again
          </button>
        </section>
      )}

      {dashboard.status === "ready" && <DashboardContent data={dashboard.data} />}
    </div>
  );
}

function DashboardContent({ data }) {
  return (
    <>
      <SetupChecklist checklist={data.checklist} />

      <div className="dashboard-grid">
        <section className="dashboard-panel" aria-labelledby="new-estimate-title">
          <h2 id="new-estimate-title">New estimate</h2>
          <p>Upload a plan, check the rooms and get a priced estimate to share as a PDF.</p>
          <button className="dashboard-primary" disabled type="button">
            New estimate
          </button>
          <p className="field-hint">Coming soon: finish setup first.</p>
        </section>

        <section className="dashboard-panel" aria-labelledby="recent-estimates-title">
          <h2 id="recent-estimates-title">Recent estimates</h2>
          {data.estimates?.recent?.length ? null : (
            <p className="dashboard-empty">Your estimates will appear here.</p>
          )}
        </section>
      </div>

      {data.isAdmin && (
        <p className="dashboard-admin-link">
          <Link href="/admin/">Go to the admin area</Link>
        </p>
      )}
    </>
  );
}

export default function DashboardHome() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
