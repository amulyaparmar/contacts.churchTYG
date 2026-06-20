import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FC Men",
  description: "FC Men links, contactbook, and conversations."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
