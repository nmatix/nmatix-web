"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const DEVELOPMENT_ENDPOINT =
  "https://d2ihao468hpdsu.cloudfront.net/auth/register";

function getRegistrationEndpoint() {
  if (process.env.NEXT_PUBLIC_REGISTRATION_API_URL) {
    return process.env.NEXT_PUBLIC_REGISTRATION_API_URL;
  }

  // The deployed CloudFront distribution routes /auth/* to the auth API.
  // Local Next.js development uses the dedicated dev CloudFront endpoint.
  return process.env.NODE_ENV === "development"
    ? DEVELOPMENT_ENDPOINT
    : "/auth/register";
}

function normalizeIndianPhone(phone) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }
  return digits;
}

function validateRegistration({ email, name, phone }) {
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

  return errors;
}

function getApiFieldErrors(data) {
  const fields = data?.error?.fields;
  if (!fields || typeof fields !== "object") return {};

  return Object.fromEntries(
    Object.entries(fields).filter(([field, message]) =>
      ["email", "name", "phone", "company"].includes(field) &&
      typeof message === "string"
    )
  );
}

export default function RegistrationForm() {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const submissionInProgress = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submissionInProgress.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const phoneDigits = normalizeIndianPhone(
      String(formData.get("phone") || "")
    );
    const values = {
      email: String(formData.get("email") || "").trim(),
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      company: String(formData.get("company") || "").trim(),
    };
    values.email = values.email.toLowerCase();

    const validationErrors = validateRegistration(values);
    setErrors(validationErrors);
    setResult(null);
    if (Object.keys(validationErrors).length > 0) return;

    submissionInProgress.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch(getRegistrationEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          name: values.name,
          phone: `+91${phoneDigits}`,
          ...(values.company ? { company: values.company } : {}),
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        // Fall through to the generic response message for non-JSON errors.
      }

      if (
        response.status === 422 ||
        data?.error?.code === "EMAIL_ALREADY_REGISTERED"
      ) {
        setResult({
          type: "duplicate",
          message:
            "An account with this email already exists. Please log in to continue.",
        });
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
            data?.error?.message ||
            "We couldn't submit your registration. Please try again.",
        });
        return;
      }

      setResult({
        type: "success",
        message: "Registration received, pending activation",
      });
      form.reset();
    } catch {
      setResult({
        type: "error",
        message:
          "We couldn't connect to the registration service. Please try again.",
      });
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  function handleFieldChange(event) {
    const { name } = event.target;
    setResult(null);
    setErrors((currentErrors) =>
      currentErrors[name]
        ? { ...currentErrors, [name]: undefined }
        : currentErrors
    );
  }

  if (result?.type === "success") {
    return (
      <div className="registration-result success" role="status" aria-live="polite">
        {result.message}
      </div>
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
            <p className="field-error" id="registration-email-error">{errors.email}</p>
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
            <p className="field-error" id="registration-name-error">{errors.name}</p>
          )}
        </div>

        <div className="registration-field">
          <label htmlFor="registration-company">Company <span>(optional)</span></label>
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
            <p className="field-error" id="registration-company-error">{errors.company}</p>
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
              aria-describedby={errors.phone ? "registration-phone-error" : "registration-phone-hint"}
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
            <p className="field-error" id="registration-phone-error">{errors.phone}</p>
          ) : (
            <p className="field-hint" id="registration-phone-hint">
              Enter your 10-digit Indian mobile number.
            </p>
          )}
        </div>

        {result?.type === "duplicate" ? (
          <div className="registration-result duplicate" role="alert">
            <p>{result.message}</p>
            <Link className="registration-login-button" href="/login">Login</Link>
          </div>
        ) : result?.type === "error" ? (
          <p className="registration-result error" role="alert">{result.message}</p>
        ) : null}

        <button className="registration-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Request access"}
        </button>
      </form>
    </>
  );
}
