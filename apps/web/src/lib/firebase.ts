import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: mover a variables de entorno (VITE_FIREBASE_*)
const firebaseConfig = {
  apiKey: 'AIzaSyDDDnZO31xliCQ8V4ySVmpi-eInWRzJ51g',
  authDomain: 'openmarket-3cef5.firebaseapp.com',
  projectId: 'openmarket-3cef5',
  storageBucket: 'openmarket-3cef5.firebasestorage.app',
  messagingSenderId: '377411630958',
  appId: '1:377411630958:web:9d4e65f692d5e21534b37f',
  measurementId: 'G-5MSQLLERFZ',
};

// Evitar inicialización duplicada en hot-reload
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
