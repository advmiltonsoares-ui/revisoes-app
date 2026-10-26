import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Sem as chaves do Firebase o app funciona em "modo de teste", salvando só no aparelho. */
export const firebaseConfigurado = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Firestore | null = null;

if (firebaseConfigurado) {
  app = initializeApp(config);
  auth = getAuth(app);
  auth.languageCode = 'pt';
  db = getFirestore(app);
}
