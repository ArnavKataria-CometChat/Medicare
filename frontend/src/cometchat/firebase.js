import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyBxIZfhIs9TSxj_9vuQYJCYDGVeRP3ALKQ',
  authDomain: 'medicare-89e38.firebaseapp.com',
  projectId: 'medicare-89e38',
  storageBucket: 'medicare-89e38.firebasestorage.app',
  messagingSenderId: '599783219960',
  appId: '1:599783219960:web:571815c3d974e3aff3510d',
};

export const firebaseApp = initializeApp(firebaseConfig);

// Firebase Web Push certificate key (generated in Firebase Console → Cloud Messaging → Web configuration)
export const FIREBASE_VAPID_KEY = 'BLVz5CcHvgJEN90WxxxCV-36NcBGi_EkMHS0d2-jJiB9eXCphs-ZGSG1tfRp1d81EigNKIIoGTl2UVio5_1ci5o';
