import mongoose from 'mongoose';

// MONGODB_URI is REQUIRED in production. There is no bundled "mongo" host
// anymore — the database lives outside this container (Coolify-managed / Atlas).
const MONGODB_URI = process.env.MONGODB_URI;
const RETRY_DELAY_MS = 5000;

let isConnected = false;

// Resolves only when the first successful connection happens. Migrations and
// cron jobs await this so they never run against a dead database.
let connectedPromise: Promise<void> | null = null;
let notifyConnected: (() => void) | null = null;

function ensureConnectedPromise(): Promise<void> {
  if (!connectedPromise) {
    connectedPromise = new Promise<void>((resolve) => {
      notifyConnected = resolve;
    });
  }
  return connectedPromise;
}

/**
 * Start (or continue) the background connection loop. This never rejects and
 * never exits the process — on failure it simply retries every few seconds.
 * The returned promise resolves once the first successful connect happens.
 */
export function connectDatabase(): Promise<void> {
  const waitForConnection = ensureConnectedPromise();
  kickConnectionLoop();
  return waitForConnection;
}

let loopRunning = false;
function kickConnectionLoop(): void {
  if (loopRunning) return;
  loopRunning = true;
  void attemptLoop();
}

async function attemptLoop(): Promise<void> {
  while (!isConnected) {
    if (!MONGODB_URI) {
      console.error(
        '[zi-pay] ⚠️ MONGODB_URI is not set. ' +
          'Set the Coolify-managed MongoDB connection string in the backend ' +
          'resource environment variables. Retrying in background...'
      );
    } else {
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
        console.log('[zi-pay] MongoDB connected successfully');
        notifyConnected?.();
        break;
      } catch (error) {
        console.error('[zi-pay] MongoDB connection failed, retrying in background:', error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
}

mongoose.connection.on('error', (error) => {
  console.error('[zi-pay] MongoDB connection error:', error);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.warn('[zi-pay] MongoDB disconnected — reconnecting in background');
  isConnected = false;
  kickConnectionLoop();
});

export function getConnectionStatus(): boolean {
  return isConnected;
}

export async function disconnectDatabase(): Promise<void> {
  isConnected = false;
  await mongoose.disconnect().catch(() => {});
  console.log('[zi-pay] MongoDB disconnected');
}
