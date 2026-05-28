export type GroupBy = (path: string, method: string) => string;

export function inferGroup(path: string, method: string, override?: GroupBy): string {
  if (!override) return 'Other';
  try {
    const result = override(path, method);
    return result || 'Other';
  } catch {
    return 'Other';
  }
}
