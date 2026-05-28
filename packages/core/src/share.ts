import type { MockKey } from './handlers/matcher';

export function encodeShareParam(keys: MockKey[]): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(keys))));
  } catch {
    return '';
  }
}

export function decodeShareParam(param: string): MockKey[] | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(param))));
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return null;
  }
}
