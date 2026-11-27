// Rate card upload (#35, #163; RC-02): ask the API for a presigned POST, send the file
// straight to S3 (with progress), then ask the server to read it into the draft.
// Nothing is published by uploading.
export const RATE_CARD_EXTENSIONS = ["xlsx", "csv"];
export const RATE_CARD_MAX_BYTES = 5 * 1024 * 1024;

export class RateCardError extends Error {
  constructor(message, details = null) {
    super(message);
    this.details = details;
  }
}

function extension(name) {
  const dot = typeof name === "string" ? name.lastIndexOf(".") : -1;
  return dot > 0
    ? name
        .slice(dot + 1)
        .trim()
        .toLowerCase()
    : "";
}

/** A message if the file can't be uploaded as a rate card, otherwise null. */
export function checkRateCardFile(file) {
  if (!file) return "Choose a file to upload.";
  const ext = extension(file.name);
  if (ext === "xls") return "Old .xls files can't be read. Save it as .xlsx and upload again.";
  if (!RATE_CARD_EXTENSIONS.includes(ext)) return "Upload an .xlsx or .csv file.";
  if (file.size === 0) return "This file is empty. Add your items and upload again.";
  if (file.size > RATE_CARD_MAX_BYTES) return "The file must be 5 MB or smaller.";
  return null;
}

const serverMessage = (result, fallback) => result?.data?.error?.message || fallback;

/** POSTs the form to S3, reporting progress (0-1). Resolves true when S3 accepted it. */
export function postWithProgress(url, form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(form);
  });
}

/**
 * Uploads `file` and returns the new draft ({ draft }). `onStage` is told "uploading"
 * (with progress 0-1) and then "reading" while the server parses the file.
 */
export async function uploadRateCard(appFetch, file, onStage = () => {}) {
  const problem = checkRateCardFile(file);
  if (problem) throw new RateCardError(problem);

  onStage("uploading", 0);
  const start = await appFetch("rate-card/uploads", {
    method: "POST",
    body: { fileName: file.name },
  });
  if (!start.ok) throw new RateCardError(serverMessage(start, "We couldn't start the upload."));

  const form = new FormData();
  Object.entries(start.data.upload.fields).forEach(([name, value]) => form.append(name, value));
  form.append("file", file);
  let stored;
  try {
    stored = await postWithProgress(start.data.upload.url, form, (p) => onStage("uploading", p));
  } catch {
    throw new RateCardError("The upload failed. Check your connection and try again.");
  }
  if (!stored) throw new RateCardError("The upload failed. Please try again.");

  onStage("reading", 1);
  const read = await appFetch("rate-card/draft", {
    method: "PUT",
    body: { key: start.data.key, fileName: file.name },
  });
  if (!read.ok) {
    throw new RateCardError(
      serverMessage(read, "We couldn't read that file. Please try again."),
      read.data?.error?.details || null
    );
  }
  return read.data;
}
