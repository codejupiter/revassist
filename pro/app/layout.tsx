import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RevAssist Pro",
  description: "Fullstack AI deal desk OS for powersports dealership F&I teams.",
  metadataBase: new URL("https://revassist-pro.local"),
  openGraph: {
    title: "RevAssist Pro",
    description: "Structured AI workflows for powersports F&I teams.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
