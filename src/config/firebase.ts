import admin from 'firebase-admin';

const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

const parseServiceAccount = () => {
  if (serviceAccountVar) {
    return JSON.parse(serviceAccountVar);
  }
  if (serviceAccountBase64) {
    return JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
  }
  return null;
};

try {
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_BASE64.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin initialized from environment variables');
} catch (error) {
  console.error('Firebase Admin initialization failed:', error);
}

export default admin;
