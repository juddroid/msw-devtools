import { stripBaseUrl } from './handlers/matcher';
import type { MockEntry } from './handlers/registry';

export interface UnhandledRequestInput {
  method: string;
  url: string;
}

export type UnhandledMatcher = (input: UnhandledRequestInput) => MockEntry | null;

export function createUnhandledMatcher(entries: MockEntry[], baseUrl?: string): UnhandledMatcher {
  return ({ method, url }) => {
    const m = method.toUpperCase();
    const pathOnly = stripBaseUrl(url, baseUrl).split('?')[0] ?? '';
    return entries.find((e) => e.method === m && e.matcher.test(pathOnly)) ?? null;
  };
}
