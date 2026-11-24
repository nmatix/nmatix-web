import Link from "next/link";
import { LEGAL_EFFECTIVE_DATE, TERMS_VERSION } from "../../data/legal";

export const metadata = {
  title: "Terms of Service | nMATIX Technologies",
  description: "Terms governing use of the nMATIX website and services.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="container registration-page">
      <article className="registration-card legal-document" aria-labelledby="terms-title">
        <h1 id="terms-title">Terms of Service</h1>
        <p className="legal-version">
          Version {TERMS_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <p>
          These Terms of Service (Terms) apply to your access to and use of the nMATIX website and
          services provided by Nmatix Technologies LLP (nMATIX, we, us or our). By creating an
          account or using a service, you agree to these Terms. If you do not agree, do not create
          an account or use the service.
        </p>

        <h2>1. Eligibility and your account</h2>
        <p>
          You must be legally able to enter into a binding agreement to use our services. You agree
          to provide accurate information, keep your account credentials secure, and promptly tell
          us if you suspect unauthorised access. You are responsible for activity carried out
          through your account, except to the extent caused by our failure to meet our legal
          obligations.
        </p>

        <h2>2. Acceptable use</h2>
        <p>
          Use the services only for lawful purposes and in accordance with these Terms. Do not
          interfere with the services, try to gain unauthorised access, introduce malicious code, or
          use the services to violate another person&apos;s rights or applicable law.
        </p>

        <h2>3. Your content</h2>
        <p>
          You retain rights you hold in information and materials you submit. You allow us to host,
          process, and display that material only as needed to operate, secure, and support the
          services and as described in our <Link href="/privacy">Privacy Notice</Link>. You must
          have the rights and permissions needed to submit it.
        </p>

        <h2>4. Our services and intellectual property</h2>
        <p>
          We or our licensors own the website, software, branding, and other materials we provide,
          excluding your content. We grant you a limited, personal, non-exclusive, non-transferable
          right to use the services for their intended purpose while you comply with these Terms. We
          may change, suspend, or discontinue a feature where reasonably needed to operate or
          improve the services, meet legal requirements, or address security concerns.
        </p>

        <h2>5. Third-party services</h2>
        <p>
          The services may link to or rely on third-party products. Those products are governed by
          their own terms and privacy notices. We are not responsible for third-party services that
          we do not control.
        </p>

        <h2>6. Suspension and termination</h2>
        <p>
          You may stop using the services at any time. We may suspend or end access if you
          materially breach these Terms, use the services unlawfully, create a security risk, or
          where required by law. Where practicable, we will provide notice and an opportunity to
          address the issue. Terms that by their nature should continue after termination will
          continue to apply.
        </p>

        <h2>7. Disclaimers and liability</h2>
        <p>
          We provide the services with reasonable care and skill. Except for commitments that cannot
          be excluded under applicable law, the services are provided without guarantees that they
          will always be uninterrupted or error-free. Nothing in these Terms excludes or limits
          liability that cannot lawfully be excluded or limited. To the extent permitted by law,
          nMATIX is not liable for indirect or consequential loss arising from use of the services.
        </p>

        <h2>8. Changes to these Terms</h2>
        <p>
          We may update these Terms. We will publish the current version and effective date on this
          page. If a change requires renewed acceptance, we will ask you to review and accept the
          updated Terms before continuing to use the affected service.
        </p>

        <h2>9. Governing law and contact</h2>
        <p>
          These Terms are governed by the laws of India. Courts in Hyderabad, Telangana will have
          jurisdiction, subject to any mandatory legal requirements. For questions or grievances,
          contact Nmatix Technologies LLP through our <Link href="/contact">contact page</Link> or
          write to G701, Rajapushpa Atria, Golden Mile Road, Kokapet, Hyderabad, Telangana 500075,
          India.
        </p>
      </article>
    </main>
  );
}
