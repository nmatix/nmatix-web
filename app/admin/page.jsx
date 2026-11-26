import AdminHome from "./AdminHome";

export const metadata = {
  title: "Admin | nMATIX Technologies",
  robots: { index: false },
};

// Platform admins only (RequireAdmin). User administration screens are epic #128.
export default function AdminPage() {
  return (
    <main className="container registration-page">
      <AdminHome />
    </main>
  );
}
