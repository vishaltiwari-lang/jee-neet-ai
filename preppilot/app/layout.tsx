import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { isClerkConfigured } from "@/lib/auth/clerk";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrepPilot — AI study mentor for JEE & NEET",
  description:
    "Your personalized AI study-strategy mentor for JEE and NEET. Get smart plans, revision strategies, and motivation — without doubt-solving.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkConfigured = isClerkConfigured();
  const shell = (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );

  if (!clerkConfigured) {
    return shell;
  }

  return (
    <ClerkProvider>
      {shell}
    </ClerkProvider>
  );
}
