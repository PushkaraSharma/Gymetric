import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

dotenv.config();

let firebaseApp: admin.app.App | null = null;

try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? './../serviceAccountKey.json';
    // Check if service account file exists or if credentials are provided via env
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
        });
    } else {
        // Fallback to service account file if available
        // We use require here to avoid issues if file doesn't exist at import time
        // in a real scenario, you'd likely want to handle this more gracefully
        try {
            const serviceAccount = require(serviceAccountPath);
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } catch (fileError) {
            console.warn("Firebase Admin: valid credentials not found in env or file. Features relying on Firebase Admin will fail.");
        }
    }

} catch (error) {
    console.error("Firebase Admin Initialization Error:", error);
}

export const verifyFirebaseToken = async (token: string) => {
    if (!firebaseApp) {
        throw new Error("Firebase Admin not initialized");
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error("Error verifying Firebase token:", error);
        throw error;
    }
};

export default firebaseApp;
