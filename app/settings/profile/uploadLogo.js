// Logo upload (#30, #161): ask the API for a presigned POST, upload the file straight to
// S3, then confirm it so the server can check the real file type and keep it.
export const LOGO_TYPES = ["image/png", "image/jpeg"];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export class LogoError extends Error {}

/** A message if the file can't be used as a logo, otherwise null. */
export function checkLogoFile(file) {
  if (!file) return "Choose an image to upload.";
  if (!LOGO_TYPES.includes(file.type)) return "Upload a PNG or JPEG image.";
  if (file.size > LOGO_MAX_BYTES) return "The logo must be 2 MB or smaller.";
  return null;
}

const serverMessage = (result, fallback) => result?.data?.error?.message || fallback;

/** Uploads `file` and returns the updated profile response ({ profile, saved }). */
export async function uploadLogo(appFetch, file) {
  const problem = checkLogoFile(file);
  if (problem) throw new LogoError(problem);

  const start = await appFetch("profile/logo", {
    method: "POST",
    body: { contentType: file.type },
  });
  if (!start.ok) throw new LogoError(serverMessage(start, "We couldn't start the upload."));

  const form = new FormData();
  Object.entries(start.data.upload.fields).forEach(([name, value]) => form.append(name, value));
  form.append("file", file);
  let stored;
  try {
    stored = await fetch(start.data.upload.url, { method: "POST", body: form });
  } catch {
    throw new LogoError("The upload failed. Check your connection and try again.");
  }
  if (!stored.ok) throw new LogoError("The upload failed. Please try again.");

  const confirm = await appFetch("profile/logo", { method: "PUT", body: { key: start.data.key } });
  if (!confirm.ok) throw new LogoError(serverMessage(confirm, "We couldn't use that image."));
  return confirm.data;
}
