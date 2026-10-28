import { MongoClient, ObjectId } from 'mongodb';
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'sagrivision';
if (!uri) console.warn('MONGODB_URI is not set. Configure MongoDB before starting the app.');
let database;
export async function getDb() {
  if (!uri) throw new Error('MongoDB is not configured. Set MONGODB_URI.');
  if (!database) { const client = new MongoClient(uri); await client.connect(); database = client.db(dbName); }
  return database;
}
export const id = prefix => `${prefix}_${new ObjectId().toHexString()}`;
