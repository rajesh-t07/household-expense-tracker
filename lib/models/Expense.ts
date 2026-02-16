import { Schema, model, models, type InferSchemaType } from 'mongoose';

const expenseItemSchema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const expenseSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true, index: true },
    date: { type: Date, required: true },
    merchant: { type: String, required: true },
    category: { type: String, required: true },
    paymentMethod: { type: String },
    notes: { type: String },
    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [expenseItemSchema]
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type ExpenseDoc = InferSchemaType<typeof expenseSchema>;
export const Expense = models.Expense || model('Expense', expenseSchema);
