import { describe, expect, it } from 'vitest';
import { normalizeBusType } from '../types/booking';

describe('normalizeBusType', () => {
  it('normalizes luxury AC variants to the shared value', () => {
    expect(normalizeBusType('Luxury AC')).toBe('luxury_ac');
    expect(normalizeBusType('luxury a/c')).toBe('luxury_ac');
    expect(normalizeBusType('luxury-ac')).toBe('luxury_ac');
  });

  it('normalizes coaster and rosa variants to the shared value', () => {
    expect(normalizeBusType('Rosa / Coaster')).toBe('rosa');
    expect(normalizeBusType('rosa coaster')).toBe('rosa');
  });

  it('normalizes super long variants to the shared value', () => {
    expect(normalizeBusType('Super Long')).toBe('super_long');
    expect(normalizeBusType('super-long')).toBe('super_long');
  });
});
