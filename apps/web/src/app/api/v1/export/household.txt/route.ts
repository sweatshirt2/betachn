import {
  authenticate,
  portabilityService,
  requirePermission,
  route,
  toErrorResponse,
} from '@/lib/server';

export async function GET(req: Request) {
  try {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'household.view_people');
    const { text, filename } = await portabilityService.exportHousehold(ctx.session.householdId);
    return new Response(text, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
