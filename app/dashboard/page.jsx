import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Dashboard preview | nMATIX Technologies",
};

export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="container registration-page">
      <section className="registration-card" aria-labelledby="dashboard-title">
        <h1 id="dashboard-title">Dashboard preview</h1>
        <p>You completed the local sign-in preview. No account session was created.</p>
        <p>Your subscribed products will appear here when the account service is connected.</p>
        <Link href="/products/interior-quote-generator">Explore products</Link>
      </section>
    </main>
  );
}
