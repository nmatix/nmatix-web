"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { postJson } from "../signup/authApi";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function getErrorMessage(data, status) {
  const code = data?.error?.code;
  if (code === "INVALID_CODE") return "That code is not correct. Check it and try again.";
  if (code === "CODE_EXPIRED") return "That code has expired. Request a new code.";
  if (code === "CODE_NOT_FOUND") return "That code is no longer valid. Request a new code.";
  if (code === "CODE_LOCKED" || code === "TOO_MANY_ATTEMPTS") {
    return "Too many incorrect attempts. Request a new code to try again.";
  }
  if (code === "RATE_LIMITED" || code === "RESEND_TOO_SOON" || status === 429) {
    return "Please wait before requesting another code.";
  }
  if (code === "VALIDATION_ERROR" && data?.error?.fields?.email) {
    return data.error.fields.email;
  }
  return data?.error?.message || "We couldn't complete your login. Please try again.";
}

export default function LoginFlow() {
  const isDevelopmentLogin = process.env.NODE_ENV === "development";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!codeSent || secondsLeft <= 0) return undefined;
    const timer = setTimeout(
      () => setSecondsLeft((remaining) => Math.max(0, remaining - 1)),
      1000
    );
    return () => clearTimeout(timer);
  }, [codeSent, secondsLeft]);

  async function requestCode(event) {
    event?.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (isDevelopmentLogin) {
        setEmail(normalizedEmail);
        setCodeSent(true);
        setCode("");
        setSecondsLeft(RESEND_SECONDS);
        setNotice("Development preview: no email is sent. Enter any six-digit code to continue.");
        return;
      }

      const { status, ok, data } = await postJson("otp/request", { email: normalizedEmail });
      if (!ok) {
        const retrySeconds = Number(data?.retryAfterSeconds || data?.resendAfterSeconds);
        if (retrySeconds > 0) setSecondsLeft(retrySeconds);
        setError(getErrorMessage(data, status));
        return;
      }

      setEmail(normalizedEmail);
      setCodeSent(true);
      setCode("");
      setSecondsLeft(Number(data?.resendAfterSeconds) || RESEND_SECONDS);
      setNotice("If an account exists for this email, a sign-in code has been sent.");
    } catch {
      setError("We couldn't connect to the sign-in service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    if (busy) return;

    const normalizedCode = code.replace(/\s/g, "");
    if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(normalizedCode)) {
      setError(`Enter the ${CODE_LENGTH}-digit code from your email.`);
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (isDevelopmentLogin) {
        router.replace("/dashboard");
        return;
      }

      const { status, ok, data } = await postJson("otp/verify", {
        email,
        code: normalizedCode,
      });
      if (!ok) {
        setError(getErrorMessage(data, status));
        setCode("");
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("We couldn't connect to the sign-in service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function useDifferentEmail() {
    setCodeSent(false);
    setCode("");
    setSecondsLeft(0);
    setError("");
    setNotice("");
  }

  return (
    <div className="login-flow">
      {!codeSent ? (
        <form className="registration-form" onSubmit={requestCode}>
          {isDevelopmentLogin && (
            <p className="field-hint">
              Development preview: no email is sent. After sending, enter any six-digit code.
            </p>
          )}
          <div className="registration-field">
            <label htmlFor="login-email">Email</label>
            <input
              autoComplete="email"
              id="login-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button className="registration-submit" disabled={busy} type="submit">
            {busy ? "Sending code..." : "Send code"}
          </button>
        </form>
      ) : (
        <>
          <p>
            Enter the 6-digit code sent to <strong>{email}</strong>. The code expires in 10 minutes.
          </p>
          <form className="registration-form" noValidate onSubmit={verifyCode}>
            <div className="registration-field">
              <label htmlFor="login-code">One-time code</label>
              <input
                autoComplete="one-time-code"
                className="code-input"
                id="login-code"
                inputMode="numeric"
                maxLength={CODE_LENGTH}
                name="code"
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
                  setError("");
                }}
                pattern="[0-9]*"
                required
                type="text"
                value={code}
              />
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <button className="registration-submit" disabled={busy} type="submit">
              {busy ? "Checking code..." : "Verify and log in"}
            </button>
          </form>
          {notice && (
            <p className="registration-result info" role="status">
              {notice}
            </p>
          )}
          <div className="verify-actions">
            <button
              className="link-button"
              disabled={busy || secondsLeft > 0}
              onClick={() => requestCode()}
              type="button"
            >
              {secondsLeft > 0 ? `Resend code in ${formatCountdown(secondsLeft)}` : "Resend code"}
            </button>
            <button
              className="link-button"
              disabled={busy}
              onClick={useDifferentEmail}
              type="button"
            >
              Use a different email
            </button>
          </div>
        </>
      )}
      <p className="registration-login-prompt">
        New to nMATIX? <Link href="/signup">Sign-up</Link>
      </p>
    </div>
  );
}
