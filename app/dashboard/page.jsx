import DashboardHome from "./DashboardHome";

export const metadata = {
  title: "Dashboard | nMATIX Technologies",
  robots: { index: false },
};

// Signed-in users only (RequireAuth sends others to /login/). Dashboard epic #156.
export default function DashboardPage() {
  return (
    <main className="container registration-page">
      <DashboardHome />
    </main>
  );
}
