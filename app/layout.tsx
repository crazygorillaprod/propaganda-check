import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Know Your Rights — Legal & Civic Survival Guide",
  description: "A practical legal and civic survival guide for Black men in America. Know what to say, what not to say, and how to protect yourself.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
