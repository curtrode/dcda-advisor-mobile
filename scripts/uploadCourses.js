import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATGBk9GvnkwRj9JYJDAN3g56YhY5nlEIE",
  authDomain: "dcda-advisor-mobile.firebaseapp.com",
  projectId: "dcda-advisor-mobile",
  storageBucket: "dcda-advisor-mobile.firebasestorage.app",
  messagingSenderId: "972663329432",
  appId: "1:972663329432:web:d8ea0332661c4de8b3f6ed"
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
