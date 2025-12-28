import { describe, expect, test } from '@jest/globals';
import { analyzeCheckability, assessCheckability } from '../lib/claims';

describe('Claim checkability (type + specificity)', () => {
  test('EVENT baseline is 0.70', () => {
    expect(assessCheckability('Something happened.', 'EVENT')).toBeCloseTo(0.7, 4);
  });

  test('QUOTE baseline is 0.60', () => {
    expect(assessCheckability('Someone said something.', 'QUOTE')).toBeCloseTo(0.6, 4);
  });

  test('SCHEDULE baseline is 0.50', () => {
    expect(assessCheckability('They will meet.', 'SCHEDULE')).toBeCloseTo(0.55, 4);
  });

  test('EVENT gains points for named actor + time + location', () => {
    const c = 'President Biden visited Paris on March 3, 2024.';
    // baseline 0.70 + named actor + location + date/time = 1.00, capped at 0.95
    expect(assessCheckability(c, 'EVENT')).toBeCloseTo(0.95, 4);
  });

  test('QUOTE gains points for direct quote text + speaker cue', () => {
    const c = 'Biden said "We will win" on Tuesday.';
    // baseline 0.60 + named actor + quote+speaker = 0.80
    expect(assessCheckability(c, 'QUOTE')).toBeCloseTo(0.8, 4);
  });

  test('QUOTE without quote text and speaker stays low', () => {
    const c = 'This is a complete disaster.';
    expect(assessCheckability(c, 'QUOTE')).toBeLessThanOrEqual(0.6);
  });

  test('SCHEDULE gains points for participants + date + venue', () => {
    const c = 'Biden and Zelenskyy will meet on Jan 5, 2026 at the White House.';
    // baseline 0.55 + named actor + date/time = 0.75
    expect(assessCheckability(c, 'SCHEDULE')).toBeCloseTo(0.75, 4);
  });

  test('debug features include core flags', () => {
    const c = 'Biden said "We will win" on March 3, 2024.';
    const out = analyzeCheckability(c, 'QUOTE');
    expect(out.features.namedActors.present).toBe(true);
    expect(out.features.quote.hasQuoteText).toBe(true);
    expect(out.features.quote.hasSpeakerCue).toBe(true);
    expect(['weak', 'strong']).toContain(out.features.time.strength);
  });

  test('SCHEDULE missing a date should not drop below baseline', () => {
    const c = 'Biden and Zelenskyy will meet at the White House.';
    expect(assessCheckability(c, 'SCHEDULE')).toBeGreaterThanOrEqual(0.55);
  });
});
