"use client";

import { useAuth } from "../auth/AuthProvider";
import RequireAuth from "../auth/RequireAuth";
import {
  ActivityPanel,
  AdminPanel,
  EstimatesPanel,
  FreeEstimateBanner,
  RateCardPanel,
} from "./panels";
import SetupChecklist from "./SetupChecklist";
import { useDashboard } from "./useDashboard";

/**
 * The contractor's home page after every login (#158, PRD 7.4), laid out as in the #158
 * wireframe. Cards show empty states until the features behind them are built.
 */
function Dashboard() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const firstName = (user?.name || "").trim().split(/\s+/)[0];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 id="dashboard-title">{firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}</h1>
        <p>Here&apos;s what&apos;s happening with your nMATIX account.</p>
        {user?.preview && (
          <p className="field-hint">Local preview: no account session was created.</p>
        )}
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
  const rateCardStep = data.checklist?.steps?.find((s) => s.id === "rate_card");
  // Two columns on wide screens, paired by row as in the wireframe; one column on phones.
  return (
    <div className="dash-grid">
      <div className="dash-main">
        <SetupChecklist checklist={data.checklist} />
      </div>
      <div className="dash-side">
        <RateCardPanel available={Boolean(rateCardStep?.available)} rateCard={data.rateCard} />
      </div>
      <div className="dash-main">
        <EstimatesPanel estimates={data.estimates} />
      </div>
      <div className="dash-side">
        <ActivityPanel activity={data.recentActivity} />
      </div>
      {data.freeEstimate && (
        <div className="dash-main">
          <FreeEstimateBanner freeEstimate={data.freeEstimate} />
        </div>
      )}
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
      <Dashboard />
    </RequireAuth>
  );
}
