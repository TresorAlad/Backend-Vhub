import admin from 'firebase-admin';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

function parseServiceAccountFromBase64() {
  try {
    if (serviceAccountBase64) {
      return JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
    }
    return null;
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 format.', error);
    return null;
  }
}

try {
  const serviceAccount = parseServiceAccountFromBase64();

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseProjectId || serviceAccount.project_id,
    });
    console.log('Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_BASE64');
  } else if (googleApplicationCredentials || firebaseProjectId) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseProjectId,
    });
    console.log('Firebase Admin initialized with Application Default Credentials');
  } else {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or use GOOGLE_APPLICATION_CREDENTIALS (+ FIREBASE_PROJECT_ID).'
    );
  }
} catch (error) {
  console.error('Firebase Admin initialization failed:', error);
}

export const isFirebaseAdminReady = admin.apps.length > 0;

export default admin;
