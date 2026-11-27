"use client";

import Link from "next/link";
import RequireProduct from "../auth/RequireProduct";
import { PRODUCT } from "../auth/SetupProvider";

const SECTIONS = [
  { id: "profile", label: "Business profile", href: "/settings/profile/" },
  // Account (#184) joins here when it is built
];

/** Settings area (PRD 7.4 v0.6): section navigation plus the current section. */
export default function SettingsShell({ section, children }) {
  return (
    <RequireProduct product={PRODUCT}>
      <div className="dashboard settings">
        <div className="dashboard-header">
          <h1 id="settings-title">Settings</h1>
        </div>
        <div className="settings-layout">
          <nav aria-label="Settings sections" className="settings-nav">
            {SECTIONS.map((s) =>
              s.id === section ? (
                <span aria-current="page" key={s.id}>
                  {s.label}
                </span>
              ) : (
                <Link href={s.href} key={s.id}>
                  {s.label}
                </Link>
              )
            )}
          </nav>
          <div className="settings-content">{children}</div>
        </div>
      </div>
    </RequireProduct>
  );
}
