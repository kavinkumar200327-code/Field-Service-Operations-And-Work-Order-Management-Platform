import { describe, it, expect } from 'vitest';

export function calculateWorkOrderTotals(basePrice, hourlyRate, actualHours, partsUsed = []) {
  const laborCost = hourlyRate * actualHours;
  const partsCost = partsUsed.reduce((acc, item) => acc + (item.unit_cost * item.quantity), 0);
  const total = basePrice + laborCost + partsCost;

  return {
    laborCost: Number(laborCost.toFixed(2)),
    partsCost: Number(partsCost.toFixed(2)),
    totalCost: Number(total.toFixed(2)),
  };
}

export function calculateVariance(actual, estimated) {
  const diff = actual - estimated;
  return {
    diff: Number(diff.toFixed(2)),
    percentVariance: estimated > 0 ? Number(((diff / estimated) * 100).toFixed(1)) : 0,
    isOverBudget: diff > 0,
  };
}

describe('Financial & Parts Consumption Calculations', () => {
  it('correctly calculates comprehensive service totals', () => {
    const base = 120.0;
    const hourly = 65.0;
    const hours = 2.5; // 162.50 labor
    const parts = [
      { unit_cost: 15.0, quantity: 2 }, // 30.00
      { unit_cost: 45.0, quantity: 1 }, // 45.00
    ];

    const result = calculateWorkOrderTotals(base, hourly, hours, parts);
    expect(result.laborCost).toBe(162.50);
    expect(result.partsCost).toBe(75.00);
    expect(result.totalCost).toBe(357.50);
  });

  it('accurately identifies positive and negative financial variances', () => {
    // Actual 350 vs Estimated 300 -> +50 (+16.7%)
    const over = calculateVariance(350, 300);
    expect(over.diff).toBe(50.0);
    expect(over.percentVariance).toBe(16.7);
    expect(over.isOverBudget).toBe(true);

    // Actual 240 vs Estimated 300 -> -60 (-20.0%)
    const under = calculateVariance(240, 300);
    expect(under.diff).toBe(-60.0);
    expect(under.percentVariance).toBe(-20.0);
    expect(under.isOverBudget).toBe(false);
  });
});
