import { AppSettings, HomeCopy } from '../types';
import { defaultHomeCopy } from '../content/homeCopy';

const defaultPassphrase = (import.meta.env.VITE_ACCESS_PASSPHRASE || 'toyomi3').trim();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassphrase(passphrase: string) {
  const normalized = passphrase.trim();
  if (!normalized) return '';
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export async function buildDefaultSettings(): Promise<AppSettings> {
  return {
    id: 'global',
    homeCopy: defaultHomeCopy,
    accessPassphraseHash: await hashPassphrase(defaultPassphrase),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeHomeCopy(copy: Partial<HomeCopy> | undefined): HomeCopy {
  return {
    ...defaultHomeCopy,
    ...(copy || {}),
  };
}
