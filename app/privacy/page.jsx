import Link from "next/link";
import { LEGAL_EFFECTIVE_DATE, PRIVACY_VERSION } from "../../data/legal";

export const metadata = {
  title: "Privacy Notice | nMATIX Technologies",
  description: "How nMATIX Technologies LLP uses personal data submitted at registration.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="container registration-page">
      <article className="registration-card legal-document" aria-labelledby="privacy-title">
        <h1 id="privacy-title">Privacy Notice</h1>
        <p className="legal-version">
          Version {PRIVACY_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <p>
          This notice explains how Nmatix Technologies LLP (nMATIX, we, us or our) handles personal
          data when you register for an account on our website. It is intended to be read with our{" "}
          <Link href="/terms">Terms of Service</Link>. We handle personal data in accordance with
          applicable data protection law, including India&apos;s Digital Personal Data Protection
          Act, 2023, to the extent applicable.
        </p>

        <h2>1. Data we collect</h2>
        <p>When you register, we collect the information you provide:</p>
        <ul>
          <li>Your name and email address, to identify and contact you.</li>
          <li>Your phone number, to contact you about your account and service.</li>
          <li>Your business name, if you choose to provide it.</li>
          <li>Your acceptance of the Terms of Service and this Privacy Notice, including the versions accepted and the time of acceptance.</li>
        </ul>

        <h2>2. Why we use it</h2>
        <p>We use registration data to:</p>
        <ul>
          <li>create, verify, secure, and administer your account;</li>
          <li>send account and service communications, including verification messages;</li>
          <li>provide customer support and respond to requests;</li>
          <li>maintain a record of the terms you accepted and meet legal obligations; and</li>
          <li>protect the service, investigate misuse, and resolve disputes.</li>
        </ul>
        <p>
          We do not use your registration details for unrelated marketing without a lawful basis
          and, where required, your consent.
        </p>

        <h2>3. Where data is processed and who receives it</h2>
        <p>
          Registration data is processed by nMATIX&apos;s account service and hosted on cloud
          infrastructure operated for nMATIX. Our website infrastructure is hosted in AWS
          Asia-Pacific (Hyderabad), India. We may share the minimum data needed with service
          providers who host, secure, deliver, or support the service, and where required by law or
          to protect rights and safety. We require service providers to protect data and use it only
          for the services they provide to us.
        </p>

        <h2>4. How long we keep data</h2>
        <p>
          If you do not complete email verification, we delete your unverified registration data
          after 24 hours. For an active account, we keep registration data while the account is
          active and for as long afterwards as needed for the purposes above, legal obligations,
          or the establishment or defence of legal claims. When it is no longer needed, we delete
          it or remove identifying details, subject to any retention required by law.
        </p>

        <h2>5. Your choices and rights</h2>
        <p>
          Subject to applicable law, you may ask us for information about your personal data,
          request correction or erasure, withdraw consent where processing relies on consent, and
          raise a grievance. You may also nominate another person to exercise your rights if you
          die or become incapable. We may need to verify your identity before acting and may retain
          limited information where the law permits or requires it.
        </p>

        <h2>6. Security</h2>
        <p>
          We use reasonable technical and organisational safeguards designed to protect personal
          data. No method of transmission or storage is completely secure; please protect your
          account credentials and contact us if you suspect your account has been accessed without
          permission.
        </p>

        <h2>7. Children</h2>
        <p>
          Our registration is intended for people legally able to enter into a binding agreement.
          We do not knowingly seek personal data from children through this registration flow.
        </p>

        <h2>8. Updates and contact for questions or grievances</h2>
        <p>
          We may update this notice when our practices or legal requirements change. The current
          version and effective date appear at the top of this page. To ask a question, exercise a
          right, or raise a privacy grievance, contact Nmatix Technologies LLP using our{" "}
          <Link href="/contact">contact page</Link> or write to G701, Rajapushpa Atria, Golden Mile
          Road, Kokapet, Hyderabad, Telangana 500075, India.
        </p>
      </article>
    </main>
  );
}
