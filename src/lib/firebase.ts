import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxXQPSlR3HOUnWMQ-ci7MK6J32yhX5XMc",
  authDomain: "hirevibe-ai.firebaseapp.com",
  projectId: "hirevibe-ai",
  storageBucket: "hirevibe-ai.firebasestorage.app",
  messagingSenderId: "826707340030",
  appId: "1:826707340030:web:c5924198c6da0b0ed7d3af",
  measurementId: "G-4WTYNJQ03M"
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

