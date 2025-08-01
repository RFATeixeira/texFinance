// lib/firebaseConfig.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {

  apiKey: "AIzaSyDKuDky0veVJeZJTTicjjq5YRSxeFg3tm4",

  authDomain: "texfinance-110a5.firebaseapp.com",

  projectId: "texfinance-110a5",

  storageBucket: "texfinance-110a5.firebasestorage.app",

  messagingSenderId: "72029296294",

  appId: "1:72029296294:web:54913f14fde1f9e2e54667",

  measurementId: "G-64NJM1VVMB"

};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export const db = getFirestore(app);

export { auth };
