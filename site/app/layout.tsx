import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MatAnalytics - NCAA D1 Wrestling Stats Dashboard",
  description: "Zero-cost dashboards for NCAA D1 wrestling stats. Weekly local ETL in Python → static artifacts → Cloudflare Pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="text-xl font-bold text-gray-900">
                🏆 MatAnalytics
              </Link>
              <div className="flex space-x-6">
                <Link 
                  href="/" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Home
                </Link>
                <Link 
                  href="/teams" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Duals
                </Link>
                <Link 
                  href="/team-stats" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Team Stats
                </Link>
                <Link 
                  href="/wrestlers" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Wrestlers
                </Link>
                <Link 
                  href="/dominance" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dominance
                </Link>
                <Link 
                  href="/weights" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Weights
                </Link>
                <Link 
                  href="/about" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  About
                </Link>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
