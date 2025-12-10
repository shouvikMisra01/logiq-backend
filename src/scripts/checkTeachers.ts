import { connectDB, collections } from '../config/database';

const checkTeachers = async () => {
  try {
    await connectDB();

    const teachers = await collections.teachers().find({}).toArray();
    console.log('All teachers:', JSON.stringify(teachers, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Failed to check teachers:', error);
    process.exit(1);
  }
};

checkTeachers();
