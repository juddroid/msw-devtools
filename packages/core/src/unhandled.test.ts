import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { buildEntries } from './handlers/registry';
import { createUnhandledMatcher } from './unhandled';

const entries = buildEntries(
  [
    http.get('https://api.example.com/users/:id', () => HttpResponse.json({})),
    http.post('https://api.example.com/users', () => HttpResponse.json({})),
  ],
  { baseUrl: 'https://api.example.com' },
);

describe('createUnhandledMatcher', () => {
  const match = createUnhandledMatcher(entries, 'https://api.example.com');

  it('matches a request that fits a registered handler', () => {
    const e = match({ method: 'GET', url: 'https://api.example.com/users/42' });
    expect(e?.method).toBe('GET');
  });

  it('returns null when no entry matches', () => {
    expect(match({ method: 'DELETE', url: 'https://api.example.com/users/42' })).toBeNull();
  });

  it('strips the baseUrl before matching', () => {
    const e = match({ method: 'GET', url: '/users/42' });
    expect(e).not.toBeNull();
  });

  it('ignores the query string for matching', () => {
    expect(match({ method: 'POST', url: '/users?include=x' })).not.toBeNull();
  });
});
