import { describe, it, expect } from 'vitest';

/**
 * Scheduling conflict and interval calculation algorithms
 */
export function hasOverlap(startA, endA, startB, endB) {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  // Two open intervals (sA, eA) and (sB, eB) overlap iff sA < eB && eA > sB
  return sA < eB && eA > sB;
}

export function isWithinWorkingHours(timeStr, workStart = "08:00", workEnd = "18:00") {
  const [h, m] = timeStr.split(':').map(Number);
  const [startH, startM] = workStart.split(':').map(Number);
  const [endH, endM] = workEnd.split(':').map(Number);

  const curMinutes = h * 60 + m;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return curMinutes >= startMinutes && curMinutes <= endMinutes;
}

describe('Field Service Scheduling Conflict Logic', () => {
  it('correctly detects overlapping work order appointments', () => {
    // 09:00 to 11:00 vs 10:00 to 12:00 -> OVERLAP
    const conflict = hasOverlap(
      '2026-10-30T09:00:00Z',
      '2026-10-30T11:00:00Z',
      '2026-10-30T10:00:00Z',
      '2026-10-30T12:00:00Z'
    );
    expect(conflict).toBe(true);
  });

  it('permits back-to-back non-overlapping appointments', () => {
    // 09:00 to 10:00 vs 10:00 to 11:00 -> NO OVERLAP
    const conflict = hasOverlap(
      '2026-10-30T09:00:00Z',
      '2026-10-30T10:00:00Z',
      '2026-10-30T10:00:00Z',
      '2026-10-30T11:00:00Z'
    );
    expect(conflict).toBe(false);
  });

  it('detects fully enclosed appointments', () => {
    // 09:00 to 14:00 vs 10:00 to 11:00 -> OVERLAP
    const conflict = hasOverlap(
      '2026-10-30T09:00:00Z',
      '2026-10-30T14:00:00Z',
      '2026-10-30T10:00:00Z',
      '2026-10-30T11:00:00Z'
    );
    expect(conflict).toBe(true);
  });

  it('validates working hours constraints accurately', () => {
    expect(isWithinWorkingHours('09:30', '08:00', '18:00')).toBe(true);
    expect(isWithinWorkingHours('07:59', '08:00', '18:00')).toBe(false);
    expect(isWithinWorkingHours('18:01', '08:00', '18:00')).toBe(false);
    expect(isWithinWorkingHours('18:00', '08:00', '18:00')).toBe(true);
  });
});
