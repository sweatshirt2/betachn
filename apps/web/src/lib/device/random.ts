/**
 * WebCrypto port adapters (D67 edge): rejection-sampled A-Z strings for
 * household codes and unbiased integers — the browser twin of
 * nodeRandomSource in @chorify/db.
 */
export function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const byte of bytes) out += String.fromCharCode(65 + (byte % 26));
  return out;
}

export function randomId(): string {
  return crypto.randomUUID();
}
