// Firebase Configuration and Initialization
import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import {
  getAuth,
  Auth,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtQmAaUFEuyJmeOq3M3ZIkI3a1gna_Do8",
  authDomain: "nosql-demo-e5885.firebaseapp.com",
  databaseURL: "https://nosql-demo-e5885-default-rtdb.firebaseio.com",
  projectId: "nosql-demo-e5885",
  storageBucket: "nosql-demo-e5885.firebasestorage.app",
  messagingSenderId: "377685820338",
  appId: "1:377685820338:web:12a7618478c1cdeda79aab",
  measurementId: "G-EWRZ4F64R6"
};

// Initialize Firebase App
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  // Enable offline persistence for Firestore
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser');
    }
  });
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

// Helper function to set auth persistence based on remember me preference
export async function setAuthPersistence(rememberMe: boolean): Promise<void> {
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  } catch (error) {
    console.error("Error setting auth persistence:", error);
  }
}

// Firestore collection names (constants for type safety)
export const COLLECTIONS = {
  INVENTORY: 'inventory',
  CUSTOMERS: 'customers',
  WMS_SUPPLIERS: 'wms_suppliers',
  SALES_ORDERS: 'sales_orders',
  PURCHASE_ORDERS: 'purchase_orders',
  CASH_BANK_TRANSACTIONS: 'cash_bank_transactions',
  PAYMENT_TRANSACTIONS: 'payment_transactions',
  SHIPMENTS: 'shipments',
  ORDERS: 'orders',
  USERS: 'users',
  CATEGORIES: 'categories',
  NOTIFICATIONS: 'notifications',
} as const;

// Type for collection names
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

// Export initialized instances
export { app, db, auth };

// Re-export Firestore functions for convenience
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
};

