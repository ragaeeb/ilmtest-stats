import '@/styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'IlmTest Stats',
    description: 'A fast, beautiful analytics dashboard for IlmTest projects.',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className="dark">
            <body className="min-h-screen">
                {children}
                <footer className="mt-10 border-t">
                    <div className="container-app flex items-center justify-between py-8 text-gray-500 text-sm">
                        <p>© {new Date().getFullYear()} IlmTest</p>
                        <p>Built with Next.js 15, Tailwind 4, and Recharts.</p>
                    </div>
                </footer>
            </body>
        </html>
    );
}
