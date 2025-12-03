// Show Mathematics syllabus
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_tutor_db';

async function showMathSyllabus() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n=== MATHEMATICS SYLLABUS ===');
    const mathSyllabus = await db.collection('syllabi').findOne({ 
      classNumber: 9, 
      subjectName: 'mathematics' 
    });
    
    if (mathSyllabus) {
      console.log('\nSubject:', mathSyllabus.subjectName);
      console.log('Class:', mathSyllabus.classLabel);
      console.log('Total Chapters:', mathSyllabus.chapters.length);
      console.log('\nChapters:');
      mathSyllabus.chapters.forEach((ch: any, idx: number) => {
        console.log('\n' + (idx + 1) + '. ' + ch.chapterName);
        console.log('   Topics (' + ch.topics.length + '):');
        ch.topics.forEach((t: any, tidx: number) => {
          console.log('   ' + (tidx + 1) + '. ' + t.topicName);
        });
      });
    } else {
      console.log('Mathematics syllabus not found!');
    }

    console.log('\n\n=== ALL CLASS 9 SYLLABI ===');
    const allSyllabi = await db.collection('syllabi').find({ classNumber: 9 }).toArray();
    console.log('Total subjects for Class 9:', allSyllabi.length);
    allSyllabi.forEach((s: any) => {
      console.log('- ' + s.subjectName + ' (' + s.chapters.length + ' chapters)');
    });

  } finally {
    await client.close();
  }
}

showMathSyllabus();
