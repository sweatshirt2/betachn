import { FACTORY_MATRICES, PERMISSION_CATALOG } from '@chorify/core/permissions';
import { authenticate, route } from '@/lib/server';

/**
 * GET /permissions (§4.14): the full permission catalog plus the builtin
 * role-preset matrices, so mobile/online clients can render the roles editor
 * and the person permission customizer without hardcoding keys.
 */
export async function GET(req: Request) {
  return route(async () => {
    await authenticate(req);
    return { catalog: PERMISSION_CATALOG, presets: FACTORY_MATRICES };
  });
}
