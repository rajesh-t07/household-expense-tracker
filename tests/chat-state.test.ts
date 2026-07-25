import { describe, it, expect } from 'vitest';
import { chatStateSchema } from '../lib/validators';

describe('chatStateSchema', () => {
  it('accepts a valid chat state', () => {
    const result = chatStateSchema.safeParse({
      step: 'merchant',
      messages: [{ role: 'assistant', text: 'What did you buy?' }],
      draft: { merchant: 'Test Store' }
    });
    expect(result.success).toBe(true);
  });

  it('rejects messages with text exceeding 2000 characters', () => {
    const result = chatStateSchema.safeParse({
      step: 'merchant',
      messages: [{ role: 'assistant', text: 'x'.repeat(2001) }],
      draft: {}
    });
    expect(result.success).toBe(false);
  });
});