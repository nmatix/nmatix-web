"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate, formatDateTime, formatINR, withinDays } from "./format";
import { BoltIcon, ChartIcon, ClockIcon, DocumentIcon, ShieldIcon, StarIcon } from "./icons";

/*
 * Dashboard cards (#158). Each renders an empty state until the feature behind it sends
 * data in GET /app/dashboard (#157). Shapes the cards read:
 *   rateCard:       { publishedVersion, publishedAt, draftWaiting, draftVersion } or null
 *   estimates:      { last7Days, last30Days, recent: [{ id, customerName, packageName, total, createdAt }] }
 *   recentActivity: [{ type, at, version? }]
 *   freeEstimate:   { remaining, unlimited } or null (#154)
 */

function CardHead({ icon, title, id, children }) {
  return (
    <div className="dash-card-head">
      {icon}
      <h2 id={id}>{title}</h2>
      {children}
    </div>
  );
}

export function RateCardPanel({ rateCard }) {
  return (
    <section className="dash-card" aria-labelledby="rate-card-title">
      <CardHead icon={<DocumentIcon />} id="rate-card-title" title="Rate card status" />
      {rateCard?.publishedVersion ? (
        <>
          <p className="dash-version">
            <span className="dash-badge">Published</span>
            <span className="dash-muted">
              Version {rateCard.publishedVersion} · {formatDate(rateCard.publishedAt)}
            </span>
          </p>
          <Link className="dash-link" href="/rate-card/">
            View rate card <span aria-hidden="true">→</span>
          </Link>
          {rateCard.draftWaiting && (
            <p className="dash-divider-row">
              <ClockIcon size={20} />
              <span>Draft waiting{rateCard.draftVersion ? `: ${rateCard.draftVersion}` : ""}</span>
              <Link className="dash-link" href="/rate-card/">
                View draft <span aria-hidden="true">→</span>
              </Link>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="dash-muted">No rate card yet. Upload one to start pricing estimates.</p>
          <p className="dash-soon">Coming soon</p>
        </>
      )}
    </section>
  );
}

export function EstimatesPanel({ estimates }) {
  const [days, setDays] = useState(7);
  const recent = (estimates?.recent || []).filter((e) => withinDays(e.createdAt, days)).slice(0, 5);
  const hasAny = (estimates?.recent || []).length > 0;

  return (
    <section className="dash-card estimates-card" aria-labelledby="estimates-title">
      <CardHead icon={<ChartIcon />} id="estimates-title" title="Your estimates">
        <div className="dash-tabs" role="group" aria-label="Recent estimates period">
          {[7, 30].map((d) => (
            <button aria-pressed={days === d} key={d} onClick={() => setDays(d)} type="button">
              {d} days
            </button>
          ))}
        </div>
      </CardHead>
      <div className="estimates-body">
        <div className="estimate-stats">
          <p>
            <strong>{estimates?.last7Days ?? 0}</strong>
            <span>Estimates</span>
            <span className="dash-muted">(last 7 days)</span>
          </p>
          <p>
            <strong>{estimates?.last30Days ?? 0}</strong>
            <span>Estimates</span>
            <span className="dash-muted">(last 30 days)</span>
          </p>
        </div>
        <div className="recent-estimates">
          <h3>Recent estimates</h3>
          {recent.length ? (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col">Package</th>
                    <th scope="col" className="num">
                      Total
                    </th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <Link href={`/estimates/${e.id}/`}>{e.customerName}</Link>
                      </td>
                      <td>{e.packageName}</td>
                      <td className="num">{formatINR(e.total)}</td>
                      <td>{formatDate(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="dash-muted">
              {hasAny
                ? `No estimates in the last ${days} days.`
                : "No estimates yet. They will appear here once you create them."}
            </p>
          )}
          {hasAny && (
            <Link className="dash-link" href="/estimates/">
              View all estimates <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

const ACTIVITY_LABELS = {
  estimate_created: () => "New estimate created",
  estimate_revised: () => "Estimate revised",
  rate_card_published: (a) => `Rate card published${a.version ? ` (version ${a.version})` : ""}`,
  profile_updated: () => "Business profile updated",
  logo_updated: () => "Logo updated",
  logo_removed: () => "Logo removed",
};

export function ActivityPanel({ activity }) {
  const items = (activity || []).filter((a) => ACTIVITY_LABELS[a.type]);
  return (
    <section className="dash-card" aria-labelledby="activity-title">
      <CardHead icon={<BoltIcon />} id="activity-title" title="Recent activity" />
      {items.length ? (
        <ol className="activity-list">
          {items.map((a, i) => (
            <li key={`${a.type}-${a.at}-${i}`}>
              <span className="activity-title">{ACTIVITY_LABELS[a.type](a)}</span>
              <span className="dash-muted">{formatDateTime(a.at)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="dash-muted">
          No activity yet. Changes to your rate card and estimates will show here.
        </p>
      )}
    </section>
  );
}

export function FreeEstimateBanner({ freeEstimate }) {
  if (!freeEstimate || freeEstimate.unlimited) return null;
  const left = freeEstimate.remaining ?? 0;
  return (
    <section className="dash-card free-banner" aria-labelledby="free-title">
      <StarIcon />
      <div>
        <h2 id="free-title">Free estimate status</h2>
        <p>
          {left > 0
            ? `You have ${left} free estimate${left === 1 ? "" : "s"} remaining.`
            : "You've used your free estimate. Paid plans are coming soon: contact contact@nmatix.com to continue."}
        </p>
      </div>
    </section>
  );
}

export function AdminPanel() {
  return (
    <section className="dash-card admin-card" aria-labelledby="admin-tools-title">
      <ShieldIcon />
      <div>
        <h2 id="admin-tools-title">Admin tools</h2>
        <p className="dash-muted">Find users, manage accounts and admin rights.</p>
        <Link className="dash-link" href="/admin/">
          Go to the admin area <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
