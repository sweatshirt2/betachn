import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@chorify/core';

export function ok<T>(data: T): NextResponse {
  return NextResponse.json({ data });
}

type ErrorBody = {
  code: string;
  message: string;
  missingPermission?: string;
  params?: Record<string, unknown>;
};

/**
 * Thin-controller wrapper: parse → authorize → service → serialize.
 * AppError maps 1:1 to the frozen code set (§5.8); zod failures become
 * VALIDATION_ERROR; anything else is a bug → 500 INTERNAL (outside the
 * frozen set, only reachable on server bugs; D80).
 */
export async function route<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return ok(await fn());
  } catch (error) {
    return toErrorResponse(error);
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    const body: ErrorBody = { code: error.code, message: error.message };
    const missing = error.params?.missingPermission;
    if (typeof missing === 'string') body.missingPermission = missing;
    const { missingPermission: _dropped, ...rest } = error.params ?? {};
    if (Object.keys(rest).length > 0) body.params = rest;
    return NextResponse.json({ error: body }, { status: error.httpStatus });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', params: { issues: error.issues } } },
      { status: 422 },
    );
  }
  console.error('unexpected route error', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Unexpected server error' } },
    { status: 500 },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Request body must be JSON');
  }
}
