import { describe, expect, it } from 'vitest';
import { getMockKey, pathToMatcher, stripBaseUrl } from './matcher';

describe('getMockKey', () => {
  it('lowercases method? no — uppercases to keep canonical form', () => {
    expect(getMockKey('get', '/users')).toBe('GET::/users');
  });

  it('accepts already-uppercase method', () => {
    expect(getMockKey('POST', '/users')).toBe('POST::/users');
  });

  it('serializes RegExp paths', () => {
    expect(getMockKey('GET', /^\/users\/\d+$/)).toBe('GET::/^\\/users\\/\\d+$/');
  });
});

describe('stripBaseUrl', () => {
  it('removes the base prefix', () => {
    expect(stripBaseUrl('https://api.example.com/users', 'https://api.example.com')).toBe('/users');
  });

  it('returns the input unchanged when no base is given', () => {
    expect(stripBaseUrl('/users', undefined)).toBe('/users');
  });

  it('returns the input unchanged when the base does not match', () => {
    expect(stripBaseUrl('/users', 'https://api.example.com')).toBe('/users');
  });
});

describe('pathToMatcher', () => {
  it('matches a literal path', () => {
    const re = pathToMatcher('/users');
    expect(re.test('/users')).toBe(true);
    expect(re.test('/usersx')).toBe(false);
  });

  it('matches path params (:id) against any non-slash segment', () => {
    const re = pathToMatcher('/users/:id');
    expect(re.test('/users/42')).toBe(true);
    expect(re.test('/users/abc-def')).toBe(true);
    expect(re.test('/users/42/posts')).toBe(false);
  });

  it('matches wildcard (*) as .*', () => {
    const re = pathToMatcher('/static/*');
    expect(re.test('/static/a/b/c.js')).toBe(true);
  });

  it('strips baseUrl before building regex', () => {
    const re = pathToMatcher('https://api.example.com/users/:id', 'https://api.example.com');
    expect(re.test('/users/7')).toBe(true);
  });

  it('passes a query string through', () => {
    const re = pathToMatcher('/users');
    expect(re.test('/users?page=1')).toBe(true);
  });

  it('returns RegExp inputs unchanged', () => {
    const input = /^\/x$/;
    expect(pathToMatcher(input)).toBe(input);
  });
});
