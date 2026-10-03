import { CANONICAL_ORIGIN } from '@/analytics';
import { HANDLE_RE, normalizeHandle } from '@/types';

/** Deep link a phone camera can open; the app reads the handle from `/add/:handle`. */
export const friendLink = (handle: string) => `${CANONICAL_ORIGIN || window.location.origin}/add/${handle}`;

/** Handle from a scanned QR text: our deep link, an `@handle` or a bare handle. */
export function handleFromScan(text: string): string | null {
  const raw = text.trim();
  const m = /\/add\/([^/?#]+)/.exec(raw);
  const handle = normalizeHandle(m ? decodeURIComponent(m[1]) : raw);
  return HANDLE_RE.test(handle) ? handle : null;
}
