import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neuralis Black - GEO Intelligence Platform",
  description: "AI-powered Generative Engine Optimization audit platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
