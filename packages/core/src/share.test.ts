import { describe, expect, it } from 'vitest';
import { decodeShareParam, encodeShareParam } from './share';

describe('share codec', () => {
  it('roundtrips a list of mock keys', () => {
    const keys = ['GET::/users', 'POST::/users/:id'];
    const param = encodeShareParam(keys);
    expect(typeof param).toBe('string');
    expect(decodeShareParam(param)).toEqual(keys);
  });

  it('roundtrips an empty list', () => {
    const param = encodeShareParam([]);
    expect(decodeShareParam(param)).toEqual([]);
  });

  it('handles unicode in the path', () => {
    const keys = ['GET::/검색?q=한글'];
    expect(decodeShareParam(encodeShareParam(keys))).toEqual(keys);
  });

  it('returns null for malformed base64', () => {
    expect(decodeShareParam('@@@not base64@@@')).toBeNull();
  });

  it('returns null when the decoded JSON is not an array', () => {
    const param = btoa(JSON.stringify({ keys: ['x'] }));
    expect(decodeShareParam(param)).toBeNull();
  });

  it('drops non-string elements from the decoded array', () => {
    const param = btoa(JSON.stringify(['GET::/x', 42, null, 'POST::/y']));
    expect(decodeShareParam(param)).toEqual(['GET::/x', 'POST::/y']);
  });
});
