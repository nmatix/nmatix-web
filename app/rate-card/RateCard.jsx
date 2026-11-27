"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import RequireProduct from "../auth/RequireProduct";
import { PRODUCT, useSetup } from "../auth/SetupProvider";
import { formatDateTime } from "../dashboard/format";
import { openDownload } from "./download";
import { RateCardError, checkRateCardFile, uploadRateCard } from "./uploadRateCard";

const PREVIEW_ROWS = 10;
const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/**
 * Rate card (#35; RC-02, PRD 7.3). Shows the published version and any draft waiting,
 * downloads the template (#34) and uploads a file into the draft (#163). Uploading never
 * publishes: checking and publishing the draft are #37 and #40.
 */
function RateCardContent() {
  const { appFetch } = useAuth();
  const setup = useSetup();
  const [load, setLoad] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const loadDraft = useCallback(async () => {
    const { ok, data } = await appFetch("rate-card/draft");
    return ok ? data : null;
  }, [appFetch]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const summary = await appFetch("rate-card");
        if (!summary.ok) throw new Error();
        const draft = summary.data.draft ? await loadDraft() : null;
        if (active) setLoad({ status: "ready", published: summary.data.published, draft });
      } catch {
        if (active) setLoad({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, [appFetch, loadDraft, attempt]);

  async function handleUploaded(result) {
    const draft = (await loadDraft().catch(() => null)) || { draft: result.draft, rows: [] };
    setLoad((current) => ({ ...current, draft }));
    setup.refresh();
  }

  return (
    <div className="dashboard rate-card">
      <div className="dashboard-header">
        <h1 id="rate-card-title">Rate card</h1>
        <p>Your price for every item. Estimates are priced from the published version.</p>
      </div>

      {load.status === "loading" && (
        <p className="auth-loading" role="status" aria-live="polite">
          Loading your rate card...
        </p>
      )}
      {load.status === "error" && (
        <section className="dash-card" role="alert">
          <h2>We couldn&apos;t load your rate card</h2>
          <p>Check your connection and try again.</p>
          <button className="link-button" onClick={() => setAttempt((n) => n + 1)} type="button">
            Try again
          </button>
        </section>
      )}
      {load.status === "ready" && (
        <>
          <StatusCard draft={load.draft?.draft} published={load.published} />
          <UploadCard hasDraft={Boolean(load.draft)} onUploaded={handleUploaded} />
          {load.draft && <DraftCard draft={load.draft.draft} rows={load.draft.rows} />}
        </>
      )}
    </div>
  );
}

export default function RateCard() {
  return (
    <RequireProduct product={PRODUCT}>
      <RateCardContent />
    </RequireProduct>
  );
}

function StatusCard({ published, draft }) {
  return (
    <section aria-labelledby="rate-card-status" className="dash-card">
      <h2 id="rate-card-status">Status</h2>
      <dl className="rc-status">
        <div>
          <dt>Published</dt>
          <dd>
            {published?.version ? (
              <>
                Version {published.version}
                {published.publishedAt && ` · ${formatDateTime(published.publishedAt)}`}
              </>
            ) : (
              <span className="dash-muted">
                Nothing published yet. Estimates can&apos;t be priced until you publish a rate card.
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Draft</dt>
          <dd>
            {draft ? (
              <>
                <span className="rc-pill">Waiting</span> {draft.fileName} · {draft.rowCount}{" "}
                {draft.rowCount === 1 ? "item" : "items"} · uploaded{" "}
                {formatDateTime(draft.uploadedAt)}
              </>
            ) : (
              <span className="dash-muted">No draft. Upload a file to start one.</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function UploadCard({ hasDraft, onUploaded }) {
  const { appFetch } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null); // { stage, value } while busy
  const [message, setMessage] = useState(null);
  const [template, setTemplate] = useState({ busy: false, error: null });

  async function downloadTemplate() {
    setTemplate({ busy: true, error: null });
    try {
      const { ok, data } = await appFetch("rate-card/template");
      if (!ok) throw new Error();
      openDownload(data.url);
      setTemplate({ busy: false, error: null });
    } catch {
      setTemplate({ busy: false, error: "We couldn't get the template. Please try again." });
    }
  }

  async function upload(file) {
    if (progress) return;
    const problem = checkRateCardFile(file);
    if (problem) {
      setMessage({ kind: "error", text: problem });
      return;
    }
    setMessage(null);
    setProgress({ stage: "uploading", value: 0 });
    try {
      const result = await uploadRateCard(appFetch, file, (stage, value) =>
        setProgress({ stage, value })
      );
      await onUploaded(result);
      const n = result.draft.rowCount;
      setMessage({
        kind: "success",
        text: `Read ${n} ${n === 1 ? "item" : "items"} from ${result.draft.fileName}. Saved as your draft; nothing is published yet.`,
      });
    } catch (e) {
      setMessage(
        e instanceof RateCardError
          ? { kind: "error", text: e.message, details: e.details }
          : { kind: "error", text: "The upload failed. Check your connection and try again." }
      );
    } finally {
      setProgress(null);
    }
  }

  function handleInput(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) upload(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) upload(file);
  }

  const busy = Boolean(progress);
  return (
    <section aria-labelledby="rate-card-upload" className="dash-card">
      <h2 id="rate-card-upload">Upload your rates</h2>
      <ol className="rc-steps">
        <li>
          <p>
            Download the template and fill in your items and rates. You can also use your own sheet
            if its headings match the template.
          </p>
          <button
            className="link-button"
            disabled={template.busy}
            onClick={downloadTemplate}
            type="button"
          >
            {template.busy ? "Preparing..." : "Download template (.xlsx)"}
          </button>
          {template.error && (
            <p className="field-error" role="alert">
              {template.error}
            </p>
          )}
        </li>
        <li>
          <p>
            Upload the file.{" "}
            {hasDraft &&
              "A new file replaces the draft waiting; your published rates stay as they are."}
          </p>
          <div
            className={`rc-dropzone${dragging ? " is-dragging" : ""}${busy ? " is-busy" : ""}`}
            data-testid="rate-card-dropzone"
            onDragLeave={() => setDragging(false)}
            onDragOver={(event) => {
              event.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDrop={handleDrop}
          >
            {busy ? (
              <UploadProgress progress={progress} />
            ) : (
              <>
                <p>Drag your file here, or</p>
                <label className="dash-button rc-choose">
                  Choose file
                  <input
                    accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    aria-label="Choose rate card file"
                    className="visually-hidden"
                    onChange={handleInput}
                    type="file"
                  />
                </label>
                <p className="field-hint">.xlsx or .csv, up to 5 MB and 2,000 items.</p>
              </>
            )}
          </div>
          <UploadMessage message={message} />
        </li>
      </ol>
    </section>
  );
}

function UploadProgress({ progress }) {
  const reading = progress.stage === "reading";
  const percent = Math.round((progress.value || 0) * 100);
  return (
    <div className="rc-progress" role="status" aria-live="polite">
      <p>{reading ? "Reading your file..." : `Uploading... ${percent}%`}</p>
      <progress
        aria-label={reading ? "Reading your file" : "Upload progress"}
        max={100}
        value={reading ? undefined : percent}
      />
    </div>
  );
}

function UploadMessage({ message }) {
  if (!message) return null;
  if (message.kind === "success") {
    return (
      <p className="profile-saved" role="status">
        {message.text}
      </p>
    );
  }
  const found = message.details?.headersFound;
  return (
    <div className="rc-error" role="alert">
      <p className="field-error">{message.text}</p>
      {found?.length > 0 && <p className="field-hint">Headings we found: {found.join(", ")}</p>}
    </div>
  );
}

const PREVIEW_COLUMNS = [
  ["itemCode", "Item code"],
  ["name", "Item"],
  ["unit", "Unit"],
  ["rateBasic", "Basic", "num"],
  ["rateStandard", "Standard", "num"],
  ["ratePremium", "Premium", "num"],
];

function cell(row, key, isRate) {
  const raw = row.raw?.[key];
  if (raw !== undefined) return <span className="rc-unread">{String(raw)} (can&apos;t read)</span>;
  const value = row.values?.[key];
  if (value === undefined || value === null || value === "") {
    return isRate ? <span className="dash-muted">To be priced</span> : "";
  }
  return isRate && typeof value === "number" ? rupees.format(value) : String(value);
}

function DraftCard({ draft, rows }) {
  const shown = rows.slice(0, PREVIEW_ROWS);
  return (
    <section aria-labelledby="rate-card-draft" className="dash-card">
      <div className="dash-card-head">
        <div className="dash-card-titles">
          <h2 id="rate-card-draft">Draft: {draft.fileName}</h2>
          <p>
            {draft.rowCount} {draft.rowCount === 1 ? "item" : "items"} read
            {draft.sheet ? ` from the “${draft.sheet}” sheet` : ""}. Not published.
          </p>
        </div>
      </div>
      {draft.ignoredColumns?.length > 0 && (
        <p className="field-hint">Columns not used: {draft.ignoredColumns.join(", ")}</p>
      )}
      {shown.length > 0 && (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <caption className="visually-hidden">First items in the draft</caption>
            <thead>
              <tr>
                <th scope="col">Row</th>
                {PREVIEW_COLUMNS.map(([key, label, cls]) => (
                  <th className={cls} key={key} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.row}>
                  <td>{row.row}</td>
                  {PREVIEW_COLUMNS.map(([key, , cls]) => (
                    <td className={cls} key={key}>
                      {cell(row, key, cls === "num")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="dash-soon rc-next">
        {rows.length > shown.length && `Showing the first ${shown.length} of ${rows.length}. `}
        Next: check the draft for errors and publish it (coming soon).
      </p>
    </section>
  );
}
