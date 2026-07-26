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

/**
 * Base ZodObject shared by expenseInputSchema (with superRefine for creation)
 * and expenseEditSchema (via pick().partial() for inline editing).
 * Separating base from refine avoids the ZodEffects type issue:
 * `.pick()` and `.partial()` are not available on ZodEffects,
 * only on ZodObject.
 */
const expenseInputBaseSchema = z.object({
  date: z.string(),
  merchant: z.string().min(1),
  category: z.enum(categories),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  taxTotal: z.number().min(0).default(0),
  simpleTotal: z.number().min(0).optional(),
  mode: z.enum(['simple', 'itemized']),
  items: z.array(itemSchema).optional()
});

export const expenseInputSchema = expenseInputBaseSchema.superRefine(
  (value, ctx) => {
    if (value.mode === 'simple' && typeof value.simpleTotal !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['simpleTotal'],
        message: 'simpleTotal is required for simple mode'
      });
    }
    if (value.mode === 'itemized' && (!value.items || value.items.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: 'At least one item is required for itemized mode'
      });
    }
  }
);

export const expenseEditSchema = expenseInputBaseSchema
  .pick({ merchant: true, category: true, notes: true })
  .partial()
  .merge(z.object({
    simpleTotal: z.number().min(0).optional(),
    receiptUrl: z.string().url().optional().nullable()
  }));

export const chatStateSchema = z.object({
  step: z.enum(['month', 'mode', 'merchant', 'category', 'amount', 'tax', 'confirm']),
  draft: z
    .object({
      date: z.string().optional(),
      mode: z.enum(['simple', 'itemized']).optional(),
      merchant: z.string().optional(),
      category: z.string().optional(),
      simpleTotal: z.number().min(0).optional(),
      taxTotal: z.number().min(0).optional(),
      items: z
        .array(
          z.object({
            name: z.string().min(1),
            quantity: z.number().int().min(1),
            unitPrice: z.number().min(0)
          })
        )
        .optional()
    })
    .passthrough(),
  messages: z.array(
    z.object({
      role: z.enum(['assistant', 'user']),
      text: z.string().max(2000)
    })
  )
});

export const settingsActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('rename'), name: z.string().min(2).max(80) }),
  z.object({
    action: z.literal('update-currency'),
    currency: z
      .string()
      .min(1)
      .max(8)
      .regex(/^[A-Za-z]{1,8}$/, 'Currency must be letters only (e.g. USD, EUR, JPY)')
  }),
  z.object({ action: z.literal('regenerate-token') }),
  z.object({
    action: z.literal('remove-member'),
    memberId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid member id')
  })
]);

export const lastHouseholdSchema = z.object({
  householdId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid household id')
});

export const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i, 'Each id must be a valid 24-character hex string'))
    .min(1, 'At least one id is required')
    .max(100, 'Maximum 100 ids per request')
});
