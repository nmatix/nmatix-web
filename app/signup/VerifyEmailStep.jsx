"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { postJson } from "./authApi";

const CODE_LENGTH = 6;
const FIELD_NAMES = { email: "email", phone: "phone number" };

function secondsUntil(epochMs, now) {
  return Math.max(0, Math.ceil((epochMs - now) / 1000));
}

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function takenMessage(fields) {
  const taken = Object.keys(fields || {}).filter((field) => FIELD_NAMES[field]);
  const which = taken.length ? taken.map((field) => FIELD_NAMES[field]).join(" and ") : "details";
  const verb = taken.length > 1 ? "are" : "is";
  return `This ${which} ${verb} now registered to another account. Log in, or register again with different details.`;
}

/**
 * Step 2 of sign-up: enter the 6-digit code emailed after registration.
 *
 * Props:
 *   pending     { id, email (masked), resendAt (epoch ms), codeSent }
 *   onPendingChange(pending)  called when a new code is sent (to persist resendAt)
 *   onVerified()              the account is active
 *   onStartOver()             go back to an empty registration form
 */
export default function VerifyEmailStep({ pending, onPendingChange, onVerified, onStartOver }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(
    pending.codeSent === false
      ? "We couldn't send your code. Request a new code when the timer reaches zero."
      : null
  );
  const [blocked, setBlocked] = useState(null); // terminal state: { message, showLogin }
  const [resendDisabled, setResendDisabled] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const secondsLeft = secondsUntil(pending.resendAt, now);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Tick once a second while a countdown is running (one steady interval, not one per tick)
  const counting = secondsLeft > 0;
  useEffect(() => {
    if (!counting) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  function restartCountdown(seconds) {
    const next = { ...pending, resendAt: Date.now() + seconds * 1000 };
    setNow(Date.now());
    onPendingChange(next);
  }

  async function handleVerify(event) {
    event.preventDefault();
    if (busy) return;
    const trimmed = code.replace(/\s/g, "");
    if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(trimmed)) {
      setError(`Enter the ${CODE_LENGTH}-digit code from the email.`);
      inputRef.current?.focus();
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { status, ok, data } = await postJson("otp/verify", {
        registrationId: pending.id,
        code: trimmed,
      });
      const errorCode = data?.error?.code;

      if (ok) {
        onVerified();
        return;
      }
      if (errorCode === "INVALID_CODE") {
        const left = data.attemptsRemaining;
        setError(
          typeof left === "number"
            ? `That code is not correct. ${left} ${left === 1 ? "attempt" : "attempts"} left.`
            : "That code is not correct."
        );
      } else if (errorCode === "CODE_LOCKED") {
        setError("Too many incorrect attempts. Request a new code to try again.");
      } else if (errorCode === "CODE_EXPIRED") {
        setError("This code has expired. Request a new code.");
      } else if (errorCode === "CODE_NOT_FOUND") {
        setError("This code is no longer valid. Request a new code.");
      } else if (errorCode === "ALREADY_REGISTERED" || status === 409) {
        setBlocked({ message: takenMessage(data?.error?.fields), showLogin: true });
      } else if (errorCode === "REGISTRATION_EXPIRED") {
        setBlocked({
          message: "This registration has expired. Please register again.",
          showLogin: false,
        });
      } else if (errorCode === "VALIDATION_ERROR" && data?.error?.fields?.code) {
        setError(data.error.fields.code);
      } else {
        setError(data?.error?.message || "We couldn't check your code. Please try again.");
      }
      setCode("");
      inputRef.current?.focus();
    } catch {
      setError("We couldn't connect to the verification service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (busy || secondsLeft > 0 || resendDisabled) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { ok, data } = await postJson("otp/resend", { registrationId: pending.id });
      const errorCode = data?.error?.code;

      if (ok) {
        restartCountdown(data.resendAfterSeconds || 60);
        setNotice(`We sent a new code to ${data.email || pending.email}.`);
        setCode("");
        inputRef.current?.focus();
      } else if (errorCode === "RESEND_TOO_SOON") {
        restartCountdown(data.retryAfterSeconds || 60);
      } else if (errorCode === "RESEND_LIMIT_REACHED") {
        setResendDisabled(true);
        setError("You've requested the maximum number of codes for this registration.");
      } else if (errorCode === "ALREADY_ACTIVE") {
        onVerified();
      } else if (errorCode === "REGISTRATION_EXPIRED") {
        setBlocked({
          message: "This registration has expired. Please register again.",
          showLogin: false,
        });
      } else {
        restartCountdown(60);
        setError(data?.error?.message || "We couldn't send a new code. Please try again shortly.");
      }
    } catch {
      setError("We couldn't connect to the verification service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (blocked) {
    return (
      <div className="verify-step">
        <div className="registration-result duplicate" role="alert">
          <p>{blocked.message}</p>
          <div className="verify-actions">
            {blocked.showLogin && (
              <Link className="registration-login-button" href="/login">
                Login
              </Link>
            )}
            <button className="link-button" onClick={onStartOver} type="button">
              Register again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-step">
      <h2 className="verify-title">Check your email</h2>
      <p>
        Enter the {CODE_LENGTH}-digit code we sent to <strong>{pending.email}</strong>. It expires
        in 10 minutes.
      </p>

      <form className="registration-form" noValidate onSubmit={handleVerify}>
        <div className="registration-field">
          <label htmlFor="verification-code">Verification code</label>
          <input
            aria-describedby={error ? "verification-code-error" : undefined}
            aria-invalid={Boolean(error)}
            autoComplete="one-time-code"
            className="code-input"
            id="verification-code"
            inputMode="numeric"
            maxLength={CODE_LENGTH}
            name="code"
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
              setError(null);
            }}
            pattern="[0-9]*"
            ref={inputRef}
            type="text"
            value={code}
          />
          {error && (
            <p className="field-error" id="verification-code-error" role="alert">
              {error}
            </p>
          )}
        </div>

        {notice && (
          <p className="registration-result info" role="status" aria-live="polite">
            {notice}
          </p>
        )}

        <button className="registration-submit" disabled={busy} type="submit">
          {busy ? "Checking..." : "Verify email"}
        </button>
      </form>

      <div className="verify-actions">
        <button
          className="link-button"
          disabled={busy || secondsLeft > 0 || resendDisabled}
          onClick={handleResend}
          type="button"
        >
          {secondsLeft > 0
            ? `Send a new code in ${formatCountdown(secondsLeft)}`
            : "Send a new code"}
        </button>
        <button className="link-button" onClick={onStartOver} type="button">
          Use different details
        </button>
      </div>
    </div>
  );
}
