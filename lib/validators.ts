import { z } from 'zod';

export const categories = [
  'Groceries',
  'Dining',
  'Utilities',
  'Rent/Mortgage',
  'Transportation',
  'Health',
  'Shopping',
  'Entertainment',
  'Kids',
  'Other'
] as const;

export const householdSchema = z.object({
  name: z.string().min(2),
  currency: z.string().min(1).default('USD')
});

const itemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0)
});

export const expenseInputSchema = z
  .object({
    date: z.string(),
    merchant: z.string().min(1),
    category: z.enum(categories),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
    taxTotal: z.number().min(0).default(0),
    simpleTotal: z.number().min(0).optional(),
    mode: z.enum(['simple', 'itemized']),
    items: z.array(itemSchema).optional()
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'simple' && typeof value.simpleTotal !== 'number') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['simpleTotal'], message: 'simpleTotal is required for simple mode' });
    }
    if (value.mode === 'itemized' && (!value.items || value.items.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'At least one item is required for itemized mode' });
    }
  });
