/**
 * Firebase Admin SDK Configuration
 * Server-side Firebase client for database operations
 */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let firebaseApp: App | null = null;
let firestore: Firestore | null = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
export function initializeFirebase(): App {
  if (firebaseApp) {
    return firebaseApp;
  }

  const apps = getApps();
  if (apps.length > 0) {
    firebaseApp = apps[0];
    return firebaseApp;
  }

  // Check for service account credentials
  // Option 1: JSON string in environment variable
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  // Option 2: Path to service account file
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  let credentials;

  if (serviceAccountJson) {
    try {
      // Try parsing as JSON string
      credentials = JSON.parse(serviceAccountJson);
    } catch (error) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT must be a valid JSON string. " +
          "Please provide the service account JSON as a stringified JSON in the environment variable."
      );
    }
  } else if (serviceAccountPath) {
    // Load from file path
    try {
      // Use dynamic import for file path
      const serviceAccount = require(serviceAccountPath);
      credentials = serviceAccount;
    } catch (error) {
      throw new Error(
        `Failed to load Firebase service account from path: ${serviceAccountPath}. ` +
          "Please ensure the file exists and is valid JSON."
      );
    }
  } else {
    throw new Error(
      "Missing Firebase service account credentials. " +
        "Please provide either FIREBASE_SERVICE_ACCOUNT (JSON string) or " +
        "FIREBASE_SERVICE_ACCOUNT_PATH (file path) environment variable."
    );
  }

  firebaseApp = initializeApp({
    credential: cert(credentials),
  });

  return firebaseApp;
}

/**
 * Get Firestore instance
 */
export function getFirestoreInstance(): Firestore {
  if (!firestore) {
    if (!firebaseApp) {
      initializeFirebase();
    }
    firestore = getFirestore(firebaseApp!);
  }
  return firestore;
}

/**
 * Collection paths for Firestore
 */
export const COLLECTIONS = {
  CONVERSATIONS: "conversations",
  MESSAGES: "messages",
  PROJECTS: "projects",
  KNOWLEDGE: "knowledge",
} as const;

/**
 * Helper to get user-specific collection path
 */
export function getUserCollectionPath(
  collection: string,
  userWallet: string
): string {
  return `users/${userWallet.toLowerCase()}/${collection}`;
}

/**
 * Helper to get conversation messages path
 */
export function getConversationMessagesPath(
  userWallet: string,
  conversationId: string
): string {
  return `users/${userWallet.toLowerCase()}/${COLLECTIONS.CONVERSATIONS}/${conversationId}/${COLLECTIONS.MESSAGES}`;
}

