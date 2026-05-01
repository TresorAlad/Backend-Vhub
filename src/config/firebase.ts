import admin from 'firebase-admin';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

function tryParseServiceAccount() {
  try {
    const raw = (serviceAccountBase64 ?? '').trim();
    if (!raw) return null;

    // 1) Normal path: base64(JSON)
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8').trim();
      if (decoded.startsWith('{')) return JSON.parse(decoded);
    } catch {
      // ignore and fallback
    }

    // 2) Fallback: sometimes the env is pasted as raw JSON instead of base64
    if (raw.startsWith('{')) return JSON.parse(raw);

    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is neither base64(JSON) nor JSON.');
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 format.', error);
    return null;
  }
}

try {
  const serviceAccount = tryParseServiceAccount();

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
