import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { AuthProvider } from '@/components/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UE-Bot Dashboard',
  description: 'Control panel for UE-Bot - AI Assistant with ESP32 voice control',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="min-h-screen bg-background">{children}</div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
