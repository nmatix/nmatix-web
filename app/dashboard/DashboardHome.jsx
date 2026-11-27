"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import RequireAuth from "../auth/RequireAuth";
import { setupPending, useSetup } from "../auth/SetupProvider";
import {
  ActivityPanel,
  AdminPanel,
  EstimatesPanel,
  FreeEstimateBanner,
  RateCardPanel,
} from "./panels";
import { useDashboard } from "./useDashboard";

/**
 * The contractor's home page after login once setup is complete (#158, PRD 7.4 v0.6).
 * Contractors who haven't finished the one-time setup are sent to Get started (#32).
 */
function SetupGate({ children }) {
  const setup = useSetup();
  const router = useRouter();
  const pending = setupPending(setup);

  useEffect(() => {
    if (pending) router.replace("/get-started/");
  }, [pending, router]);

  if (setup.status === "loading" || pending) {
    return (
      <p className="auth-loading" role="status" aria-live="polite">
        Loading your dashboard...
      </p>
    );
  }
  return children;
}

function Dashboard() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const firstName = (user?.name || "").trim().split(/\s+/)[0];

  return (
    <div className="dashboard">
      <div className="dashboard-header dashboard-header-row">
        <div>
          <h1 id="dashboard-title">
            {firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
          </h1>
          <p>Here&apos;s what&apos;s happening with your nMATIX account.</p>
          {user?.preview && (
            <p className="field-hint">Local preview: no account session was created.</p>
          )}
        </div>
        <span className="dash-button is-disabled" aria-disabled="true" title="Coming soon">
          New estimate (coming soon)
        </span>
      </div>

      {dashboard.status === "loading" && (
        <p className="auth-loading" role="status" aria-live="polite">
          Loading your dashboard...
        </p>
      )}

      {dashboard.status === "error" && (
        <section className="dash-card" role="alert">
          <h2>We couldn&apos;t load your dashboard</h2>
          <p>Check your connection and try again.</p>
          <button className="link-button" onClick={dashboard.retry} type="button">
            Try again
          </button>
        </section>
      )}

      {dashboard.status === "ready" && <DashboardGrid data={dashboard.data} />}
    </div>
  );
}

function DashboardGrid({ data }) {
  // Two columns on wide screens, paired by row as in the wireframe; one column on phones.
  return (
    <div className="dash-grid">
      <div className="dash-main">
        <EstimatesPanel estimates={data.estimates} />
      </div>
      <div className="dash-side">
        <RateCardPanel rateCard={data.rateCard} />
      </div>
      {data.freeEstimate && (
        <div className="dash-main">
          <FreeEstimateBanner freeEstimate={data.freeEstimate} />
        </div>
      )}
      <div className="dash-side">
        <ActivityPanel activity={data.recentActivity} />
      </div>
      {data.isAdmin && (
        <div className="dash-side">
          <AdminPanel />
        </div>
      )}
    </div>
  );
}

export default function DashboardHome() {
  return (
    <RequireAuth>
      <SetupGate>
        <Dashboard />
      </SetupGate>
    </RequireAuth>
  );
}
