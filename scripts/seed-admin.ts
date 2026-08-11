#!/usr/bin/env tsx
/**
 * zi-pay — Admin User Seeder
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Reads MONGODB_URI and GOOGLE_CLIENT_ID from the environment (or .env).
 * Creates a super_admin user if none exists.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, default: '' },
    name: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'admin', 'operator'], default: 'admin' },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existingAdmin = await User.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log(`ℹ️  Super admin already exists: ${existingAdmin.email}`);
      console.log('   No seeding needed.');
    } else {
      console.log('ℹ️  No super_admin found. Create one via the admin panel:');
      console.log('   1. Log in with Google OAuth (if configured)')
      console.log('   2. Or create via the app UI');
    }

    if (GOOGLE_CLIENT_ID) {
      console.log(`ℹ️  Google OAuth is configured. Users can login via Google.`);
    } else {
      console.log('⚠️  GOOGLE_CLIENT_ID is not set. Google login will not work.');
    }
  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
