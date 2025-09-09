import '@/styles/globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import pkg from '@/../package.json';

export const metadata: Metadata = {
    title: 'IlmTest Stats',
    description: 'A fast, beautiful analytics dashboard for IlmTest projects.',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const version = pkg.version;
    const homepage = pkg.homepage;
    const versionUrl = `${homepage}/releases/tag/v${version}`;
    return (
        <html lang="en" suppressHydrationWarning className="dark">
            <body className="min-h-screen">
                {children}
                <footer className="mt-10 border-t">
                    <div className="container-app flex items-center justify-between py-8 text-gray-500 text-sm">
                        <p>© {new Date().getFullYear()} IlmTest. All Rights Reserved.</p>
                        <p>
                            <Link href={versionUrl} className="underline" target="_blank">
                                v{version}
                            </Link>
                        </p>
                    </div>
                </footer>
            </body>
        </html>
    );
}
