import admin from 'firebase-admin';

const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountVar) {
  try {
    const serviceAccount = JSON.parse(serviceAccountVar);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized from environment variable');
  } catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT env var:', error);
  }
} else {
  // Fallback for local development
  try {
    const serviceAccount = require('../../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized from local JSON file');
  } catch (error) {
    console.error('Firebase Service Account not found (env or file). Authentication might fail.');
  }
}

export default admin;
