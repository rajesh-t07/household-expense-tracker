import { Schema, model, models } from 'mongoose';

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['assistant', 'user'], required: true },
    text: { type: String, required: true }
  },
  { _id: false }
);

const conversationStateSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    step: { type: String, required: true },
    draft: { type: Schema.Types.Mixed, default: {} },
    messages: { type: [messageSchema], default: [] }
  },
  { timestamps: true }
);

conversationStateSchema.index({ householdId: 1, userId: 1 }, { unique: true });

export const ConversationState = models.ConversationState || model('ConversationState', conversationStateSchema);
