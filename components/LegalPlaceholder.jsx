import Link from "next/link";

// Temporary page shown until the real legal document is published
// (tracked in interior-quote-generator-proj; replace this component's usage then).
export default function LegalPlaceholder({ id, title, version }) {
  return (
    <main className="container registration-page">
      <section className="registration-card legal-placeholder" aria-labelledby={id}>
        <h1 id={id}>{title}</h1>
        <p className="legal-version">Version {version}</p>
        <p>
          Our {title} is being finalised and will be published here before we open sign-up to the
          public.
        </p>
        <p>
          If you have questions in the meantime, please <Link href="/contact">contact us</Link>.
        </p>
      </section>
    </main>
  );
}
