// Migration script to copy data from local MongoDB to Atlas
const { MongoClient } = require('mongodb');

// Configuration
const LOCAL_URI = 'mongodb://localhost:27017';
const ATLAS_URI = process.argv[2]; // Pass Atlas URI as command line argument
const DB_NAME = 'ai_tutor_db';

// Collections to migrate
const COLLECTIONS = [
  'schools',
  'students',
  'admins',
  'chapters',
  'syllabi',
  'pdf_documents',
  'quiz_attempts',
  'study_plans',
  'parents',
  'question_sets',
  'question_set_attempts',
  'student_skill_stats'
];

async function migrate() {
  if (!ATLAS_URI) {
    console.error('❌ Please provide Atlas URI as argument');
    console.error('Usage: node migrate-to-atlas.js "mongodb+srv://user:pass@cluster.mongodb.net/"');
    process.exit(1);
  }

  console.log('🚀 Starting MongoDB migration...\n');

  let localClient, atlasClient;

  try {
    // Connect to local MongoDB
    console.log('📡 Connecting to local MongoDB...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db(DB_NAME);
    console.log('✅ Connected to local MongoDB\n');

    // Connect to Atlas
    console.log('📡 Connecting to MongoDB Atlas...');
    atlasClient = new MongoClient(ATLAS_URI);
    await atlasClient.connect();
    const atlasDb = atlasClient.db(DB_NAME);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Get list of existing collections in local DB
    const localCollections = await localDb.listCollections().toArray();
    const existingCollectionNames = localCollections.map(c => c.name);

    console.log(`📚 Found ${existingCollectionNames.length} collections in local database:`);
    console.log(existingCollectionNames.map(name => `   - ${name}`).join('\n'));
    console.log('');

    // Migrate each collection
    let totalDocsMigrated = 0;
    const results = [];

    for (const collectionName of COLLECTIONS) {
      try {
        if (!existingCollectionNames.includes(collectionName)) {
          console.log(`⚠️  Skipping ${collectionName} (not found in local DB)`);
          results.push({ collection: collectionName, status: 'skipped', count: 0 });
          continue;
        }

        const localCollection = localDb.collection(collectionName);
        const atlasCollection = atlasDb.collection(collectionName);

        // Get all documents from local
        const documents = await localCollection.find({}).toArray();

        if (documents.length === 0) {
          console.log(`📭 ${collectionName}: No documents to migrate`);
          results.push({ collection: collectionName, status: 'empty', count: 0 });
          continue;
        }

        // Clear existing data in Atlas collection (optional - comment out to keep existing data)
        const deleteResult = await atlasCollection.deleteMany({});

        // Insert documents into Atlas
        const insertResult = await atlasCollection.insertMany(documents);

        console.log(`✅ ${collectionName}: Migrated ${insertResult.insertedCount} documents (deleted ${deleteResult.deletedCount} existing)`);
        totalDocsMigrated += insertResult.insertedCount;
        results.push({
          collection: collectionName,
          status: 'success',
          count: insertResult.insertedCount,
          deleted: deleteResult.deletedCount
        });

      } catch (error) {
        console.error(`❌ Error migrating ${collectionName}:`, error.message);
        results.push({ collection: collectionName, status: 'error', error: error.message });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total documents migrated: ${totalDocsMigrated}`);
    console.log('');
    console.log('Collection Details:');
    results.forEach(r => {
      const status = r.status === 'success' ? '✅' :
                     r.status === 'error' ? '❌' :
                     r.status === 'skipped' ? '⚠️' : '📭';
      console.log(`${status} ${r.collection}: ${r.count || 0} docs ${r.deleted ? `(replaced ${r.deleted})` : ''}`);
    });
    console.log('='.repeat(50));
    console.log('\n✨ Migration completed!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
    console.log('\n👋 Connections closed');
  }
}

// Run migration
migrate();
