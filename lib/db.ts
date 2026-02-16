import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI');
}

let cached = global.mongoose as { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDb() {
  if (cached?.conn) {
    return cached.conn;
  }
  if (!cached?.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || 'household-tracker' });
  }
  cached!.conn = await cached!.promise;
  return cached!.conn;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}
