import mongoose from 'mongoose';

// Fallback points at the compose "mongo" service. In production MONGODB_URI is always provided via env.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/zipay';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

let isConnected = false;
let retryCount = 0;

export async function connectDatabase(): Promise<void> {
  if (isConnected) return;

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
