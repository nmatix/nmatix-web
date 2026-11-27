import SettingsShell from "../SettingsShell";
import BusinessProfile from "./BusinessProfile";

export const metadata = {
  title: "Business profile | Settings | nMATIX Technologies",
  robots: { index: false },
};

// Settings › Business profile (#30). Signed-in contractors only.
export default function BusinessProfilePage() {
  return (
    <main className="container registration-page">
      <SettingsShell section="profile">
        <BusinessProfile />
      </SettingsShell>
    </main>
  );
}
