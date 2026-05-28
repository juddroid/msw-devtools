import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { buildEntries } from './registry';

describe('buildEntries', () => {
  it('produces an entry per handler with method/path/key/group', () => {
    const handlers = [
      http.get('https://api.example.com/users', () => HttpResponse.json([])),
      http.post('https://api.example.com/users', () => HttpResponse.json({})),
    ];
    const entries = buildEntries(handlers, { baseUrl: 'https://api.example.com' });
    expect(entries).toHaveLength(2);

    const [a, b] = entries;
    expect(a?.method).toBe('GET');
    expect(a?.displayPath).toBe('/users');
    expect(a?.key).toBe('GET::https://api.example.com/users');
    expect(a?.group).toBe('Other');
    expect(b?.method).toBe('POST');
  });

  it('uses the supplied groupBy', () => {
    const handlers = [http.get('/admin/x', () => HttpResponse.json({}))];
    const entries = buildEntries(handlers, {
      groupBy: (path) => (path.startsWith('/admin') ? 'Admin' : 'Other'),
    });
    expect(entries[0]?.group).toBe('Admin');
  });

  it('skips handlers without info and warns', () => {
    const bad = { not: 'a handler' } as unknown as Parameters<typeof buildEntries>[0][number];
    const handlers = [http.get('/x', () => HttpResponse.json({})), bad];
    const entries = buildEntries(handlers, {});
    expect(entries).toHaveLength(1);
  });
});
