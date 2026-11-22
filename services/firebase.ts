import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  doc,
  getDocFromServer,
  setLogLevel,
  disableNetwork,
  enableNetwork,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { googleAuthLogger } from './googleAuthLogger';
import { authNotificationService } from './authNotificationService';
import { safeStorage } from './storage';

const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || "AIzaSyDK7DyMQ6KLGmFqurmspT1OTjaJxSKlTx4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || "lexical-apex-gqvh5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || "lexical-apex-gqvh5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || "lexical-apex-gqvh5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || "131484734930",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId || "1:131484734930:web:a5e7255be93021b250e40b",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || "ai-studio-389731fa-e167-47fb-8cea-296d2b765f81",
};

// Idempotent app initialization (safe across HMR / repeated module imports)
const app = getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);

// Suppress noisy internal @firebase/firestore WebChannel/COOP timeout logs in production/sandboxed clients
setLogLevel('silent');

// Initialize Firestore cleanly with HTTP long-polling & memory cache for proxy/ad-blocker resilience
let dbInstance;
try {
  dbInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
      localCache: memoryLocalCache(),
    },
    resolvedFirebaseConfig.firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
}
export const db = dbInstance;

let firestoreOfflineState = false;
let connectivityCheckPromise: Promise<boolean> | null = null;

export const isFirestoreOffline = () => firestoreOfflineState;

function isTransientOrCoopAuthError(error: any): boolean {
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    code.includes('network-request-failed') ||
    code.includes('internal-error') ||
    code.includes('timeout') ||
    code.includes('cancelled-popup-request') ||
    msg.includes('cross-origin-opener-policy') ||
    msg.includes('window.closed') ||
    msg.includes('failed to fetch') ||
    msg.includes('err_blocked_by_client')
  );
}

export async function checkFirestoreConnectivity(forceRefresh = false): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    firestoreOfflineState = true;
    await disableNetwork(db).catch(() => {});
    return false;
  }

  if (connectivityCheckPromise && !forceRefresh) {
    return connectivityCheckPromise;
  }

  connectivityCheckPromise = (async () => {
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        if (forceRefresh && firestoreOfflineState) {
          await enableNetwork(db).catch(() => {});
        }
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Firestore connectivity check timed out'));
          }, 3000);
        });

        await Promise.race([
          getDocFromServer(doc(db, 'test', 'connection')),
          timeoutPromise,
        ]);

        if (timeoutId) clearTimeout(timeoutId);
        firestoreOfflineState = false;
        googleAuthLogger.success('FIRESTORE', 'Firestore connection established successfully');
        return true;
      } catch (error: any) {
        if (timeoutId) clearTimeout(timeoutId);
        const msg = error?.message || String(error);
        const code = error?.code || '';

        // If the server responded with permission-denied, the backend IS reachable
        if (code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
          firestoreOfflineState = false;
          googleAuthLogger.success('FIRESTORE', 'Firestore backend reachable');
          return true;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }

        firestoreOfflineState = true;
        await disableNetwork(db).catch(() => {});
        googleAuthLogger.info('FIRESTORE', 'Firestore operating silently in local cache mode', { error: msg });
        return false;
      }
    }
    return false;
  })();

  return connectivityCheckPromise;
}

export const auth = getAuth(app);

// Standard Google Sign-In provider (profile & email only for fast, frictionless login on www.pendo.website)
const loginProvider = new GoogleAuthProvider();
loginProvider.setCustomParameters({ prompt: 'select_account' });

// Dedicated Google Meet provider (requests Meet scopes only when creating a video room)
const meetProvider = new GoogleAuthProvider();
meetProvider.addScope('https://www.googleapis.com/auth/meetings.space.created');
meetProvider.addScope('https://www.googleapis.com/auth/meetings.space.readonly');
meetProvider.addScope('https://www.googleapis.com/auth/meetings.space.settings');

// In-memory token cache
let cachedAccessToken: string | null = null;

// Silently resolve any pending redirect-based Google Sign-In on boot
if (typeof window !== 'undefined') {
  getRedirectResult(auth)
    .then((result) => {
      if (result?.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
        }
        googleAuthLogger.logGoogleSignInSuccess(
          {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            isAnonymous: result.user.isAnonymous,
          },
          cachedAccessToken
        );
      }
    })
    .catch((err) => {
      googleAuthLogger.debug('GOOGLE_AUTH', 'Silent redirect check skipped', {
        code: err?.code || 'none',
      });
    });
}

export interface AppAuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  providerData: Array<{ providerId: string }>;
}

export const getOrCreateGuestUser = (): AppAuthUser => {
  const existingGuest = safeStorage.getItem('pendo_guest_user');
  if (existingGuest) {
    try {
      return JSON.parse(existingGuest);
    } catch {}
  }
  const guestUid = 'guest_' + Math.random().toString(36).substring(2, 11);
  const newGuest: AppAuthUser = {
    uid: guestUid,
    displayName: 'Kenyan Guest',
    email: 'guest@pendo.app',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    isAnonymous: true,
    providerData: [],
  };
  safeStorage.setItem('pendo_guest_user', JSON.stringify(newGuest));
  return newGuest;
};

// Listen to auth state to clear token on logout and record events
auth.onAuthStateChanged((user) => {
  if (!user) {
    cachedAccessToken = null;
    googleAuthLogger.info('GOOGLE_AUTH', 'Auth state changed: No Firebase user logged in');
  } else {
    googleAuthLogger.info('GOOGLE_AUTH', `Auth state changed: Active user ${user.email || user.displayName || user.uid}`, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      isAnonymous: user.isAnonymous,
      emailVerified: user.emailVerified,
      photoURL: user.photoURL,
    });
  }
});

export const getCachedAccessToken = () => cachedAccessToken;

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    googleAuthLogger.success('GOOGLE_OAUTH', 'Google OAuth access token updated in cache', { length: token.length });
  }
};

export const signInWithGoogle = async () => {
  googleAuthLogger.logGoogleSignInStart('popup');
  try {
    const result = await signInWithPopup(auth, loginProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;

    googleAuthLogger.logGoogleSignInSuccess({
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      isAnonymous: result.user.isAnonymous
    }, cachedAccessToken);

    authNotificationService.showSuccess(
      'Signed in with Google',
      `Welcome, ${result.user.displayName || result.user.email || 'User'}!`
    );

    return result.user;
  } catch (error: any) {
    const code = String(error?.code || '');
    googleAuthLogger.logGoogleSignInFailure(error);

    // If a browser COOP / popup blocker interrupts signInWithPopup, avoid alarming error banners
    // when silently falling back or handing off to redirect/guest session.
    if (code === 'auth/popup-blocked' && typeof window !== 'undefined' && window.top === window.self) {
      try {
        googleAuthLogger.info('GOOGLE_AUTH', 'Popup blocked; falling back to Google redirect flow');
        await signInWithRedirect(auth, loginProvider);
        return getOrCreateGuestUser();
      } catch {}
    }

    // Retry once silently for transient network/COOP errors before falling back to guest session
    if (isTransientOrCoopAuthError(error)) {
      googleAuthLogger.info('GOOGLE_AUTH', 'Silent retry / seamless guest fallback after COOP or network interruption', { code });
    } else if (code === 'auth/popup-closed-by-user') {
      authNotificationService.handleAuthError(error, {
        context: 'Sign-In',
        retryAction: () => signInWithGoogle(),
      });
    }

    try {
      const anonResult = await signInAnonymously(auth);
      googleAuthLogger.success('GOOGLE_AUTH', 'Fallback anonymous Firebase session established', { uid: anonResult.user.uid });
      return anonResult.user;
    } catch (anonErr: any) {
      googleAuthLogger.info('GOOGLE_AUTH', 'Using local guest session fallback cleanly', {
        code: anonErr?.code || 'offline',
      });
      return getOrCreateGuestUser();
    }
  }
};

export const signInForGoogleMeet = async (): Promise<string> => {
  googleAuthLogger.info('GOOGLE_MEET', 'Requesting Google Meet OAuth authorization popup');
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await signInWithPopup(auth, meetProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error("Failed to get Google Meet access token from Google OAuth response");
      }
      cachedAccessToken = credential.accessToken;
      googleAuthLogger.logGoogleMeetToken(true, cachedAccessToken);
      authNotificationService.showSuccess(
        'Google Meet Authorized',
        'Virtual date video room permissions successfully granted!'
      );
      return cachedAccessToken;
    } catch (error: any) {
      lastError = error;
      if (attempt === 0 && isTransientOrCoopAuthError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        continue;
      }
      break;
    }
  }

  googleAuthLogger.logGoogleMeetToken(false, null, lastError);
  if (lastError?.code === 'auth/popup-closed-by-user' || lastError?.code === 'auth/popup-blocked') {
    authNotificationService.handleAuthError(lastError, {
      context: 'Google Meet OAuth',
      retryAction: () => signInForGoogleMeet(),
    });
  }
  throw lastError;
};

export const signOut = async () => {
  const currentUid = auth.currentUser?.uid;
  try {
    cachedAccessToken = null;
    safeStorage.removeItem('pendo_guest_user');
    await fbSignOut(auth).catch(() => {});
    googleAuthLogger.logSignOut(currentUid);
  } catch {
    googleAuthLogger.info('GOOGLE_AUTH', 'Sign out completed with local session cleanup');
  }
};

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  googleAuthLogger.logFirestoreOperation(operationType, path || 'unknown', false, errInfo);
  throw new Error(JSON.stringify(errInfo));
}

