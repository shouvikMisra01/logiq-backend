// Check syllabi collection
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_tutor_db';

async function checkSyllabi() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n=== SYLLABI COLLECTION ===');
    const syllabi = await db.collection('syllabi').find({}).toArray();
    console.log('Total syllabi:', syllabi.length);
    for (let i = 0; i < syllabi.length; i++) {
      console.log('\n' + (i + 1) + '.', JSON.stringify(syllabi[i], null, 2));
    }

    console.log('\n=== CHAPTERS COLLECTION (Class 9) ===');
    const chapters = await db.collection('chapters').find({ class_id: 'class 9' }).toArray();
    console.log('Total Class 9 chapters:', chapters.length);
    for (let i = 0; i < chapters.length; i++) {
      const c = chapters[i];
      console.log('\n' + (i + 1) + '. Subject:', c.subject_id, ', Chapter:', c.chapter_name, ', File:', c.original_filename);
    }

  } finally {
    await client.close();
  }
}

checkSyllabi();
