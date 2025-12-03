// src/scripts/deleteClass10.ts
/**
 * Delete the class 10 PDF that was uploaded by mistake
 */

import dotenv from 'dotenv';
dotenv.config();

import { connectDB, collections } from '../config/database';

async function deleteClass10PDF() {
  try {
    console.log('🗑️  Deleting class 10 PDF...\n');

    await connectDB();

    const chaptersCol = collections.chapters();

    const result = await chaptersCol.deleteOne({
      documentId: '90f2f131-ac16-4a5f-a5e3-0b46b6f9e32c'
    });

    if (result.deletedCount > 0) {
      console.log('✅ Successfully deleted class 10 PDF');
    } else {
      console.log('⚠️  Class 10 PDF not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteClass10PDF();
