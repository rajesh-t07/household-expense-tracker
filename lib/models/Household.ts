import { Schema, model, models, type Types, type InferSchemaType } from 'mongoose';

const householdSchema = new Schema(
  {
    name: { type: String, required: true },
    currency: { type: String, default: 'USD' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    roles: { type: Map, of: String, default: {} },
    inviteToken: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

householdSchema.methods.hasMember = function hasMember(userId: Types.ObjectId) {
  return this.members.some((member: Types.ObjectId) => member.equals(userId));
};

export type HouseholdDoc = InferSchemaType<typeof householdSchema>;
export const Household = models.Household || model('Household', householdSchema);
