import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, browserSessionPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

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

// browserSessionPersistence (sessionStorage) en vez del default browserLocalPersistence
// (IndexedDB): el default sincroniza la sesión de Firebase Auth entre TODAS las
// pestañas/ventanas que comparten almacenamiento (incluidas varias ventanas de
// incógnito del mismo navegador) — si el usuario A inicia sesión en una ventana y
// el usuario B en otra, cada login pisa la identidad de Firebase del otro y rompe
// sus listeners de chat en tiempo real. Con persistencia de sesión cada
// pestaña/ventana mantiene su propia identidad, igual que el access token (sessionStorage).
export const auth = (() => {
  try {
    return initializeAuth(app, { persistence: browserSessionPersistence });
  } catch {
    // Ya inicializada (p. ej. HMR en dev) — reutilizar la instancia existente.
    return getAuth(app);
  }
})();

export const storage = getStorage(app);
