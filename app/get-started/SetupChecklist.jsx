"use client";

import Link from "next/link";
import { CheckCircleIcon } from "../dashboard/icons";
import { SETUP_STEPS } from "./setupSteps";

/**
 * The one-time setup steps (#32, PRD 7.2 v0.6): a stepper on the left and the next step to
 * take on the right. Steps whose screens don't exist yet show "Coming soon".
 */
export default function SetupChecklist({ setup }) {
  const steps = setup?.steps || [];
  const complete = Boolean(setup?.complete);
  const done = steps.filter((s) => s.status === "complete").length;
  const next = steps.find((s) => s.id === setup?.startHere);

  return (
    <section className="dash-card setup-card" aria-labelledby="setup-title">
      <div className="dash-card-head">
        <CheckCircleIcon size={40} />
        <div className="dash-card-titles">
          <h2 id="setup-title">{complete ? "Setup complete" : "Setup steps"}</h2>
          <p>
            {complete
              ? "Your account is ready. You can change any of these later."
              : "Complete these steps once to get ready to create estimates."}
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
      </div>

      <div className="setup-body">
        <ol className="setup-steps">
          {steps.map((step) => (
            <SetupStep isStartHere={step.id === setup.startHere} key={step.id} step={step} />
          ))}
        </ol>
        <NextStep complete={complete} step={next} />
      </div>
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
        <p>Your dashboard is where you create and manage estimates.</p>
        <Link className="dash-button" href="/dashboard/">
          Go to your dashboard <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }
  const meta = SETUP_STEPS[step.id];
  return (
    <div className="setup-next">
      <h3>Next: {meta.title}</h3>
      <p>{meta.description}</p>
      <Link className="dash-button" href={meta.href}>
        {meta.action} <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
