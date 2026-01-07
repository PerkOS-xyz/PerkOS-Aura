import "dotenv/config";
import { initializeFirebase, getFirestoreInstance } from "../lib/db/firebase";

async function testConnection() {
    console.log("🔥 Testing Firebase Connection...");

    try {
        // Initialize Firebase
        console.log("Initializing Firebase Admin SDK...");
        initializeFirebase();
        console.log("✅ Firebase initialized successfully");

        // Get Firestore instance
        console.log("Getting Firestore instance...");
        const db = getFirestoreInstance();
        console.log("✅ Firestore instance obtained");

        // Try a simple operation (list collections or get a dummy doc)
        console.log("Attempting to read from Firestore...");
        try {
            const collections = await db.listCollections();
            console.log(`✅ Connected! Found ${collections.length} collections.`);
            collections.forEach(col => console.log(`   - ${col.id}`));
        } catch (readError: any) {
            console.warn("⚠️  Could not list collections (permission issue?). Trying to write/read a test document...");
            // Fallback: Try to write to a temp collection if listing fails (often due to IAM roles)
            const testRef = db.collection("test_connection").doc("ping");
            await testRef.set({ timestamp: new Date(), message: "pong" });
            console.log("✅ Successfully wrote test document.");
            await testRef.delete();
            console.log("✅ Successfully cleaned up test document.");
        }

        console.log("\n🎉 Firebase connection verification COMPLETE!");
        process.exit(0);
    } catch (error: any) {
        console.error("\n❌ Firebase connection FAILED:");
        console.error(error.message);
        if (error.code === 'app/invalid-credential') {
            console.error("\n💡 Hint: Check your FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT environment variable.");
        }
        process.exit(1);
    }
}

testConnection();
