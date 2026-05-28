export type MockKey = string;

export function getMockKey(method: string | RegExp, path: string | RegExp): MockKey {
  return `${String(method).toUpperCase()}::${String(path)}`;
}

export function stripBaseUrl(rawPath: string, baseUrl?: string): string {
  if (!baseUrl) return rawPath;
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  if (base && rawPath.startsWith(base)) {
    const tail = rawPath.slice(base.length);
    return tail || '/';
  }
  return rawPath;
}

const REGEX_META = /[.+*^${}()|[\]\\]/g;
const PATH_PARAM = /:([a-zA-Z_]\w*)/g;
const ESCAPED_STAR = /\\\*/g;

export function pathToMatcher(rawPath: string | RegExp, baseUrl?: string): RegExp {
  if (rawPath instanceof RegExp) return rawPath;
  const stripped = stripBaseUrl(rawPath, baseUrl);
  const escaped = stripped
    .replace(REGEX_META, '\\$&')
    .replace(PATH_PARAM, '[^/]+')
    .replace(ESCAPED_STAR, '.*');
  return new RegExp(`^${escaped}(?:\\?.*)?$`);
}
