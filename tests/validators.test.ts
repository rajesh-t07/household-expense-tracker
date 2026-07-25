import { describe, it, expect } from 'vitest';
import { expenseInputSchema } from '../lib/validators';

describe('expenseInputSchema - simple mode', () => {
  it('accepts a valid simple expense', () => {
    const result = expenseInputSchema.safeParse({
      date: '2025-01-01',
      merchant: 'Test Store',
      category: 'Groceries',
      mode: 'simple',
      simpleTotal: 100,
      taxTotal: 10
    });
    expect(result.success).toBe(true);
  });

  it('rejects a simple expense missing simpleTotal', () => {
    const result = expenseInputSchema.safeParse({
      date: '2025-01-01',
      merchant: 'Test Store',
      category: 'Groceries',
      mode: 'simple',
      taxTotal: 10
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => /simpleTotal/i.test(m))).toBe(true);
    }
  });
});

describe('expenseInputSchema - itemized mode', () => {
  it('accepts a valid itemized expense with at least one item', () => {
    const result = expenseInputSchema.safeParse({
      date: '2025-01-01',
      merchant: 'Test Store',
      category: 'Groceries',
      mode: 'itemized',
      items: [{ name: 'Item 1', quantity: 1, unitPrice: 50 }],
      taxTotal: 5
    });
    expect(result.success).toBe(true);
  });

  it('rejects an itemized expense with an empty items array', () => {
    const result = expenseInputSchema.safeParse({
      date: '2025-01-01',
      merchant: 'Test Store',
      category: 'Groceries',
      mode: 'itemized',
      items: [],
      taxTotal: 0
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => /item/i.test(m))).toBe(true);
    }
  });
});