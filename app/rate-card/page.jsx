import RateCard from "./RateCard";

export const metadata = {
  title: "Rate card | nMATIX Technologies",
  robots: { index: false },
};

// Rate card (#35). Signed-in contractors only.
export default function RateCardPage() {
  return (
    <main className="container registration-page">
      <RateCard />
    </main>
  );
}
