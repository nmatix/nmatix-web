import LoginFlow from "./LoginFlow";

export const metadata = {
  title: "Login | nMATIX Technologies",
};

export default function LoginPage() {
  return (
    <main className="container registration-page">
      <section className="registration-card login-placeholder" aria-labelledby="login-title">
        <h1 id="login-title">Login</h1>
        <LoginFlow />
      </section>
    </main>
  );
}
