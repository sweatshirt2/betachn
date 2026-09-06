import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';
import { Shell } from '@/components/shell';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Chorify',
  description: 'Household operating system',
  manifest: '/manifest.webmanifest',
  themeColor: '#FAF6F0',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Chorify' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('chorify-theme');if(t==='ember'||t==='highland'||t==='family'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="family" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
