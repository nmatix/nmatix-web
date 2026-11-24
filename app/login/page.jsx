import Link from "next/link";

export const metadata = {
  title: "Login | nMATIX Technologies",
};

export default function LoginPage() {
  return (
    <main className="container registration-page">
      <section className="registration-card login-placeholder" aria-labelledby="login-title">
        <h1 id="login-title">Login</h1>
        <p>Login access will be available after account activation.</p>
        <p>
          New to nMATIX? <Link href="/signup">Sign-up</Link>
        </p>
      </section>
    </main>
  );
}
