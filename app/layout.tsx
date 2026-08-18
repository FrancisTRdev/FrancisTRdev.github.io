import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });
const siteUrl = "https://francistr.github.io";
const defaultTitle = "Francis Tran";
const defaultDescription =
  "Francis Tran is a software engineering student and full-stack developer building modern web apps, open-source products, and AI-powered experiences.";

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Francis Tran",
  url: siteUrl,
  jobTitle: "Full-Stack Developer",
  description: defaultDescription,
  alumniOf: "University of St. Thomas",
  sameAs: [
    "https://github.com/FrancisTR",
    "https://linkedin.com/in/francistran6832",
    "https://dev.to/francistrdev",
    "https://leetcode.com/u/FrancisTRdev/",
  ],
  knowsAbout: [
    "Full-Stack Development",
    "Software Engineering",
    "React",
    "Next.js",
    "TypeScript",
    "AI Applications",
    "Open Source",
  ],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#005da8",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
  title: {
    default: defaultTitle,
    template: "%s | Francis Tran",
  },
  description: defaultDescription,
  keywords: [
    "Francis Tran",
    "Full-Stack Developer",
    "Software Engineering Student",
    "Web Development",
    "Open Source Contributor",
    "Next.js",
    "React",
    "TypeScript",
    "AI",
    "Portfolio",
  ],
  authors: [{ name: "Francis Tran" }],
  creator: "Francis Tran",
  publisher: "Francis Tran",
  applicationName: "Francis Tran Portfolio",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    locale: "en_US",
    siteName: "Francis Tran",
    type: "website",
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/GreatBall.png`,
        width: 1200,
        height: 630,
        alt: "Francis Tran - Full-Stack Developer and software engineering student",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [`${siteUrl}/GreatBall.png`],
  },
  other: {
    "theme-color": "#005da8",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }} className="scroll-smooth dark">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
