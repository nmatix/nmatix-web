"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useSetup } from "../../auth/SetupProvider";
import { LogoError, uploadLogo } from "./uploadLogo";

const COLOUR_RE = /^#[0-9A-Fa-f]{6}$/;

function toForm(profile) {
  return {
    businessName: profile.businessName || "",
    contactEmail: profile.contactEmail || "",
    contactPhone: profile.contactPhone || "",
    address: profile.address || "",
    website: profile.website || "",
    brandColour: profile.brandColour || "#FF8A05",
    disclaimer: profile.disclaimer || "",
    validityDays: String(profile.validityDays ?? 30),
    showItemRates: Boolean(profile.showItemRates),
    areaUnit: profile.areaUnit || "sqft",
  };
}

function toBody(form) {
  const days = Number(form.validityDays);
  return { ...form, validityDays: Number.isInteger(days) ? days : form.validityDays };
}

/**
 * Settings › Business profile (#30; CFG-01, CFG-07, CFG-08). Loads and saves GET/PUT
 * /app/profile (#161); the logo is uploaded straight to S3 and confirmed by the server.
 * Saving the profile completes setup step 1, so the setup status is refreshed afterwards.
 */
export default function BusinessProfile() {
  const { appFetch } = useAuth();
  const setup = useSetup();
  const [load, setLoad] = useState({ status: "loading" });
  const [form, setForm] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [logoState, setLogoState] = useState({ busy: false, message: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    appFetch("profile")
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) return setLoad({ status: "error" });
        setForm(toForm(data.profile));
        setLogoUrl(data.profile.logoUrl);
        setLoad({ status: "ready", saved: data.saved });
      })
      .catch(() => active && setLoad({ status: "error" }));
    return () => {
      active = false;
    };
  }, [appFetch, attempt]);

  if (load.status === "loading") {
    return (
      <p className="auth-loading" role="status" aria-live="polite">
        Loading your business profile...
      </p>
    );
  }
  if (load.status === "error") {
    return (
      <section className="dash-card" role="alert">
        <h2>We couldn&apos;t load your business profile</h2>
        <p>Check your connection and try again.</p>
        <button className="link-button" onClick={() => setAttempt((n) => n + 1)} type="button">
          Try again
        </button>
      </section>
    );
  }

  const update = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setResult(null);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const { ok, status, data } = await appFetch("profile", { method: "PUT", body: toBody(form) });
      if (ok) {
        setForm(toForm(data.profile));
        setErrors({});
        setResult({ kind: "success" });
        setLoad({ status: "ready", saved: true });
        setup.refresh();
      } else if (status === 400 && data?.error?.fields) {
        setErrors(data.error.fields);
        setResult({ kind: "error", message: "Please correct the highlighted fields." });
      } else {
        setResult({
          kind: "error",
          message: data?.error?.message || "We couldn't save. Please try again.",
        });
      }
    } catch {
      setResult({
        kind: "error",
        message: "We couldn't save. Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLogoState({ busy: true, message: null });
    try {
      const data = await uploadLogo(appFetch, file);
      setLogoUrl(data.profile.logoUrl);
      setLogoState({ busy: false, message: { kind: "success", text: "Logo updated." } });
    } catch (e) {
      const text = e instanceof LogoError ? e.message : "The upload failed. Please try again.";
      setLogoState({ busy: false, message: { kind: "error", text } });
    }
  }

  async function removeLogo() {
    setLogoState({ busy: true, message: null });
    try {
      const { ok, data } = await appFetch("profile/logo", { method: "DELETE" });
      if (!ok) throw new Error();
      setLogoUrl(data.profile.logoUrl);
      setLogoState({ busy: false, message: { kind: "success", text: "Logo removed." } });
    } catch {
      setLogoState({
        busy: false,
        message: { kind: "error", text: "We couldn't remove the logo." },
      });
    }
  }

  return (
    <div className="profile-layout">
      <form className="dash-card registration-form profile-form" noValidate onSubmit={handleSubmit}>
        <div>
          <h2>Business profile</h2>
          <p className="dash-muted">
            How your business appears on every estimate you share with customers.
          </p>
        </div>

        <fieldset className="profile-section">
          <legend>Business</legend>
          <Field error={errors.businessName} id="businessName" label="Business name" required>
            {(props) => (
              <input
                {...props}
                maxLength={100}
                onChange={update("businessName")}
                value={form.businessName}
              />
            )}
          </Field>
          <Field
            error={errors.contactEmail}
            hint="Shown on estimates. Email or phone is required."
            id="contactEmail"
            label="Contact email"
          >
            {(props) => (
              <input
                {...props}
                maxLength={254}
                onChange={update("contactEmail")}
                type="email"
                value={form.contactEmail}
              />
            )}
          </Field>
          <Field error={errors.contactPhone} id="contactPhone" label="Contact phone">
            {(props) => (
              <input
                {...props}
                maxLength={20}
                onChange={update("contactPhone")}
                type="tel"
                value={form.contactPhone}
              />
            )}
          </Field>
          <Field error={errors.address} id="address" label="Address" optional>
            {(props) => (
              <textarea
                {...props}
                maxLength={300}
                onChange={update("address")}
                rows={2}
                value={form.address}
              />
            )}
          </Field>
          <Field
            error={errors.website}
            hint="Starting with https://"
            id="website"
            label="Website"
            optional
          >
            {(props) => (
              <input
                {...props}
                maxLength={200}
                onChange={update("website")}
                type="url"
                value={form.website}
              />
            )}
          </Field>
        </fieldset>

        <fieldset className="profile-section">
          <legend>Branding</legend>
          <div className="registration-field">
            <span className="profile-label">Logo</span>
            <div className="logo-row">
              {logoUrl ? (
                // Short-lived S3 link: next/image can't optimise it in a static export
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Your logo" className="logo-preview" src={logoUrl} />
              ) : (
                <span className="logo-placeholder">No logo</span>
              )}
              <div className="logo-actions">
                <label className="link-button logo-upload">
                  {logoUrl ? "Replace logo" : "Upload logo"}
                  <input
                    accept="image/png,image/jpeg"
                    className="visually-hidden"
                    disabled={logoState.busy}
                    onChange={handleLogo}
                    type="file"
                  />
                </label>
                {logoUrl && (
                  <button
                    className="link-button"
                    disabled={logoState.busy}
                    onClick={removeLogo}
                    type="button"
                  >
                    Remove
                  </button>
                )}
                <span className="field-hint">PNG or JPEG, up to 2 MB.</span>
              </div>
            </div>
            {logoState.busy && (
              <p className="field-hint" role="status">
                Uploading...
              </p>
            )}
            {logoState.message && (
              <p
                className={logoState.message.kind === "error" ? "field-error" : "field-hint"}
                role={logoState.message.kind === "error" ? "alert" : "status"}
              >
                {logoState.message.text}
              </p>
            )}
          </div>
          <Field
            error={errors.brandColour}
            hint="Used for headings on your estimates."
            id="brandColour"
            label="Brand colour"
          >
            {(props) => (
              <div className="colour-row">
                <input
                  aria-label="Pick brand colour"
                  className="colour-swatch"
                  onChange={update("brandColour")}
                  type="color"
                  value={COLOUR_RE.test(form.brandColour) ? form.brandColour : "#FF8A05"}
                />
                <input
                  {...props}
                  maxLength={7}
                  onChange={update("brandColour")}
                  value={form.brandColour}
                />
              </div>
            )}
          </Field>
        </fieldset>

        <fieldset className="profile-section">
          <legend>Estimates</legend>
          <Field
            error={errors.disclaimer}
            hint="Printed at the end of every estimate."
            id="disclaimer"
            label="Disclaimer"
          >
            {(props) => (
              <textarea
                {...props}
                maxLength={2000}
                onChange={update("disclaimer")}
                rows={4}
                value={form.disclaimer}
              />
            )}
          </Field>
          <Field
            error={errors.validityDays}
            hint="From 1 to 365 days."
            id="validityDays"
            label="Estimates are valid for (days)"
          >
            {(props) => (
              <input
                {...props}
                inputMode="numeric"
                max={365}
                min={1}
                onChange={update("validityDays")}
                type="number"
                value={form.validityDays}
              />
            )}
          </Field>
          <div className="registration-field">
            <div className="checkbox-row">
              <input
                checked={form.showItemRates}
                id="showItemRates"
                onChange={update("showItemRates")}
                type="checkbox"
              />
              <label htmlFor="showItemRates">Show item rates on the estimate PDF</label>
            </div>
          </div>
          <fieldset className="radio-group">
            <legend>Area unit</legend>
            {[
              ["sqft", "Square feet"],
              ["sqm", "Square metres"],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  checked={form.areaUnit === value}
                  name="areaUnit"
                  onChange={update("areaUnit")}
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
            <span className="field-hint">Amounts are always in Indian rupees (₹).</span>
          </fieldset>
        </fieldset>

        <div className="profile-actions">
          <button className="registration-submit" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save"}
          </button>
          <SaveResult result={result} setup={setup} />
        </div>
      </form>

      <EstimatePreview form={form} logoUrl={logoUrl} />
    </div>
  );
}

function Field({ id, label, hint, error, required, optional, children }) {
  const hintId = useId();
  const errorId = useId();
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="registration-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
        {optional && <span> (optional)</span>}
      </label>
      {children({
        id,
        name: id,
        required,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

function SaveResult({ result, setup }) {
  if (!result) return null;
  if (result.kind === "error") {
    return (
      <p className="field-error" role="alert">
        {result.message}
      </p>
    );
  }
  const pending = setup.status === "ready" && !setup.data?.complete;
  const done = setup.status === "ready" && setup.data?.complete;
  return (
    <p className="profile-saved" role="status">
      Saved. {pending && <Link href="/get-started/">Continue setup</Link>}
      {done && <Link href="/dashboard/">Go to your dashboard</Link>}
    </p>
  );
}

/** How the top of an estimate will look with these settings. */
function EstimatePreview({ form, logoUrl }) {
  const colour = COLOUR_RE.test(form.brandColour) ? form.brandColour : "#FF8A05";
  const contact = [form.contactPhone, form.contactEmail, form.website].filter(Boolean);
  const days = Number(form.validityDays);
  return (
    <aside aria-label="Estimate preview" className="dash-card estimate-preview">
      <p className="preview-label">Preview</p>
      <div className="preview-sheet" style={{ borderTopColor: colour }}>
        <div className="preview-head">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="preview-logo" src={logoUrl} />
          ) : (
            <span className="preview-logo preview-logo-empty" aria-hidden="true">
              Logo
            </span>
          )}
          <div>
            <p className="preview-business" style={{ color: colour }}>
              {form.businessName || "Your business name"}
            </p>
            {contact.length > 0 && <p className="preview-contact">{contact.join(" · ")}</p>}
            {form.address && <p className="preview-contact">{form.address}</p>}
          </div>
        </div>
        <p className="preview-title">Estimate for: Customer name</p>
        <p className="preview-meta">
          {Number.isInteger(days) && days > 0 ? `Valid for ${days} days` : "Validity not set"} ·{" "}
          {form.areaUnit === "sqm" ? "Areas in square metres" : "Areas in square feet"} ·{" "}
          {form.showItemRates ? "Item rates shown" : "Item rates hidden"}
        </p>
        {form.disclaimer && <p className="preview-disclaimer">{form.disclaimer}</p>}
      </div>
    </aside>
  );
}
