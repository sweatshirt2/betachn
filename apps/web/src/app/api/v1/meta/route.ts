import { getGoogleConfig, route } from '@/lib/server';

/**
 * GET /meta (§4.14): static client config — locales, currencies, the Ethiopia
 * starter profile, and Google sign-in availability. Public by design: the
 * login screen reads it before any session exists, and the only deployment
 * detail it exposes is the OAuth client id, which is public in every
 * authorize URL anyway. No user or household data lives here.
 */
export async function GET() {
  return route(async () => {
    const google = getGoogleConfig();
    return {
      locales: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
      ],
      currencies: [{ code: 'ETB', label: 'Birr', symbol: 'ብር', default: true }],
      googleEnabled: google !== null,
      googleClientId: google?.clientId ?? null,
      starterProfile: {
        key: 'ethiopia',
        currency: 'ETB',
        locales: ['en', 'am'],
        calendar: 'both',
        shoppingCategories: ['market', 'local_shop', 'supermarket', 'pharmacy', 'bakery', 'online', 'custom'],
      },
    };
  });
}
