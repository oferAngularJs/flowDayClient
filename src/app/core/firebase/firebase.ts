import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase web app config for the "flowday-b7fb6" project.
 * These values are public identifiers (they ship in every web client), not secrets.
 * Access is protected by Firebase Auth + Firestore security rules (see firestore.rules).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyDyL4mJC1LaH7QRoO6un_QlUD4xW2P03wQ',
  authDomain: 'flowday-b7fb6.firebaseapp.com',
  projectId: 'flowday-b7fb6',
  storageBucket: 'flowday-b7fb6.firebasestorage.app',
  messagingSenderId: '859179464358',
  appId: '1:859179464358:web:548c25a4b9cd7ec1496667',
  measurementId: 'G-2T5F76VNKF'
};

export const firebaseApp = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
// Keep the user signed in across app restarts (important for daily mobile use).
setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
  // Falls back to Firebase's default persistence if local storage is unavailable.
});

export const firestore = getFirestore(firebaseApp);
