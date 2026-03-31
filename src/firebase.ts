import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

/**
 * Sign in anonymously to Firebase
 */
export const signInAnonymous = async () => {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
      console.log('Signed in anonymously');
    }
  } catch (error) {
    console.error('Anonymous sign-in error:', error);
  }
};
