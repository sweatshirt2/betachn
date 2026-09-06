import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';
import { Shell } from '@/components/shell';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Chorify',
  description: 'Household operating system',
  manifest: '/manifest.webmanifest',
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
