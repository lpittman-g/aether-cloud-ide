import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aether — Cloud IDE",
  description: "A Replit-style cloud IDE with Monaco, sandboxed execution, and live terminal output.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
