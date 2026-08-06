import { Transaction, PaymentRequest, Device, Session } from '../models/index.js';
const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;
let intervals = [];
export function startCronJobs() {
    console.log('[zi-pay] Starting cron jobs...');
    // Mark expired payments every 5 minutes
    intervals.push(setInterval(async () => {
        try {
            const now = new Date();
            const expiredTransactions = await Transaction.updateMany({ status: 'pending', expiresAt: { $lt: now } }, { $set: { status: 'expired' } });
            const expiredRequests = await PaymentRequest.updateMany({ status: 'pending', expiresAt: { $lt: now } }, { $set: { status: 'expired' } });
            if (expiredTransactions.modifiedCount > 0 || expiredRequests.modifiedCount > 0) {
                console.log(`[zi-pay] Expired ${expiredTransactions.modifiedCount} transactions and ${expiredRequests.modifiedCount} payment requests`);
            }
        }
        catch (error) {
            console.error('[zi-pay] Failed to expire payments:', error);
        }
    }, FIVE_MINUTES));
    // Mark offline devices every minute
    intervals.push(setInterval(async () => {
        try {
            const threeMinutesAgo = new Date(Date.now() - 3 * ONE_MINUTE);
            const result = await Device.updateMany({
                status: 'online',
                isEnabled: true,
                lastSyncAt: { $lt: threeMinutesAgo },
            }, { $set: { status: 'offline' } });
            if (result.modifiedCount > 0) {
                console.log(`[zi-pay] Marked ${result.modifiedCount} devices as offline`);
            }
        }
        catch (error) {
            console.error('[zi-pay] Failed to mark offline devices:', error);
        }
    }, ONE_MINUTE));
    // Clean expired sessions every 15 minutes
    intervals.push(setInterval(async () => {
        try {
            const result = await Session.updateMany({ isActive: true, expiresAt: { $lt: new Date() } }, { $set: { isActive: false } });
            if (result.modifiedCount > 0) {
                console.log(`[zi-pay] Expired ${result.modifiedCount} sessions`);
            }
        }
        catch (error) {
            console.error('[zi-pay] Failed to expire sessions:', error);
        }
    }, 15 * ONE_MINUTE));
    console.log('[zi-pay] Cron jobs started');
}
export function stopCronJobs() {
    intervals.forEach(clearInterval);
    intervals = [];
    console.log('[zi-pay] Cron jobs stopped');
}
