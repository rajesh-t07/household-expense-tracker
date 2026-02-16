import crypto from 'node:crypto';

export function createInviteToken() {
  return crypto.randomBytes(16).toString('hex');
}

export function toMoney(value: number) {
  return Math.round(value * 100) / 100;
}
