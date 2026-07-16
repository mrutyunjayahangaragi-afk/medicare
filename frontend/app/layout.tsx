import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Medicare — AI-Powered Emergency Assistance",
  description:
    "Medicare connects users with emergency support, nearby hospitals, AI-based guidance, and live response services when every second matters.",
  keywords: [
    "emergency assistance",
    "AI health",
    "SOS",
    "ambulance tracking",
    "medicare",
    "emergency response",
  ],
  authors: [{ name: "Medicare Team" }],
  openGraph: {
    title: "Medicare — AI-Powered Emergency Assistance",
    description:
      "Get help instantly. Save lives. AI, real-time tracking & smart alerts when every second matters.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`} data-scroll-behavior="smooth">
      <body className="min-h-screen bg-white text-slate-900 antialiased" suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
