import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptFixer · AI Command Center",
  description:
    "Mission control for AI workflows. Route, supervise and deploy execution-ready prompts to Claude, ChatGPT, Cursor and agents.",
  applicationName: "PromptFixer · AI Command Center"
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
