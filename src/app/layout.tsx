import type { Metadata } from "next";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "RailCertSafe",
  description: "Rail compliance intake, certification tracking, and operational review workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthSessionSync />
        {children}
      </body>
    </html>
  );
}
