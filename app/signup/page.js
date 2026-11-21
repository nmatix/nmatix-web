import Link from "next/link";
import RegistrationForm from "./RegistrationForm";

export const metadata = {
  title: "Sign-up | nMATIX Technologies",
  description: "Request access to nMATIX by registering your details.",
};

export default function SignupPage() {
  return (
    <main className="container registration-page">
      <section className="registration-card" aria-labelledby="registration-title">
        <h1 id="registration-title">Create your account</h1>
        <p className="registration-intro">
          Submit your details to request access. An administrator will review
          your registration before your account is activated.
        </p>
        <RegistrationForm />
        <p className="registration-login-prompt">
          Already registered? <Link href="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
