import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { AuthProvider } from "./auth/AuthProvider";
import { SetupProvider } from "./auth/SetupProvider";

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
      <body>
        <AuthProvider>
          <SetupProvider>
            <Header />
            {children}
            <Footer />
          </SetupProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
