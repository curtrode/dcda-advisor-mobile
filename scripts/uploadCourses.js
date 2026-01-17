import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Read courses data
const coursesPath = join(__dirname, '../data/courses.json');
const coursesData = JSON.parse(readFileSync(coursesPath, 'utf8'));

console.log(`Loading ${coursesData.length} courses...`);

// Upload courses to Firestore in batches (Firestore limit is 500 per batch)
async function uploadCourses() {
  try {
    const batchSize = 500;
    let batch = writeBatch(db);
    let batchCount = 0;
    let totalUploaded = 0;

    for (let i = 0; i < coursesData.length; i++) {
      const course = coursesData[i];
      // Use course code as document ID, replacing spaces and slashes for valid Firestore paths
      const docId = course.code.replace(/\s+/g, '-').replace(/\//g, '_');
      const docRef = doc(collection(db, 'courses'), docId);
      batch.set(docRef, course);
      batchCount++;

      // Commit batch when it reaches the limit or at the end
      if (batchCount === batchSize || i === coursesData.length - 1) {
        await batch.commit();
        totalUploaded += batchCount;
        console.log(`✅ Uploaded ${totalUploaded}/${coursesData.length} courses...`);
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    console.log('✅ Successfully uploaded all courses to Firestore!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error uploading courses:', error);
    process.exit(1);
  }
}

uploadCourses();
