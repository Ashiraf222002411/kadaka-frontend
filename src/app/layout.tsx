import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Kadaka | Lending Management System",
  description:
    "Digitize and streamline the lending lifecycle for Kadaka Establishment Co. (U) LTD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
