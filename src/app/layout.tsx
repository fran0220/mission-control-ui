import type { Metadata } from "next";
import Link from "next/link";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mission Control | AI Agent Squad",
  description: "Command center for coordinating AI agent teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ConvexClientProvider>
          <div className="min-h-screen bg-stone-50">
            <nav className="h-12 bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40">
              <div className="h-full px-4 lg:px-6 flex items-center gap-4 text-sm font-medium text-stone-600">
                <Link href="/" className="hover:text-stone-900 transition-colors">📋 任务</Link>
                <Link href="/docs" className="hover:text-stone-900 transition-colors">📑 文档</Link>
                <Link href="/designs" className="hover:text-stone-900 transition-colors">🎨 设计</Link>
                <Link href="/cad" className="hover:text-stone-900 transition-colors">🔧 CAD</Link>
              </div>
            </nav>
            {children}
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
