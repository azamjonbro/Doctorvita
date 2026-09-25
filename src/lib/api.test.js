import { describe, it, expect } from 'vitest';
import { safeImageUrl, DEFAULT_PRODUCT_IMAGE } from './api.js';

describe('safeImageUrl', () => {
 it('returns fallback for empty image URLs', () => {
  expect(safeImageUrl('')).toBe(DEFAULT_PRODUCT_IMAGE);
  expect(safeImageUrl(null)).toBe(DEFAULT_PRODUCT_IMAGE);
  expect(safeImageUrl('   ')).toBe(DEFAULT_PRODUCT_IMAGE);
 });

 it('keeps valid http image URLs', () => {
  const url = 'https://example.com/image.jpg';
  expect(safeImageUrl(url)).toBe(url);
 });
});
