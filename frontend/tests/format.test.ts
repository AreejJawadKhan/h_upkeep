import { describe, expect, test } from 'vitest';
import { formatDate } from '../src/lib/format';

describe('formatDate', () => {
  test('formats valid ISO dates', () => {
    expect(formatDate('2026-08-28')).toBe('Aug 28, 2026');
  });

  test('returns a fallback for empty values', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  test('returns a fallback for malformed values', () => {
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDate('2026-13-40')).toBe('—');
  });
});
