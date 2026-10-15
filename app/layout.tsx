import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Passport — can they hire you from Uganda?",
  description:
    "Paste a posting, or scan remote jobs from around the world. Passport reads the advert, the company's hiring model, and the timezone math — and tells you whether they can hire you in Uganda.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}