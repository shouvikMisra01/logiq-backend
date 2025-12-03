// src/scripts/checkChapters.ts
/**
 * Script to check uploaded PDF documents
 */

import dotenv from 'dotenv';
dotenv.config();

import { connectDB, collections } from '../config/database';

async function checkChapters() {
  try {
    console.log('🔍 Checking uploaded PDFs...\n');

    // Connect to MongoDB
    await connectDB();

    const chaptersCol = collections.chapters();
    const pdfs = await chaptersCol.find({}).toArray();

    console.log('📊 Total PDFs:', pdfs.length);
    console.log('='.repeat(60) + '\n');

    if (pdfs.length === 0) {
      console.log('⚠️  No PDFs found in database!\n');
    } else {
      pdfs.forEach((pdf: any, index: number) => {
        console.log(`${index + 1}. ${pdf.original_filename || 'Unnamed'}`);
        console.log(`   Document ID: ${pdf.documentId}`);
        console.log(`   Class: ${pdf.class_id || 'Not set'}`);
        console.log(`   Subject: ${pdf.subject_id || 'Not set'}`);
        console.log(`   Stored as: ${pdf.stored_filename}`);
        console.log(`   Uploaded: ${pdf.created_at}`);
        console.log();
      });

      console.log('💡 To parse these PDFs with AI, call:');
      console.log('   POST /api/syllabus/parse/:documentId');
      console.log();
    }

    console.log('='.repeat(60));
    console.log('✅ Check complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkChapters();
