"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PRIVACY_PATH, PRIVACY_VERSION, TERMS_PATH, TERMS_VERSION } from "../../data/legal";
import { getAuthEndpoint } from "./authApi";
import TurnstileWidget from "./TurnstileWidget";

const DEFAULT_PRODUCT = "interior-quote-generator";
const API_FIELDS = ["email", "name", "phone", "company", "terms"];
const BOT_CHECK_WAIT = "Please wait a moment for the security check to finish.";

function normalizeIndianPhone(phone) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits;
}

function validateRegistration({ email, name, phone, termsAccepted }) {
  const errors = {};
  const normalizedEmail = email.trim();
  const phoneDigits = normalizeIndianPhone(phone);

  if (!normalizedEmail) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = "Enter a valid email address, such as name@example.com.";
  }

  if (!name.trim()) {
    errors.name = "Enter your name.";
  }

  if (!phone.trim()) {
    errors.phone = "Enter your 10-digit Indian mobile number.";
  } else if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  }

  if (!termsAccepted) {
    errors.terms = "Accept the terms and privacy notice to continue.";
  }

  return errors;
}

function getApiFieldErrors(data) {
  const fields = data?.error?.fields;
  if (!fields || typeof fields !== "object") return {};

  return Object.fromEntries(
    Object.entries(fields).filter(
      ([field, message]) => API_FIELDS.includes(field) && typeof message === "string"
    )
  );
}

export default function RegistrationForm({ product = DEFAULT_PRODUCT, onRegistered }) {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [botCheck, setBotCheck] = useState({ status: "pending" });
  const submissionInProgress = useRef(false);
  const turnstile = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submissionInProgress.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const phoneDigits = normalizeIndianPhone(String(formData.get("phone") || ""));
    const values = {
      email: String(formData.get("email") || "")
        .trim()
        .toLowerCase(),
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      termsAccepted: formData.get("terms") === "on",
    };

    const validationErrors = validateRegistration(values);
    // Wait for the bot check while it is still running. If it could not load at all
    // (e.g. blocked), submit anyway and let the server decide.
    if (botCheck.status === "pending") {
      validationErrors.bot = BOT_CHECK_WAIT;
    }
    setErrors(validationErrors);
    setResult(null);
    if (Object.keys(validationErrors).length > 0) return;

    submissionInProgress.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch(getAuthEndpoint("register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          name: values.name,
          phone: `+91${phoneDigits}`,
          ...(values.company ? { company: values.company } : {}),
          product,
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          ...(botCheck.status === "ready" ? { turnstileToken: botCheck.token } : {}),
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        // Fall through to the generic response message for non-JSON errors.
      }

      // Email and/or phone already belongs to an active account. Keep everything the
      // user typed, highlight the field(s) in use and let them correct and resubmit.
      if (response.status === 409 || data?.error?.code === "ALREADY_REGISTERED") {
        const taken = getApiFieldErrors(data);
        setErrors(taken);
        const which =
          taken.email && taken.phone
            ? "This email and phone number are"
            : taken.phone
              ? "This phone number is"
              : "This email is";
        setResult({
          type: "duplicate",
          message: `${which} already registered. Log in, or change the highlighted details and submit again.`,
        });
        return;
      }

      if (data?.error?.code === "BOT_CHECK_FAILED") {
        setErrors({ bot: "The security check didn't pass. Please complete it and try again." });
        return;
      }

      if (!response.ok) {
        const apiFieldErrors = getApiFieldErrors(data);
        if (Object.keys(apiFieldErrors).length > 0) {
          setErrors(apiFieldErrors);
          setResult({
            type: "error",
            message: "Please check the highlighted details and try again.",
          });
          return;
        }

        setResult({
          type: "error",
          message:
            data?.error?.message || "We couldn't submit your registration. Please try again.",
        });
        return;
      }

      form.reset();
      onRegistered?.(data);
    } catch {
      setResult({
        type: "error",
        message: "We couldn't connect to the registration service. Please try again.",
      });
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
      // Turnstile tokens are single use: get a fresh one for any further submission
      turnstile.current?.reset();
    }
  }

  function handleBotCheck(state) {
    setBotCheck(state);
    // Clear only the "please wait" hint once the check finishes. A failed-check message
    // stays until the next submission, even though the widget usually re-passes at once.
    if (state.status !== "pending") {
      setErrors((current) =>
        current.bot === BOT_CHECK_WAIT ? { ...current, bot: undefined } : current
      );
    }
  }

  function handleFieldChange(event) {
    const { name } = event.target;
    setResult(null);
    setErrors((currentErrors) =>
      currentErrors[name] ? { ...currentErrors, [name]: undefined } : currentErrors
    );
  }

  return (
    <>
      <form className="registration-form" noValidate onSubmit={handleSubmit}>
        <div className="registration-field">
          <label htmlFor="registration-email">Email</label>
          <input
            autoComplete="email"
            aria-describedby={errors.email ? "registration-email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            id="registration-email"
            name="email"
            onChange={handleFieldChange}
            required
            type="email"
          />
          {errors.email && (
            <p className="field-error" id="registration-email-error">
              {errors.email}
            </p>
          )}
        </div>

        <div className="registration-field">
          <label htmlFor="registration-name">Name</label>
          <input
            autoComplete="name"
            aria-describedby={errors.name ? "registration-name-error" : undefined}
            aria-invalid={Boolean(errors.name)}
            id="registration-name"
            name="name"
            onChange={handleFieldChange}
            required
            type="text"
          />
          {errors.name && (
            <p className="field-error" id="registration-name-error">
              {errors.name}
            </p>
          )}
        </div>

        <div className="registration-field">
          <label htmlFor="registration-company">
            Business name <span>(optional)</span>
          </label>
          <input
            autoComplete="organization"
            aria-describedby={errors.company ? "registration-company-error" : undefined}
            aria-invalid={Boolean(errors.company)}
            id="registration-company"
            name="company"
            onChange={handleFieldChange}
            type="text"
          />
          {errors.company && (
            <p className="field-error" id="registration-company-error">
              {errors.company}
            </p>
          )}
        </div>

        <div className="registration-field">
          <label htmlFor="registration-phone">Phone</label>
          <div className="phone-input-group">
            <input
              aria-label="Country calling code"
              className="country-code-input"
              disabled
              value="+91"
            />
            <input
              autoComplete="tel-national"
              aria-describedby={
                errors.phone ? "registration-phone-error" : "registration-phone-hint"
              }
              aria-invalid={Boolean(errors.phone)}
              className="phone-number-input"
              id="registration-phone"
              name="phone"
              onChange={handleFieldChange}
              placeholder="98765 43210"
              required
              type="tel"
            />
          </div>
          {errors.phone ? (
            <p className="field-error" id="registration-phone-error">
              {errors.phone}
            </p>
          ) : (
            <p className="field-hint" id="registration-phone-hint">
              Enter your 10-digit Indian mobile number.
            </p>
          )}
        </div>

        <div className="registration-field registration-terms">
          <div className="checkbox-row">
            <input
              aria-describedby={errors.terms ? "registration-terms-error" : undefined}
              aria-invalid={Boolean(errors.terms)}
              id="registration-terms"
              name="terms"
              onChange={handleFieldChange}
              required
              type="checkbox"
            />
            <label htmlFor="registration-terms">
              I agree to the{" "}
              <a href={TERMS_PATH} rel="noopener noreferrer" target="_blank">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href={PRIVACY_PATH} rel="noopener noreferrer" target="_blank">
                Privacy Notice
              </a>
            </label>
          </div>
          {errors.terms && (
            <p className="field-error" id="registration-terms-error">
              {errors.terms}
            </p>
          )}
        </div>

        <div className="registration-field registration-bot-check">
          <TurnstileWidget action="register" onChange={handleBotCheck} ref={turnstile} />
          {errors.bot && (
            <p className="field-error" id="registration-bot-error" role="alert">
              {errors.bot}
            </p>
          )}
        </div>

        {result?.type === "duplicate" ? (
          <div className="registration-result duplicate" role="alert">
            <p>{result.message}</p>
            <Link className="registration-login-button" href="/login">
              Login
            </Link>
          </div>
        ) : result?.type === "error" ? (
          <p className="registration-result error" role="alert">
            {result.message}
          </p>
        ) : null}

        <button className="registration-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Create account"}
        </button>
      </form>
    </>
  );
}
