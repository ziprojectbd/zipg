import mongoose from 'mongoose';

// MONGODB_URI is REQUIRED in production. There is no bundled "mongo" host
// anymore — the database lives outside this container (Coolify-managed / Atlas).
const MONGODB_URI = process.env.MONGODB_URI;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

let isConnected = false;
let retryCount = 0;

export async function connectDatabase(): Promise<void> {
  if (isConnected) return;

  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Configure the Coolify-managed MongoDB connection string in the backend resource environment variables.'
    );
  }

  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    retryCount = 0;
    console.log('[zi-pay] MongoDB connected successfully');

    mongoose.connection.on('error', (error) => {
      console.error('[zi-pay] MongoDB connection error:', error);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[zi-pay] MongoDB disconnected');
      isConnected = false;
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(connectDatabase, RETRY_DELAY_MS);
      }
    });

  } catch (error) {
    console.error(`[zi-pay] MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
    isConnected = false;

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDatabase();
    }

    throw new Error('Failed to connect to MongoDB after maximum retries');
  }
}

export function getConnectionStatus(): boolean {
  return isConnected;
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[zi-pay] MongoDB disconnected');
}
