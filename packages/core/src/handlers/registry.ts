import type { RequestHandler } from 'msw';
import { type GroupBy, inferGroup } from './grouping';
import { type MockKey, getMockKey, pathToMatcher, stripBaseUrl } from './matcher';

export interface MockEntry {
  key: MockKey;
  method: string;
  path: string;
  displayPath: string;
  group: string;
  matcher: RegExp;
  handler: RequestHandler;
}

export interface BuildEntriesOptions {
  baseUrl?: string;
  groupBy?: GroupBy;
}

interface HandlerInfo {
  method?: string | RegExp;
  path?: string | RegExp;
}

function readInfo(handler: RequestHandler): HandlerInfo | null {
  const info = (handler as unknown as { info?: HandlerInfo }).info;
  if (!info || (info.method === undefined && info.path === undefined)) return null;
  return info;
}

export function buildEntries(handlers: RequestHandler[], opts: BuildEntriesOptions): MockEntry[] {
  const entries: MockEntry[] = [];
  for (const handler of handlers) {
    const info = readInfo(handler);
    if (!info || info.method === undefined || info.path === undefined) continue;
    const method = String(info.method).toUpperCase();
    const path = String(info.path);
    const displayPath = stripBaseUrl(path, opts.baseUrl);
    entries.push({
      key: getMockKey(method, path),
      method,
      path,
      displayPath,
      group: inferGroup(displayPath, method, opts.groupBy),
      matcher: pathToMatcher(info.path, opts.baseUrl),
      handler,
    });
  }
  return entries;
}
