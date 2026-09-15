/**
 * One-off migration: fix the SystemSettings unique index.
 *
 * The schema previously declared `key` as unique on its own, but every group
 * stores its payload under key "config". As a result only the first group
 * ("sms") could ever be written and the other 10 groups returned
 * DUPLICATE_ENTRY (409) from GET /api/admin/settings/:group.
 *
 * This script:
 *   1. Drops the stale `key_1` unique index.
 *   2. Creates the correct compound unique index { group: 1, key: 1 }.
 *   3. Seeds every DEFAULT_SETTINGS group that has no document yet.
 *
 * Safe to run repeatedly (idempotent).
 *
 * Usage:
 *   node fix-settings-index.cjs            # apply
 *   node fix-settings-index.cjs --dry-run  # report only
 */
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

const DEFAULT_GROUPS = [
  'general', 'gateway', 'security', 'sms', 'device', 'merchant',
  'notification', 'email', 'api', 'analytics', 'appearance',
];

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const col = db.collection('systemsettings');

  console.log('=== BEFORE ===');
  const before = await col.indexes();
  before.forEach((i) => console.log('  ' + i.name, JSON.stringify(i.key), i.unique ? 'UNIQUE' : ''));
  const beforeDocs = await col.find({}).toArray();
  console.log('  docs:', beforeDocs.length, '->', beforeDocs.map((d) => d.group).join(', ') || '(none)');

  const hasStaleIndex = before.some((i) => i.name === 'key_1' && i.unique);
  const hasGoodIndex = before.some(
    (i) => i.unique && i.key && i.key.group === 1 && i.key.key === 1
  );

  if (DRY_RUN) {
    console.log('\n[dry-run] would drop key_1:', hasStaleIndex);
    console.log('[dry-run] would create {group,key}:', !hasGoodIndex);
    console.log('[dry-run] would seed groups:', DEFAULT_GROUPS.length - beforeDocs.length);
    await mongoose.disconnect();
    return;
  }

  // 1. Drop the stale unique index on `key` alone.
  if (hasStaleIndex) {
    await col.dropIndex('key_1');
    console.log('\nDROPPED stale unique index key_1');
  } else {
    console.log('\nkey_1 unique index not present (already migrated)');
  }

  // 2. Create the compound unique index.
  if (!hasGoodIndex) {
    await col.createIndex({ group: 1, key: 1 }, { unique: true, name: 'group_1_key_1' });
    console.log('CREATED compound unique index group_1_key_1');
  } else {
    console.log('compound unique index already present');
  }

  // 3. Seed missing groups with a placeholder value; the service fills real
  //    defaults on first read, so an empty object is enough here.
  const existing = new Set((await col.find({}, { projection: { group: 1 } }).toArray()).map((d) => d.group));
  const missing = DEFAULT_GROUPS.filter((g) => !existing.has(g));
  for (const group of missing) {
    await col.updateOne(
      { group, key: 'config' },
      { $setOnInsert: { group, key: 'config', value: {}, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
  }
  console.log('SEEDED groups:', missing.join(', ') || '(none)');

  console.log('\n=== AFTER ===');
  const after = await col.indexes();
  after.forEach((i) => console.log('  ' + i.name, JSON.stringify(i.key), i.unique ? 'UNIQUE' : ''));
  const afterDocs = await col.find({}).toArray();
  console.log('  docs:', afterDocs.length, '->', afterDocs.map((d) => d.group).sort().join(', '));

  await mongoose.disconnect();
  console.log('\nDONE');
})().catch((e) => {
  console.error('MIGRATION FAILED:', e.message);
  process.exit(1);
});
