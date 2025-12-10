import { connectDB, collections } from '../config/database';
import crypto from 'crypto';

const fixTeacherPasswords = async () => {
  try {
    await connectDB();

    // Password: teacher123
    const passwordHash = crypto.createHash('sha256').update('teacher123').digest('hex');

    // Update all teachers without password_hash
    const result = await collections.teachers().updateMany(
      { password_hash: { $exists: false } },
      { $set: { password_hash: passwordHash } }
    );

    console.log('Updated teachers without password:', result.modifiedCount);

    // Also update rabin@gmail.com if needed
    const result2 = await collections.teachers().updateOne(
      { email: 'rabin@gmail.com' },
      { $set: { password_hash: passwordHash } }
    );

    console.log('Updated rabin@gmail.com:', result2.modifiedCount);

    process.exit(0);
  } catch (error) {
    console.error('Failed to fix teacher passwords:', error);
    process.exit(1);
  }
};

fixTeacherPasswords();
