import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mixtape — make one for someone special",
  description: "Customize a cassette, add songs, write a note, and share your mixtape.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#12100e] text-cream font-mono min-h-screen">
        {children}
      </body>
    </html>
  );
}
