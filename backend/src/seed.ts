import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// In production MONGODB_URI is always provided via env.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/zipay';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[zi-pay:seed] Connected to MongoDB');

    const { User } = await import('./models/User.js');

    const adminEmail = 'zipremiumservices@gmail.com';
    const adminPassword = 'Admin@123456';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`[zi-pay:seed] Admin user already exists: ${adminEmail}`);
      existingAdmin.password = adminPassword;
      existingAdmin.role = 'super_admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('[zi-pay:seed] Admin user updated with new password');
    } else {
      await User.create({
        email: adminEmail,
        password: adminPassword,
        name: 'ZIKRUL ISLAM',
        role: 'super_admin',
        isActive: true,
      });
      console.log(`[zi-pay:seed] Super admin created: ${adminEmail}`);
    }

    console.log('[zi-pay:seed] Seeding complete');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[zi-pay:seed] Error:', error);
    process.exit(1);
  }
}

seed();
