import { describe, it, expect } from 'vitest';
import { filterExpenses } from '../lib/filter-expenses';

const sample = [
  { _id: '1', date: '2025-03-01', merchant: 'Apple Store', category: 'Shopping', total: 100, createdByUserId: 'u1' },
  { _id: '2', date: '2025-03-10', merchant: 'Zoom', category: 'Utilities', total: 20, createdByUserId: 'u2' },
  { _id: '3', date: '2025-04-05', merchant: 'Trader Joes', category: 'Groceries', total: 50, createdByUserId: 'u1' },
  { _id: '4', date: '2025-04-15', merchant: 'Best Buy', category: 'Shopping', total: 200, createdByUserId: 'u2' }
];

describe('filterExpenses', () => {
  it('returns all expenses when no filters are applied', () => {
    const result = filterExpenses(sample, {});
    expect(result).toHaveLength(4);
  });

  it('filters by category', () => {
    const result = filterExpenses(sample, { category: 'Shopping' });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e._id)).toEqual(['4', '1']);
  });

  it('filters by merchant search (case-insensitive)', () => {
    const result = filterExpenses(sample, { search: 'apple' });
    expect(result).toHaveLength(1);
    expect(result[0].merchant).toBe('Apple Store');
  });

  it('filters by date range', () => {
    const result = filterExpenses(sample, {
      dateFrom: '2025-03-05',
      dateTo: '2025-04-10'
    });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e._id)).toEqual(['3', '2']);
  });

  it('sorts by date ascending', () => {
    const result = filterExpenses(sample, { sort: 'date-asc' });
    expect(result[0].merchant).toBe('Apple Store'); // March 1
    expect(result[3].merchant).toBe('Best Buy'); // April 15
  });

  it('sorts by amount descending', () => {
    const result = filterExpenses(sample, { sort: 'amount-desc' });
    expect(result[0].total).toBe(200); // Best Buy
    expect(result[3].total).toBe(20); // Zoom
  });

  it('sorts by merchant name ascending', () => {
    const result = filterExpenses(sample, { sort: 'merchant-asc' });
    expect(result[0].merchant).toBe('Apple Store');
    expect(result[1].merchant).toBe('Best Buy');
    expect(result[2].merchant).toBe('Trader Joes');
    expect(result[3].merchant).toBe('Zoom');
  });

  it('sorts by merchant name descending', () => {
    const result = filterExpenses(sample, { sort: 'merchant-desc' });
    expect(result[0].merchant).toBe('Zoom');
    expect(result[3].merchant).toBe('Apple Store');
  });
});
