import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// Replace these with your actual values from the Firebase Console:
// Project Settings -> General -> Your apps -> Web app -> Firebase SDK snippet -> Config
const firebaseConfig = {
  apiKey: "AIzaSyAK2kkjuSZoBZM_Qymca86mjZDrVmgsOxA",
  authDomain: "makerspace-visitor-log.firebaseapp.com",
  projectId: "makerspace-visitor-log",
  storageBucket: "makerspace-visitor-log.firebasestorage.app",
  messagingSenderId: "740533890022",
  appId: "1:740533890022:web:d479a3e464ca830dafc427",
  measurementId: "G-W5PD7LKJKF"
};

if (firebaseConfig.apiKey === "REPLACE_WITH_YOUR_API_KEY") {
  console.warn("⚠️ Firebase API Key is missing! Please update src/firebase.ts with your actual Firebase configuration.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
