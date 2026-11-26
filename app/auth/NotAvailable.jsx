import Link from "next/link";

/** Shown instead of a page the signed-in user may not open (the "403" view, #133). */
export default function NotAvailable({ message }) {
  return (
    <section className="registration-card" aria-labelledby="not-available-title">
      <h1 id="not-available-title">Not available</h1>
      <p>{message}</p>
      <Link href="/dashboard/">Back to your dashboard</Link>
    </section>
  );
}
