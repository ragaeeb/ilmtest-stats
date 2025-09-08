import "../styles/globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/components/(providers)/providers";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "IlmTest Stats",
  description: "A fast, beautiful analytics dashboard for IlmTest projects.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          <header className="border-b sticky top-0 z-40 bg-[rgb(var(--background))]/80 backdrop-blur">
            <div className="container-app flex items-center justify-between py-3 gap-4">
              <Link href="/" className="flex items-center gap-3">
                <img src="/assets/logo_horizontal.png" alt="IlmTest" className="h-8 w-auto" />
                <span className="font-semibold tracking-tight">IlmTest Stats</span>
              </Link>
              <nav className="flex items-center gap-2">
                <Link href="/api/stats" className={buttonVariants({ variant: "ghost" })}>API</Link>
                <ThemeToggle />
              </nav>
            </div>
          </header>
          {children}
          <footer className="mt-10 border-t">
            <div className="container-app py-8 text-sm text-gray-500 flex items-center justify-between">
              <p>© {new Date().getFullYear()} IlmTest</p>
              <p>Built with Next.js 15, Tailwind 4, and Recharts.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
