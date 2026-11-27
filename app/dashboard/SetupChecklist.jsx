"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircleIcon } from "./icons";
import { SETUP_STEPS } from "./setupSteps";

/**
 * Setup checklist card (#32, PRD 7.2): a stepper of the six setup steps on the left and the
 * next step to take on the right. Open until every step is done, then folded; the chevron
 * shows or hides the steps at any time.
 */
export default function SetupChecklist({ checklist }) {
  const steps = checklist?.steps || [];
  const complete = Boolean(checklist?.complete);
  const [open, setOpen] = useState(!complete);
  const done = steps.filter((s) => s.status === "complete").length;
  const next = steps.find((s) => s.id === checklist?.startHere);

  return (
    <section className="dash-card setup-card" aria-labelledby="setup-title">
      <div className="dash-card-head">
        <CheckCircleIcon size={40} />
        <div className="dash-card-titles">
          <h2 id="setup-title">Setup checklist</h2>
          <p>
            {complete
              ? "Your account is ready for estimates."
              : "Complete these steps to get ready to create estimates."}
          </p>
        </div>
        <div className="setup-meter">
          <p className="setup-progress">
            {done} of {steps.length} completed
          </p>
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
        </div>
        <button
          aria-controls="setup-body"
          aria-expanded={open}
          aria-label={open ? "Hide setup steps" : "Show setup steps"}
          className="chevron-button"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span aria-hidden="true" className={open ? "chevron up" : "chevron"} />
        </button>
      </div>

      {open && (
        <div className="setup-body" id="setup-body">
          <ol className="setup-steps">
            {steps.map((step) => (
              <SetupStep isStartHere={step.id === checklist.startHere} key={step.id} step={step} />
            ))}
          </ol>
          <NextStep complete={complete} step={next} />
        </div>
      )}
    </section>
  );
}

function SetupStep({ step, isStartHere }) {
  const meta = SETUP_STEPS[step.id];
  if (!meta) return null;
  const isDone = step.status === "complete";
  const classes = ["setup-step", isDone && "is-done", isStartHere && "is-start"].filter(Boolean);
  return (
    <li className={classes.join(" ")}>
      <span aria-hidden="true" className="setup-marker">
        {isDone ? "✓" : ""}
      </span>
      <span className="setup-step-title">
        {step.available ? <Link href={meta.href}>{meta.title}</Link> : meta.title}
      </span>
      <span className="visually-hidden">
        {isDone ? " (done)" : step.status === "in_progress" ? " (in progress)" : ""}
      </span>
      {isStartHere && <span className="setup-start-here">Start here</span>}
      {step.status === "in_progress" && <span className="setup-tag">In progress</span>}
      {!step.available && <span className="setup-tag">Coming soon</span>}
    </li>
  );
}

function NextStep({ step, complete }) {
  if (complete || !step) {
    return (
      <div className="setup-next">
        <h3>You&apos;re all set!</h3>
        <p>Create an estimate for your next customer.</p>
        <span className="dash-button is-disabled" aria-disabled="true">
          New estimate (coming soon)
        </span>
      </div>
    );
  }
  const meta = SETUP_STEPS[step.id];
  return (
    <div className="setup-next">
      <h3>Next: {meta.title}</h3>
      <p>{meta.description}</p>
      {step.available ? (
        <Link className="dash-button" href={meta.href}>
          {meta.action} <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className="dash-button is-disabled" aria-disabled="true">
          Coming soon
        </span>
      )}
    </div>
  );
}
