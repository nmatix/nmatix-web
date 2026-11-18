
import "./globals.css";

export const metadata = {
  title: "nMATIX Technologies",
  description:
    "Innovative technology solutions, software development, consulting, cloud services and AI solutions.",
  icons: {
    icon: "/images/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
