import Link from "next/link";
import SignupFlow from "./SignupFlow";

export const metadata = {
  title: "Sign-up | nMATIX Technologies",
  description: "Create your nMATIX account to start using Interior Quote Generator.",
};

export default function SignupPage() {
  return (
    <main className="container registration-page">
      <section className="registration-card" aria-labelledby="registration-title">
        <h1 id="registration-title">Create your account</h1>
        <SignupFlow />
        <p className="registration-login-prompt">
          Already registered? <Link href="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
