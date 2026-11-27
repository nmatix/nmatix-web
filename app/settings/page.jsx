import SettingsIndex from "./SettingsIndex";

export const metadata = { title: "Settings | nMATIX Technologies", robots: { index: false } };

export default function SettingsPage() {
  return (
    <main className="container registration-page">
      <SettingsIndex />
    </main>
  );
}
