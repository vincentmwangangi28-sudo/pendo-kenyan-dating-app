import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut as fbSignOut } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { googleAuthLogger } from './googleAuthLogger';
import { authNotificationService } from './authNotificationService';
import { safeStorage } from './storage';

const app = initializeApp(firebaseConfig);

// Initialize Firestore cleanly with memory local cache and auto-detect long polling for iframe/proxy compatibility
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: memoryLocalCache(),
}, firebaseConfig.firestoreDatabaseId);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    googleAuthLogger.success('FIRESTORE', 'Firestore connection established successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Firestore operating in offline cache mode:", error.message);
      googleAuthLogger.warn('FIRESTORE', 'Firestore operating in offline cache fallback mode', { error: error.message });
    }
  }
}
testConnection();

export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Google Meet scopes
provider.addScope('https://www.googleapis.com/auth/meetings.space.created');
provider.addScope('https://www.googleapis.com/auth/meetings.space.readonly');
provider.addScope('https://www.googleapis.com/auth/meetings.space.settings');

// In-memory token cache
let cachedAccessToken: string | null = null;

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
    const result = await signInWithPopup(auth, provider);
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
    googleAuthLogger.logGoogleSignInFailure(error);
    
    // Provide specific user-friendly notification for popup-closed-by-user, network-request-failed, etc.
    authNotificationService.handleAuthError(error, {
      context: 'Sign-In',
      retryAction: () => signInWithGoogle(),
    });

    console.warn("Google signInWithPopup was blocked/closed in sandbox. Establishing guest session fallback:", error);
    try {
      googleAuthLogger.info('GOOGLE_AUTH', 'Attempting fallback anonymous Firebase authentication');
      const anonResult = await signInAnonymously(auth);
      googleAuthLogger.success('GOOGLE_AUTH', 'Fallback anonymous Firebase session established', { uid: anonResult.user.uid });
      return anonResult.user;
    } catch (anonErr: any) {
      googleAuthLogger.warn('GOOGLE_AUTH', 'Anonymous Firebase endpoint unreachable (sandbox/offline mode). Using local guest session.', {
        code: anonErr?.code || 'offline',
        message: anonErr?.message || String(anonErr),
      });
      const localGuest = getOrCreateGuestUser();
      return localGuest;
    }
  }
};

export const signInForGoogleMeet = async (): Promise<string> => {
  googleAuthLogger.info('GOOGLE_MEET', 'Requesting Google Meet OAuth authorization popup');
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      const err = new Error("Failed to get Google Meet access token from Google OAuth response");
      googleAuthLogger.logGoogleMeetToken(false, null, err);
      authNotificationService.handleAuthError(err, {
        context: 'Google Meet OAuth',
        retryAction: () => signInForGoogleMeet(),
      });
      throw err;
    }
    cachedAccessToken = credential.accessToken;
    googleAuthLogger.logGoogleMeetToken(true, cachedAccessToken);
    authNotificationService.showSuccess(
      'Google Meet Authorized',
      'Virtual date video room permissions successfully granted!'
    );
    return cachedAccessToken;
  } catch (error: any) {
    googleAuthLogger.logGoogleMeetToken(false, null, error);
    authNotificationService.handleAuthError(error, {
      context: 'Google Meet OAuth',
      retryAction: () => signInForGoogleMeet(),
    });
    console.error("Error getting Google Meet token", error);
    throw error;
  }
};

export const signOut = async () => {
  const currentUid = auth.currentUser?.uid;
  try {
    cachedAccessToken = null;
    safeStorage.removeItem('pendo_guest_user');
    await fbSignOut(auth).catch(() => {});
    googleAuthLogger.logSignOut(currentUid);
  } catch (error) {
    googleAuthLogger.warn('GOOGLE_AUTH', 'Sign out completed with local session cleanup');
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
  }
  googleAuthLogger.logFirestoreOperation(operationType, path || 'unknown', false, errInfo);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

