"use client";

import RequireProduct from "../auth/RequireProduct";
import { PRODUCT, useSetup } from "../auth/SetupProvider";
import SetupChecklist from "./SetupChecklist";

/**
 * Get started (#32, PRD 7.2 v0.6): the one-time setup. Logins land here until setup is
 * complete; afterwards it stays reachable but the dashboard is the home page.
 */
function GetStartedContent() {
  const setup = useSetup();
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 id="get-started-title">Get started</h1>
        <p>Set up your account once, then create estimates for your customers.</p>
      </div>

      {setup.status === "loading" && (
        <p className="auth-loading" role="status" aria-live="polite">
          Loading your setup...
        </p>
      )}
      {setup.status === "error" && (
        <section className="dash-card" role="alert">
          <h2>We couldn&apos;t load your setup</h2>
          <p>Check your connection and try again.</p>
          <button className="link-button" onClick={setup.refresh} type="button">
            Try again
          </button>
        </section>
      )}
      {setup.status === "ready" && <SetupChecklist setup={setup.data} />}
    </div>
  );
}

export default function GetStarted() {
  return (
    <RequireProduct product={PRODUCT}>
      <GetStartedContent />
    </RequireProduct>
  );
}
