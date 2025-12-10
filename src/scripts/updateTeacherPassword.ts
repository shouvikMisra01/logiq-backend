import { connectDB, collections } from '../config/database';

const updateTeacherPassword = async () => {
  try {
    await connectDB();

    const passwordHash = 'cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416';

    const result = await collections.teachers().updateOne(
      { email: 'teacher@school.com' },
      { $set: { password_hash: passwordHash } }
    );

    console.log('Updated teacher password:', result.modifiedCount, 'documents');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update teacher password:', error);
    process.exit(1);
  }
};

updateTeacherPassword();
