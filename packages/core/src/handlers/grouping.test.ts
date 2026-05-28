import { describe, expect, it } from 'vitest';
import { inferGroup } from './grouping';

describe('inferGroup', () => {
  it('returns "Other" by default for any path', () => {
    expect(inferGroup('/users', 'GET')).toBe('Other');
    expect(inferGroup('/admin/contests', 'POST')).toBe('Other');
  });

  it('uses the override when supplied', () => {
    const groupBy = (path: string) => (path.startsWith('/admin') ? 'Admin' : 'User');
    expect(inferGroup('/admin/x', 'GET', groupBy)).toBe('Admin');
    expect(inferGroup('/users', 'GET', groupBy)).toBe('User');
  });

  it('falls back to "Other" when the override returns an empty string', () => {
    expect(inferGroup('/x', 'GET', () => '')).toBe('Other');
  });

  it('falls back to "Other" when the override throws', () => {
    expect(inferGroup('/x', 'GET', () => { throw new Error('boom'); })).toBe('Other');
  });
});
