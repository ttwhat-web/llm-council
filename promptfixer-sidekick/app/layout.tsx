import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "operator.center · AI Command Center",
  description:
    "The AI command center for shipping work, not prompting. Turn messy prompts, screenshots, logs and ideas into named, replayable, audited missions — across every model.",
  applicationName: "operator.center"
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1
};

const CLERK_PUBLISHABLE = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ClerkProvider only mounts when a publishable key is configured,
  // so anonymous local dev keeps working without it. The auth seam
  // (lib/auth/identity.ts) returns null when Clerk isn't wired.
  const body = (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
  if (!CLERK_PUBLISHABLE) return body;
  return <ClerkProvider>{body}</ClerkProvider>;
}
