import { Settings } from '../models/index.js';
import { createActivityLog } from './activityLog.service.js';
const DEFAULT_PAY_SETTINGS = {
    title: 'Pay with your preferred wallet.',
    subtitle: 'Secure checkout',
    description: 'Complete your payment through bKash, Nagad, or Rocket. Your transaction will be verified automatically.',
    enabledProviders: ['bkash', 'nagad', 'rocket'],
    merchantBkashNumber: '01XXXXXXXXX',
    merchantNagadNumber: '01XXXXXXXXX',
    merchantRocketNumber: '01XXXXXXXXX',
    instructions: {
        bkash: 'Send money to the bKash number shown by the merchant.',
        nagad: 'Send money to the Nagad number shown by the merchant.',
        rocket: 'Send money to the Rocket number shown by the merchant.',
    },
    showBranding: true,
    primaryColor: '#8b5cf6',
};
const DEFAULT_SYSTEM_SETTINGS = {
    siteName: 'ZI Pay',
    siteUrl: 'https://zipay.zipremiumservices.com',
    defaultCurrency: 'BDT',
    paymentExpiryMinutes: 15,
    maxPaymentAmount: 10000000,
    minPaymentAmount: 1,
    enablePublicPayments: true,
    enableMerchantSignup: false,
    webhookRetryMax: 3,
    webhookRetryDelayMs: 5000,
    maintenanceMode: false,
};
export async function getPaySettings() {
    const doc = await Settings.findOne({ key: 'pay_settings', group: 'pay' });
    if (!doc) {
        return DEFAULT_PAY_SETTINGS;
    }
    return doc.value;
}
export async function updatePaySettings(data, userId) {
    const current = await getPaySettings();
    const updated = {
        ...current,
        ...data,
        instructions: { ...current.instructions, ...(data.instructions ?? {}) },
    };
    await Settings.findOneAndUpdate({ key: 'pay_settings', group: 'pay' }, {
        key: 'pay_settings',
        group: 'pay',
        value: updated,
        updatedBy: userId,
    }, { upsert: true, new: true });
    await createActivityLog({
        userId,
        action: 'settings_updated',
        message: 'Payment gateway settings updated',
        entityType: 'Settings',
        entityId: 'pay_settings',
    });
    return updated;
}
export async function getSystemSettings() {
    const doc = await Settings.findOne({ key: 'system_settings', group: 'system' });
    if (!doc) {
        return DEFAULT_SYSTEM_SETTINGS;
    }
    return doc.value;
}
export async function updateSystemSettings(data, userId) {
    const current = await getSystemSettings();
    const updated = { ...current, ...data };
    await Settings.findOneAndUpdate({ key: 'system_settings', group: 'system' }, {
        key: 'system_settings',
        group: 'system',
        value: updated,
        updatedBy: userId,
    }, { upsert: true, new: true });
    await createActivityLog({
        userId,
        action: 'settings_updated',
        message: 'System settings updated',
        entityType: 'Settings',
        entityId: 'system_settings',
    });
    return updated;
}
export async function getSettingsByGroup(group) {
    const docs = await Settings.find({ group });
    const result = {};
    docs.forEach((doc) => {
        result[doc.key] = doc.value;
    });
    return result;
}
