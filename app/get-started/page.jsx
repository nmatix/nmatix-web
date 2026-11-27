import GetStarted from "./GetStarted";

export const metadata = {
  title: "Get started | nMATIX Technologies",
  robots: { index: false },
};

// One-time setup (#32). Signed-in contractors only.
export default function GetStartedPage() {
  return (
    <main className="container registration-page">
      <GetStarted />
    </main>
  );
}
