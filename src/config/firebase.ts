import admin from 'firebase-admin';
import path from 'path';

const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

export default admin;
