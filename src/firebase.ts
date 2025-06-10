import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD59LsQr720-T47LV1n6QQgVGwQ-fuQgeE",
  authDomain: "wavenerd-cb420.firebaseapp.com",
  databaseURL: "https://wavenerd-cb420-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wavenerd-cb420",
  storageBucket: "wavenerd-cb420.firebasestorage.app",
  messagingSenderId: "101053846800",
  appId: "1:101053846800:web:f8b800771b3360b366c195"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
export const database = getDatabase(app);