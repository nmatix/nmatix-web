"use client";

import Link from "next/link";
import { useState } from "react";
import { SETUP_STEPS, STATUS_LABELS } from "./setupSteps";

/**
 * The guided setup checklist (#32, PRD 7.2). Open until every step is done; then folded
 * into one line that can be expanded again. The first step not done is marked "Start here".
 */
export default function SetupChecklist({ checklist }) {
  const [expanded, setExpanded] = useState(false);
  const steps = checklist?.steps || [];
  const done = steps.filter((s) => s.status === "complete").length;
  const open = !checklist?.complete || expanded;

  return (
    <section className="dashboard-panel setup-checklist" aria-labelledby="setup-title">
      <div className="panel-heading">
        <h2 id="setup-title">{checklist?.complete ? "Setup complete" : "Set up your account"}</h2>
        <p className="setup-progress">
          {done} of {steps.length} done
        </p>
      </div>
      <div
        className="setup-progress-bar"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
      >
        <span style={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }} />
      </div>

      {checklist?.complete && (
        <button
          aria-controls="setup-steps"
          aria-expanded={open}
          className="link-button"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {open ? "Hide setup steps" : "Show setup steps"}
        </button>
      )}

      {open && (
        <ol className="setup-steps" id="setup-steps">
          {steps.map((step, index) => (
            <SetupStep
              index={index + 1}
              isStartHere={step.id === checklist.startHere}
              key={step.id}
              step={step}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function SetupStep({ step, index, isStartHere }) {
  const meta = SETUP_STEPS[step.id];
  if (!meta) return null;
  const statusLabel = step.available ? STATUS_LABELS[step.status] : "Coming soon";
  const statusClass = step.available ? step.status : "unavailable";

  return (
    <li className={`setup-step${isStartHere ? " is-start" : ""}`}>
      <span className="setup-step-number" aria-hidden="true">
        {step.status === "complete" ? "✓" : index}
      </span>
      <div className="setup-step-body">
        <p className="setup-step-title">
          {step.available ? <Link href={meta.href}>{meta.title}</Link> : meta.title}
          {isStartHere && <span className="setup-start-here">Start here</span>}
        </p>
        <p className="setup-step-description">{meta.description}</p>
      </div>
      <span className={`setup-status ${statusClass}`}>{statusLabel}</span>
    </li>
  );
}
