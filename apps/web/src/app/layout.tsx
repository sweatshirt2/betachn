import type { Metadata, Viewport } from 'next';
import { Fraunces, Noto_Sans_Ethiopic, Nunito_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import '../styles/globals.css';
import { Shell } from '@/components/shell';
import { Providers } from './providers';

/**
 * Self-hosted at build time (served same-origin from /_next/static/media) —
 * guarantees Ethiopic glyph coverage (micro-75) with zero external origins,
 * so CSP stays font-src 'self'. Variables feed styles/tokens.css.
 */
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-next-fraunces', display: 'swap' });
const nunitoSans = Nunito_Sans({ subsets: ['latin'], variable: '--font-next-nunito', display: 'swap' });
const notoEthiopic = Noto_Sans_Ethiopic({ subsets: ['ethiopic'], variable: '--font-next-ethiopic', display: 'swap' });

export const metadata: Metadata = {
  title: 'Chorify',
  description: 'Household operating system',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Chorify' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF6F0',
};

const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('chorify-theme');if(t==='ember'||t==='highland'||t==='family'||t==='glacier'||t==='honey'||t==='garden'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="family"
      suppressHydrationWarning
      className={`${fraunces.variable} ${nunitoSans.variable} ${notoEthiopic.variable}`}
    >
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
